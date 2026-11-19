import { ConflictException, Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, Query, Res } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { PrismaModule } from "../../common/prisma.module.js";
import { object, optionalText, uuid } from "../../common/input.js";
import { CurrentAuth } from "../auth/session.guard.js";
import { Requires } from "../auth/permission.guard.js";
import type { AuthContext } from "../auth/auth-context.js";
import { prepareBulletin } from "./bulletin-data.js";
import { renderLegacyBulletin } from "./legacy-bulletin.js";
import { renderMaternal } from "./maternal-bulletin.js";
import { renderPrimary } from "./primary-bulletin.js";
import { renderSecondary } from "./secondary-bulletin.js";

import { renderMaternal as renderMaternalV14 } from "./v14/maternal-bulletin.js";
import { renderPrimary as renderPrimaryV14 } from "./v14/primary-bulletin.js";
import { renderSecondary as renderSecondaryV14 } from "./v14/secondary-bulletin.js";
import { renderSecondary as renderSecondaryV15 } from "./v15/secondary-bulletin.js";

type PdfResponse = { setHeader(name: string, value: string): void; send(body: Buffer): void };

const currentVersion = 'DEMO-V1.6';
const previousVersion = 'DEMO-V1.4';
const legacyVersion = (value: unknown): value is 'DEMO-V1.2' | 'DEMO-V1.3' => value === 'DEMO-V1.2' || value === 'DEMO-V1.3';
const archivedVersion = (value: unknown) => legacyVersion(value) || value === previousVersion || value === 'DEMO-V1.5';
const decisionOrder = { orderBy: { version: 'desc' as const }, take: 1 };
const periodDetails = { include: { period: true } };
const canReadAll = (auth: AuthContext) => auth.roles.some(role => role === 'DIR' || role === 'SEC');
// Les droits et la publication sont contrôlés avant ce contrôle de présentation.
// Une archive reste stockée, mais ne permet pas de contourner une incompatibilité.
const periodSupported = (cycle: unknown, code: string) => cycle === 'PRIMAIRE'
  ? ['T1', 'T2', 'T3', 'ANNEE'].includes(code)
  : cycle === 'MATERNEL'
    ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'T1', 'T2', 'T3', 'ANNEE'].includes(code)
    : ['P1', 'P2', 'P3', 'P4', 'E1', 'E2', 'S1', 'S2', 'ANNEE', 'REPECHAGE'].includes(code);

