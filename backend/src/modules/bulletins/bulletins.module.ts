import { ConflictException, Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, Query, Res } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { PrismaModule } from "../../common/prisma.module.js";
import { object, uuid } from "../../common/input.js";
import { CurrentAuth } from "../auth/session.guard.js";
import { Requires } from "../auth/permission.guard.js";
import type { AuthContext } from "../auth/auth-context.js";
import { prepareBulletin } from "./bulletin-data.js";
import { renderLegacyBulletin } from "./legacy-bulletin.js";
import { renderMaternal } from "./maternal-bulletin.js";
import { renderPrimary } from "./primary-bulletin.js";
import { renderSecondary } from "./secondary-bulletin.js";

type PdfResponse = { setHeader(name: string, value: string): void; send(body: Buffer): void };

const currentVersion = 'DEMO-V1.4';
const legacyVersion = (value: unknown): value is 'DEMO-V1.2' | 'DEMO-V1.3' => value === 'DEMO-V1.2' || value === 'DEMO-V1.3';
const decisionOrder = { orderBy: { version: 'desc' as const }, take: 1 };
const periodDetails = { include: { period: true } };
const canReadAll = (auth: AuthContext) => auth.roles.some(role => role === 'DIR' || role === 'SEC');

@Controller("bulletins")
export class BulletinsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @Requires("bulletins.download")
  async list(@CurrentAuth() auth: AuthContext) {
    const rows = await this.prisma.client.resultSnapshot.findMany({
      where: { classPeriod: { publishedAt: { not: null } }, ...(!canReadAll(auth) ? { enrollment: { student: { userId: auth.userId } } } : {}) },
      select: { id: true, identitySnapshot: true, calculationProfile: true },
      orderBy: { id: 'asc' },
      take: 500
    });
    return rows.map(row => {
      const { lastName, firstName, classLabel, periodCode } = object(row.identitySnapshot);
      return { ...row, identitySnapshot: { lastName, firstName, classLabel, periodCode } };
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

  @Get(":id") @Requires("bulletins.download")
  async detail(@Param("id") raw: string, @CurrentAuth() auth: AuthContext) {
    const result = await this.load(raw, auth);
    const issued = result.reportCards.find(card => card.templateVersion === currentVersion);
    const data = await this.data(result, issued?.generatedAt ?? new Date());
    const identity = { ...data.identity, decision: data.decision?.outcome ?? data.identity.decision };
    if (!data.releaseVisible) Object.assign(identity, { totalEarned: null, totalMaximum: null, percentage: null, rank: null, effectif: null, decision: null });
    return {
      id: result.id, identity, subjects: data.slimSubjects, profile: result.calculationProfile,
      templateVersion: currentVersion, archivedTemplates: result.reportCards.map(card => card.templateVersion).filter(legacyVersion)
    };
  }

  @Post(":id/generate") @Requires("bulletins.produce")
  async generate(@Param("id") raw: string, @CurrentAuth() auth: AuthContext) {
    const result = await this.load(raw, auth);
    if (!result.reportCards.some(card => card.templateVersion === currentVersion)
      && !(await this.data(result, new Date())).releaseVisible) {
      throw new ConflictException("La génération définitive exige la publication de toutes les composantes.");
    }
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
      ?? result.reportCards.find(card => legacyVersion(card.templateVersion))?.templateVersion ?? currentVersion;
    const issued = result.reportCards.find(card => card.templateVersion === version);
    let bytes: Uint8Array;
    if (legacyVersion(version) && issued) {
      const data = await this.data(result, new Date());
      if (!data.releaseVisible) throw new NotFoundException("Bulletin historique indisponible avant publication des composantes.");
      bytes = await renderLegacyBulletin({ ...data.identity, decision: data.decision?.outcome ?? data.identity.decision },
        result.subjectResults as unknown as Record<string, unknown>[], version);
    } else if (version === currentVersion) {
      const data = await this.data(result, issued?.generatedAt ?? new Date());
      const render = data.identity.cycle === 'MATERNEL' ? renderMaternal : data.identity.cycle === 'PRIMAIRE' ? renderPrimary : renderSecondary;
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
