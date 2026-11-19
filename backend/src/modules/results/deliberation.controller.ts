import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { object, optionalText, positive, text, uuid } from "../../common/input.js";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";
import { proposeDecision } from "./deliberation.js";

@Controller('results')
export class DeliberationController {
 constructor(private readonly prisma:PrismaService) {}
 @Get('profiles') @Requires('school.read')
 profiles(){return this.prisma.client.calculationProfile.findMany({orderBy:[{code:'asc'},{version:'desc'}]});}
 @Get('retake-authorizations') @Requires('evaluations.create')
 async authorizations(@CurrentAuth() auth:AuthContext) {
  const own=await this.prisma.client.teacherAssignment.findMany({where:{teacher:{userId:auth.userId}},include:{classSubject:true}});
  const subjects=new Set(own.map(a=>a.classSubject.subjectId));
  const decisions=await this.prisma.client.deliberationDecision.findMany({where:{outcome:'REPECHAGE',resultSnapshot:{classId:{in:own.map(a=>a.classId)},classPeriod:{publishedAt:{not:null}}}},include:{resultSnapshot:{select:{identitySnapshot:true}}}});
  return decisions.map(d=>({id:d.id,courses:(d.courses as string[]).filter(id=>subjects.has(id)),identity:d.resultSnapshot.identitySnapshot})).filter(d=>d.courses.length);
 }
 @Post('profiles') @Requires('school.configure')
 async create(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
  const d=object(body),c=object(d.config);
  const cycle=text(d.cycle,'Cycle');if(!['PRIMAIRE','SECONDAIRE_TECHNIQUE'].includes(cycle))throw new BadRequestException('Profil numérique réservé au primaire/secondaire.');
  const config={admissionThreshold:positive(c.admissionThreshold),failureThreshold:positive(c.failureThreshold),retakeMode:c.retakeMode==='REPLACE_E2_DEMO'?'REPLACE_E2_DEMO':'MANUAL_ONLY'};
  if(Number(config.admissionThreshold)>100||Number(config.failureThreshold)>100||d.status!=='DEMO_PROPOSE')throw new BadRequestException('Seul un profil DEMO explicite peut être préparé ici.');
  const version=Number(d.version);if(!Number.isInteger(version)||version<1)throw new BadRequestException('Version positive requise.');
  return this.prisma.client.$transaction(async tx=>{
   const profile=await tx.calculationProfile.create({data:{code:text(d.code,'Code',80),version,schoolYearId:uuid(d.schoolYearId),cycle,level:text(d.level,'Niveau',40),optionCode:optionalText(d.optionCode,'Option',20),status:'DEMO_PROPOSE',source:text(d.source,'Source',500),config,createdById:auth.userId}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:'DEMO_PROFILE_CREATED',targetType:'CalculationProfile',targetId:profile.id}});return profile;
  });
 }
 @Get('snapshots/:id/deliberation') @Requires('results.preview')
 async state(@Param('id') raw:string) {
  const result=await this.prisma.client.resultSnapshot.findUnique({where:{id:uuid(raw)},include:{classPeriod:{include:{schoolClass:true,period:true}},decisions:{include:{profile:true},orderBy:{version:'desc'}}}});
  if(!result)throw new NotFoundException('Résultat introuvable.');
  const cls=result.classPeriod.schoolClass;
  const profiles=await this.prisma.client.calculationProfile.findMany({where:{schoolYearId:cls.schoolYearId,cycle:cls.cycle,level:cls.level,optionCode:cls.optionCode},orderBy:{version:'desc'}});
  return {resultId:result.id,identity:result.identitySnapshot,subjects:result.subjectResults,published:!!result.classPeriod.publishedAt,decisions:result.decisions,profiles,
    proposals:profiles.map(p=>({profileId:p.id,proposal:proposeDecision(result.subjectResults as unknown as Array<{earned:string|null;maximum:string}>,p.config as {admissionThreshold:string;failureThreshold:string})}))};
 }
 @Post('snapshots/:id/decisions') @Requires('results.close')
 async decide(@Param('id') raw:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
  const id=uuid(raw),d=object(body),profileId=uuid(d.profileId),outcome=text(d.outcome,'Décision'),reason=text(d.reason,'Motif',2000);
  if(!['ADMIS','REPECHAGE','REDOUBLEMENT','A_VERIFIER'].includes(outcome)||reason.length<5)throw new BadRequestException('Décision et motif explicites requis.');
  const courses=Array.isArray(d.courses)?[...new Set(d.courses.map(uuid))]:[];
  return this.prisma.client.$transaction(async tx=>{
   await tx.$queryRaw`SELECT cp.id FROM "ClassPeriod" cp JOIN "ResultSnapshot" r ON r."classPeriodId"=cp.id WHERE r.id=${id}::uuid FOR UPDATE OF cp`;
   const result=await tx.resultSnapshot.findUnique({where:{id},include:{classPeriod:{include:{period:true,schoolClass:true}},decisions:{orderBy:{version:'desc'},take:1}}});
   const profile=await tx.calculationProfile.findUnique({where:{id:profileId}});
   if(!result||!profile)throw new NotFoundException('Résultat ou profil introuvable.');
   if(!result.classPeriod.closedAt||result.classPeriod.publishedAt)throw new ConflictException('Délibération seulement sur résultat clôturé, avant publication.');
   if(!['ANNUEL','REPECHAGE'].includes(result.classPeriod.period.kind))throw new BadRequestException('La décision porte sur une synthèse annuelle ou de deuxième session.');
   const cls=result.classPeriod.schoolClass;
   if(profile.schoolYearId!==cls.schoolYearId||profile.cycle!==cls.cycle||profile.level!==cls.level||profile.optionCode!==cls.optionCode)throw new BadRequestException('Profil hors périmètre année/cycle/niveau/option.');
   const subjects=result.subjectResults as unknown as Array<{subjectId:string;earned:string|null;maximum:string}>;
   if(courses.some(course=>!subjects.some(s=>s.subjectId===course)))throw new BadRequestException('Cours de repêchage hors programme.');
   if(outcome==='REPECHAGE'&&(courses.length===0||result.classPeriod.period.kind==='REPECHAGE'))throw new BadRequestException('Cours autorisés requis ; pas de repêchage récursif.');
   const proposed=proposeDecision(subjects,profile.config as {admissionThreshold:string;failureThreshold:string});
   const decision=await tx.deliberationDecision.create({data:{resultSnapshotId:id,profileId,version:(result.decisions[0]?.version??0)+1,outcome,reason,courses,proposed,decidedById:auth.userId}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:'DELIBERATION_RECORDED',targetType:'DeliberationDecision',targetId:decision.id,details:{version:decision.version,outcome,profileVersion:profile.version}}});return decision;
  });
 }
}