@Controller("bulletins")
export class BulletinsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @Requires("bulletins.download")
  async list(@CurrentAuth() auth: AuthContext, @Query("search") rawSearch?: string) {
    const terms = (optionalText(rawSearch, 'Recherche', 120) ?? '').split(/\s+/).filter(Boolean);
    const rows = await this.prisma.client.resultSnapshot.findMany({
      where: { classPeriod: { publishedAt: { not: null } }, ...(!canReadAll(auth) ? { enrollment: { student: { userId: auth.userId } } } : {}),
        AND: terms.map(term => ({ OR: ['lastName', 'postName', 'firstName', 'matricule'].map(field => ({
          identitySnapshot: { path: [field], string_contains: term, mode: 'insensitive' as const }
        })) })) },
      select: { id: true, identitySnapshot: true, calculationProfile: true },
      orderBy: { id: 'asc' },
      take: 500
    });
    return rows.map(row => {
      const { lastName, postName, firstName, classLabel, periodCode, yearCode, matricule, cycle } = object(row.identitySnapshot);
      return { ...row, identitySnapshot: { lastName, postName, firstName, classLabel, periodCode, yearCode, matricule, cycle } };
    });
  }

  private async load(raw: string, auth: AuthContext) {
    const id = uuid(raw);
    const result = await this.prisma.client.resultSnapshot.findUnique({
      where: { id },
      include: {
        classPeriod: periodDetails,
        enrollment: { include: { student: true } },
        decisions: decisionOrder,
        reportCards: { orderBy: [{ generatedAt: 'desc' }, { id: 'asc' }] }
      }
    });
    if (!result?.classPeriod.publishedAt) throw new NotFoundException("Bulletin publié introuvable.");
    if (!canReadAll(auth) && result.enrollment.student.userId !== auth.userId) throw new ForbiddenException("Ce bulletin ne vous appartient pas.");
    return result;
  }

  private async data(result: Awaited<ReturnType<BulletinsController["load"]>>, cutoff: Date) {
    const snapshots = await this.prisma.client.resultSnapshot.findMany({
      where: { enrollmentId: result.enrollmentId, classId: result.classId, classPeriod: { schoolYearId: result.classPeriod.schoolYearId } },
      include: { classPeriod: periodDetails, decisions: decisionOrder }
    });
    return prepareBulletin(result, snapshots, cutoff);
  }

  private requireDownloadable(result: Awaited<ReturnType<BulletinsController["load"]>>, data: Awaited<ReturnType<BulletinsController["data"]>>) {
    if (!periodSupported(data.identity.cycle, result.classPeriod.period.code)) {
      throw new ConflictException('Aucun gabarit adapté à cette période. Choisissez une synthèse publiée compatible.');
    }
    if (!data.releaseVisible) {
      throw new ConflictException('Le document exige la publication de toutes les composantes.');
    }
  }

  @Get(":id") @Requires("bulletins.download")
  async detail(@Param("id") raw: string, @CurrentAuth() auth: AuthContext) {
    const result = await this.load(raw, auth);
    const issued = result.reportCards.find(card => card.templateVersion === currentVersion);
    const data = await this.data(result, issued?.generatedAt ?? new Date());
    const identity = { ...data.identity, decision: data.decision?.outcome ?? data.identity.decision };
    if (!data.releaseVisible) Object.assign(identity, { totalEarned: null, totalMaximum: null, percentage: null, rank: null, effectif: null, decision: null });
    return {
      id: result.id, identity, subjects: data.slimSubjects, profile: result.calculationProfile,
      templateVersion: currentVersion, archivedTemplates: result.reportCards.map(card => card.templateVersion).filter(archivedVersion),
      publicationComplete: data.releaseVisible,
      // Les colonnes du gabarit primaire sont T1/T2/T3, pas P1/P2/etc.
      // Signaler l'incompatibilité évite de proposer un PDF sans les notes sélectionnées.
      documentPeriodSupported: periodSupported(data.identity.cycle, result.classPeriod.period.code)
    };
  }

  @Post(":id/generate") @Requires("bulletins.produce")
  async generate(@Param("id") raw: string, @CurrentAuth() auth: AuthContext) {
    const result = await this.load(raw, auth);
    const issued = result.reportCards.find(card => card.templateVersion === currentVersion);
    this.requireDownloadable(result, await this.data(result, issued?.generatedAt ?? new Date()));
    return this.prisma.client.$transaction(async tx => {
      await tx.reportCard.createMany({ data: [{ resultSnapshotId: result.id, templateVersion: currentVersion, notice: 'DEMO-V1' }], skipDuplicates: true });
      const report = await tx.reportCard.findUniqueOrThrow({
        where: { resultSnapshotId_templateVersion: { resultSnapshotId: result.id, templateVersion: currentVersion } }
      });
      await tx.auditEntry.create({ data: { actorId: auth.userId, action: 'REPORT_GENERATED', targetType: 'ReportCard', targetId: report.id } });
      return report;
    });
  }

  @Get(":id/pdf") @Requires("bulletins.download")
  async pdf(@Param("id") raw: string, @CurrentAuth() auth: AuthContext, @Res() response: PdfResponse, @Query("templateVersion") requested?: string) {
    const result = await this.load(raw, auth);
    const version = requested ?? result.reportCards.find(card => card.templateVersion === currentVersion)?.templateVersion
      ?? result.reportCards.find(card => archivedVersion(card.templateVersion))?.templateVersion ?? currentVersion;
    const issued = result.reportCards.find(card => card.templateVersion === version);
    let bytes: Uint8Array;
    if (legacyVersion(version) && issued) {
      const data = await this.data(result, new Date());
      this.requireDownloadable(result, data);
      bytes = await renderLegacyBulletin({ ...data.identity, decision: data.decision?.outcome ?? data.identity.decision },
        result.subjectResults as unknown as Record<string, unknown>[], version);
    } else if (version === currentVersion || (version === previousVersion || version === 'DEMO-V1.5') && issued) {
      const data = await this.data(result, issued?.generatedAt ?? new Date());
      this.requireDownloadable(result, data);
      const renderers = version === previousVersion
        ? { maternal: renderMaternalV14, primary: renderPrimaryV14, secondary: renderSecondaryV14 }
        : { maternal: renderMaternal, primary: renderPrimary, secondary: version === 'DEMO-V1.5' ? renderSecondaryV15 : renderSecondary };
      const render = data.identity.cycle === 'MATERNEL' ? renderers.maternal : data.identity.cycle === 'PRIMAIRE' ? renderers.primary : renderers.secondary;
      bytes = await render(data);
    } else {
      throw new NotFoundException("Version de bulletin introuvable.");
    }
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="bulletin-${result.id}.pdf"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(Buffer.from(bytes));
  }
}

@Module({ imports: [PrismaModule], controllers: [BulletinsController] })
export class BulletinsModule {}
