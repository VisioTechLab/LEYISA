import { ConflictException, Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, Query, Res } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { PrismaModule } from "../../common/prisma.module.js";
import { object, optionalText, page, uuid } from "../../common/input.js";
import { CurrentAuth } from "../auth/session.guard.js";
import { Requires } from "../auth/permission.guard.js";
import type { AuthContext } from "../auth/auth-context.js";
import { prepareBulletin } from "./bulletin-data.js";
import { renderLegacyBulletin } from "./legacy-bulletin.js";
import { renderMaternal } from "./maternal-bulletin.js";
import { renderPrimary } from "./primary-bulletin.js";
import { renderPrimary as renderPrimaryV16 } from "./primary-bulletin-v16.js";
import { renderSecondary } from "./secondary-bulletin.js";

import { renderMaternal as renderMaternalV14 } from "./v14/maternal-bulletin.js";
import { renderPrimary as renderPrimaryV14 } from "./v14/primary-bulletin.js";
import { renderSecondary as renderSecondaryV14 } from "./v14/secondary-bulletin.js";
import { renderSecondary as renderSecondaryV15 } from "./v15/secondary-bulletin.js";

type PdfResponse = { setHeader(name: string, value: string): void; send(body: Buffer): void };

const currentVersion = 'DEMO-V1.7';
const previousVersion = 'DEMO-V1.4';
const legacyVersion = (value: unknown): value is 'DEMO-V1.2' | 'DEMO-V1.3' => value === 'DEMO-V1.2' || value === 'DEMO-V1.3';
const archivedVersion = (value: unknown) => legacyVersion(value) || value === previousVersion || value === 'DEMO-V1.5' || value === 'DEMO-V1.6';
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
  async list(@CurrentAuth() auth: AuthContext, @Query("search") rawSearch?: string, @Query("page") rawPage?: string) {
    const terms = (optionalText(rawSearch, 'Recherche', 120) ?? '').split(/\s+/).filter(Boolean);
    const rows = await this.prisma.client.resultSnapshot.findMany({
      where: { classPeriod: { publishedAt: { not: null } }, ...(!canReadAll(auth) ? { enrollment: { student: { userId: auth.userId } } } : {}),
        AND: terms.map(term => ({ OR: ['lastName', 'postName', 'firstName', 'matricule'].map(field => ({
          identitySnapshot: { path: [field], string_contains: term, mode: 'insensitive' as const }
        })) })) },
      select: { id: true, identitySnapshot: true, calculationProfile: true },
      orderBy: { id: 'asc' },
      skip: (page(rawPage)-1)*500, take: 500
    });
    return rows.map(row => {
      const { lastName, postName, firstName, classLabel, periodCode, yearCode, matricule, cycle } = object(row.identitySnapshot);
      return { ...row, identitySnapshot: { lastName, postName, firstName, classLabel, periodCode, yearCode, matricule, cycle } };
    });
  }

  // Catalogue compact : aucune identité d'élève ni note transmise avant la sélection.
  @Get("archive") @Requires("bulletins.download")
  async archive(@CurrentAuth() auth: AuthContext) {
    const groups = await this.prisma.client.$queryRaw<Array<{id:string;year:string;cycle:string;level:string;classLabel:string;periodCode:string;position:number;total:number;issued:number}>>`
      SELECT cp.id, min(coalesce(nullif(r."identitySnapshot"->>'yearCode',''), y.code)) AS year,
        min(coalesce(nullif(r."identitySnapshot"->>'cycle',''), c.cycle)) AS cycle,
        min(coalesce(nullif(r."identitySnapshot"->>'level',''),nullif(c.level,''),'Niveau non renseigné')) AS level,
        min(coalesce(nullif(r."identitySnapshot"->>'classLabel',''),c.label)) AS "classLabel",
        p.code AS "periodCode", p.position,
        count(*)::int AS total,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ReportCard" card WHERE card."resultSnapshotId"=r.id))::int AS issued
      FROM "ResultSnapshot" r JOIN "ClassPeriod" cp ON cp.id=r."classPeriodId"
      JOIN "SchoolClass" c ON c.id=cp."classId" JOIN "SchoolYear" y ON y.id=cp."schoolYearId"
      JOIN "Period" p ON p.id=cp."periodId" JOIN "Enrollment" e ON e.id=r."enrollmentId"
      JOIN "Student" st ON st.id=e."studentId"
      WHERE cp."publishedAt" IS NOT NULL AND (${canReadAll(auth)} OR st."userId"=${auth.userId}::uuid)
      GROUP BY cp.id,p.code,p.position
      ORDER BY year DESC,cycle,level,"classLabel",p.position
    `;
    return groups.map(g=>({...g,documentPeriodSupported:periodSupported(g.cycle,g.periodCode)}));
  }

  // Lecture paginée d'un dossier classe-période ou recherche d'un élève.
  @Get("archive/entries") @Requires("bulletins.download")
  async archiveEntries(@CurrentAuth() auth: AuthContext,@Query("context") rawContext?:string,@Query("search") rawSearch?:string,@Query("matricule") rawMatricule?:string,@Query("page") rawPage?:string) {
    const context=rawContext?uuid(rawContext):undefined;
    const matricule=optionalText(rawMatricule,'Matricule',120);
    const terms=(optionalText(rawSearch,'Recherche',120)??'').split(/\s+/).filter(Boolean);
    const number=page(rawPage),size=25;
    if(!context&&!matricule&&!terms.length)return {items:[],total:0,page:number,pageSize:size};
    const where={
      classPeriod:{publishedAt:{not:null}},
      ...(!canReadAll(auth)?{enrollment:{student:{userId:auth.userId}}}:{}),
      ...(context?{classPeriodId:context}:{}),
      AND:[...(matricule?[{identitySnapshot:{path:['matricule'],equals:matricule}}]:[]),
        ...terms.map(term=>({OR:['lastName','postName','firstName','matricule'].map(field=>({identitySnapshot:{path:[field],string_contains:term,mode:'insensitive' as const}}))}))]
    };
    const [total,rows]=await Promise.all([
      this.prisma.client.resultSnapshot.count({where}),
      this.prisma.client.resultSnapshot.findMany({where,
        select:{id:true,identitySnapshot:true,classPeriodId:true,classPeriod:{select:{period:{select:{position:true}},schoolClass:{select:{level:true}}}},_count:{select:{reportCards:true}}},
        orderBy:[{classPeriod:{schoolClass:{schoolYear:{startsOn:'desc'}}}},{enrollment:{student:{user:{lastName:'asc'}}}},{enrollment:{student:{user:{firstName:'asc'}}}},{classPeriod:{period:{position:'asc'}}},{id:'asc'}],
        skip:(number-1)*size,take:size})
    ]);
    const items=rows.map(r=>{
      const i=object(r.identitySnapshot);
      return {id:r.id,classPeriodId:r.classPeriodId,issued:r._count.reportCards>0,documentPeriodSupported:periodSupported(i.cycle,String(i.periodCode??'')),
        identitySnapshot:{lastName:i.lastName,postName:i.postName,firstName:i.firstName,classLabel:i.classLabel,yearCode:i.yearCode,periodCode:i.periodCode,matricule:i.matricule,cycle:i.cycle,level:i.level||r.classPeriod.schoolClass.level}};
    });
    return {items,total,page:number,pageSize:size};
  }

  /** Compteur exact dans le même périmètre RBAC/ABAC que la liste paginée. */
  @Get("count") @Requires("bulletins.download")
  async count(@CurrentAuth() auth: AuthContext) {
    const total = await this.prisma.client.resultSnapshot.count({
      where: { classPeriod: { publishedAt: { not: null } }, ...(!canReadAll(auth) ? { enrollment: { student: { userId: auth.userId } } } : {}) }
    });
    return { total };
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
      id: result.id, classPeriodId:result.classPeriodId, identity, subjects: data.slimSubjects, profile: result.calculationProfile,
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
    } else if (version === currentVersion || (version === previousVersion || version === 'DEMO-V1.5' || version === 'DEMO-V1.6') && issued) {
      const data = await this.data(result, issued?.generatedAt ?? new Date());
      this.requireDownloadable(result, data);
      const renderers = version === previousVersion
        ? { maternal: renderMaternalV14, primary: renderPrimaryV14, secondary: renderSecondaryV14 }
        : { maternal: renderMaternal, primary: version === currentVersion ? renderPrimary : renderPrimaryV16, secondary: version === 'DEMO-V1.5' ? renderSecondaryV15 : renderSecondary };
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
