import { BadRequestException, Body, ConflictException, Controller, Get, Module, Param, Post, Put } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { PrismaService } from "../../common/prisma.service.js";
import { day, object, optionalText, positive, text, uuid } from "../../common/input.js";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";

const cycles=["MATERNEL","PRIMAIRE","SECONDAIRE_TECHNIQUE"];
function cycle(value:unknown) {const v=text(value,"Cycle");if(!cycles.includes(v))throw new BadRequestException("Cycle invalide.");return v;}

@Controller("school")
export class SchoolController {
 constructor(private readonly prisma: PrismaService) {}
 @Get("bootstrap") @Requires("school.read")
 async bootstrap() {
  const [years,subjects,settings]=await Promise.all([
   this.prisma.client.schoolYear.findMany({include:{periods:{orderBy:{position:"asc"}},classes:{include:{subjects:{include:{subject:true},orderBy:{position:"asc"}},classPeriods:true},orderBy:{code:"asc"}}},orderBy:{startsOn:"desc"}}),
   this.prisma.client.subject.findMany({orderBy:{label:"asc"}}),
   this.prisma.client.schoolSettings.findUnique({where:{id:"school"}}),
  ]);return {years,subjects,settings};
 }
 @Post(":resource") @Requires("school.configure")
 create(@Param("resource") resource:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.save(resource,undefined,body,auth);}
 @Put(":resource/:id") @Requires("school.configure")
 update(@Param("resource") resource:string,@Param("id") id:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.save(resource,id,body,auth);}

 private async save(resource:string,rawId:string|undefined,body:unknown,auth:AuthContext) {
  const d=object(body);const id=rawId?uuid(rawId):undefined;
  return this.prisma.client.$transaction(async tx=>{
   let result:{id:string};
   if(resource==="years") {
    const data={code:text(d.code,"Année",30),startsOn:day(d.startsOn),endsOn:day(d.endsOn)};
    if(data.startsOn>data.endsOn)throw new BadRequestException("Dates de l'année invalides.");
    result=id?await tx.schoolYear.update({where:{id},data}):await tx.schoolYear.create({data});
   } else if(resource==="periods") {
    const profile=cycle(d.profile);const kind=text(d.kind,"Type");
    if(!["PERIODE","EXAMEN","EVEIL","TRIMESTRE","SEMESTRE","ANNUEL","REPECHAGE","EVENEMENT"].includes(kind))throw new BadRequestException("Type de calendrier invalide.");
    const data={schoolYearId:uuid(d.schoolYearId),code:text(d.code,"Code",30),label:text(d.label,"Libellé"),position:Number(d.position),startsOn:day(d.startsOn),endsOn:day(d.endsOn),profile,kind,parentCode:optionalText(d.parentCode,"Parent",30),source:text(d.source,"Source",300)};
    if(id) {
      const old=await tx.period.findUnique({where:{id},include:{_count:{select:{classPeriods:true}}}});
      if(old?.profile==='HISTORIQUE')throw new ConflictException('Période historique non modifiable.');
      if(old?._count.classPeriods && ['code','profile','kind','parentCode','schoolYearId'].some(key=>old[key as keyof typeof old]!==data[key as keyof typeof data]))throw new ConflictException("Calendrier utilisé : créez une version prospective.");
    }
    if(!Number.isInteger(data.position)||data.position<1)throw new BadRequestException("Position invalide.");
    result=id?await tx.period.update({where:{id},data}):await tx.period.create({data});
    if(kind!=="EVENEMENT") {
     const classes=await tx.schoolClass.findMany({where:{schoolYearId:data.schoolYearId,cycle:profile}});
     await tx.classPeriod.createMany({data:classes.map(c=>({classId:c.id,periodId:result.id,schoolYearId:data.schoolYearId})),skipDuplicates:true});
    }
   } else if(resource==="classes") {
    const data={schoolYearId:uuid(d.schoolYearId),code:text(d.code,"Code",30),label:text(d.label,"Classe"),cycle:cycle(d.cycle),level:text(d.level,"Niveau",40),optionCode:optionalText(d.optionCode,"Option",20),programVersion:text(d.programVersion,"Version",50),programStatus:"DEMO_PROPOSE"};
    if(id && await tx.evaluation.count({where:{classId:id}})>0)throw new ConflictException("La classe est utilisée. Préparez une version prospective.");
    result=id?await tx.schoolClass.update({where:{id},data}):await tx.schoolClass.create({data});
    const periods=await tx.period.findMany({where:{schoolYearId:data.schoolYearId,profile:data.cycle,kind:{not:"EVENEMENT"}}});
    await tx.classPeriod.createMany({data:periods.map(p=>({classId:result.id,periodId:p.id,schoolYearId:data.schoolYearId})),skipDuplicates:true});
   } else if(resource==="subjects") {
    const data={code:text(d.code,"Code",40),label:text(d.label,"Matière")};
    result=id?await tx.subject.update({where:{id},data}):await tx.subject.create({data});
   } else if(resource==="program") {
    const maxima=object(d.componentMaxima);const clean:Record<string,string|null>={};
    for(const [key,value] of Object.entries(maxima)) {if(!/^[A-Z0-9_-]{1,30}$/.test(key))throw new BadRequestException("Code de composant invalide.");clean[key]=value===null?null:positive(value);}
    const data={classId:uuid(d.classId),subjectId:uuid(d.subjectId),resultMaxScore:positive(d.resultMaxScore),componentMaxima:clean,position:Number(d.position),source:text(d.source,"Source/version",300),groupCode:optionalText(d.groupCode,"Groupe",50)};
    if(!Number.isInteger(data.position)||data.position<1)throw new BadRequestException("Position invalide.");
    await tx.$queryRaw`SELECT id FROM "SchoolClass" WHERE id=${data.classId}::uuid FOR UPDATE`;
    if(!id && await tx.evaluation.count({where:{classId:data.classId}})>0)throw new ConflictException("Programme utilisé. Ajout rétroactif refusé.");
    result=id?await tx.classSubject.update({where:{id},data}):await tx.classSubject.create({data});
   } else if(resource==="identity" && !id) {
    const identity:Record<string,string>={};
    for(const field of ["name","code","province","city","commune","address"])identity[field]=optionalText(d[field],field,200)??"";
    const settings=await tx.schoolSettings.upsert({where:{id:"school"},create:{identity},update:{identity}});
    await tx.auditEntry.create({data:{actorId:auth.userId,action:"SCHOOL_IDENTITY_UPDATED",targetType:"SchoolSettings",targetId:null}});return settings;
   } else throw new BadRequestException("Opération scolaire inconnue.");
   await tx.auditEntry.create({data:{actorId:auth.userId,action:id?"SCHOOL_UPDATED":"SCHOOL_CREATED",targetType:resource,targetId:result.id}});return result;
  },{timeout:20000});
 }
}
@Module({imports:[PrismaModule],controllers:[SchoolController]})
export class SchoolModule {}
