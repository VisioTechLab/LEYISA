import { BadRequestException, Body, Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, Put } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { PrismaService } from "../../common/prisma.service.js";
import { day, object, optionalText, uuid } from "../../common/input.js";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";

@Controller("assignments")
export class AssignmentsController {
 constructor(private readonly prisma:PrismaService) {}
 @Get() @Requires("assignments.read")
 async list(@CurrentAuth() auth:AuthContext) {
  const own=auth.roles.includes("ENS")&&!auth.roles.some(r=>["ADM","SEC","DIR"].includes(r));
  const [assignments,teachers,candidates]=await Promise.all([
   this.prisma.client.teacherAssignment.findMany({where:own?{teacher:{userId:auth.userId}}:{},include:{teacher:{include:{user:{select:{id:true,firstName:true,lastName:true}}}},classSubject:{include:{subject:true,schoolClass:{include:{schoolYear:true,classPeriods:{include:{period:true}}}}}}},orderBy:{startsOn:"desc"}}),
   this.prisma.client.teacher.findMany({where:own?{userId:auth.userId}:{},include:{user:{select:{id:true,firstName:true,lastName:true,loginEnabled:true}}}}),
   auth.roles.includes("DIR")?this.prisma.client.user.findMany({where:{kind:"STAFF",loginEnabled:true,roles:{some:{role:"ENS"}}},select:{id:true,firstName:true,lastName:true}}):[],
  ]);return {assignments,teachers,candidates};
 }
 @Get("mine") @Requires("assignments.readOwn")
 mine(@CurrentAuth() auth:AuthContext) {return this.prisma.client.teacherAssignment.findMany({where:{teacher:{userId:auth.userId}},include:{classSubject:{include:{subject:true,schoolClass:{include:{classPeriods:{include:{period:true}}}}}},evaluations:true}});}
 @Post("teachers") @Requires("teachers.manage")
 async teacher(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
  const d=object(body);const userId=uuid(d.userId);
  return this.prisma.client.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR UPDATE`;
   const user=await tx.user.findFirst({where:{id:userId,kind:"STAFF",loginEnabled:true,roles:{some:{role:"ENS"}}}});
   if(!user)throw new BadRequestException("Compte STAFF/ENS actif requis.");
   const teacher=await tx.teacher.create({data:{userId,staffNumber:optionalText(d.staffNumber,"Matricule",80)}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:"TEACHER_CREATED",targetType:"Teacher",targetId:teacher.id}});return teacher;
  });
 }
 @Post() @Requires("assignments.manage")
 create(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.save(undefined,body,auth);}
 @Put(":id/replacement") @Requires("assignments.manage")
 replace(@Param("id") id:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.save(uuid(id),body,auth);}
 private async save(previousId:string|undefined,body:unknown,auth:AuthContext) {
  const d=object(body);const teacherId=uuid(d.teacherId),classSubjectId=uuid(d.classSubjectId),startsOn=day(d.startsOn),endsOn=d.endsOn?day(d.endsOn):null;
  return this.prisma.client.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "ClassSubject" WHERE id=${classSubjectId}::uuid FOR UPDATE`;
   const subject=await tx.classSubject.findUnique({where:{id:classSubjectId},include:{schoolClass:{include:{schoolYear:true}}}});
   const teacher=await tx.teacher.findUnique({where:{id:teacherId},include:{user:{include:{roles:true}}}});
   if(!subject||!teacher)throw new NotFoundException("Programme ou enseignant introuvable.");
   if(!teacher.user.loginEnabled||!teacher.user.roles.some(r=>r.role==="ENS"))throw new ForbiddenException("Enseignant inactif.");
   const year=subject.schoolClass.schoolYear;
   if(startsOn<year.startsOn||startsOn>year.endsOn||endsOn&&(endsOn<=startsOn||endsOn.getTime()>year.endsOn.getTime()+86400000))throw new BadRequestException("Dates d'affectation hors année ou incohérentes.");
   if(previousId) {
    const previous=await tx.teacherAssignment.findUnique({where:{id:previousId}});
    if(!previous||previous.classSubjectId!==classSubjectId)throw new BadRequestException("Remplacement incohérent.");
    await tx.teacherAssignment.update({where:{id:previousId},data:{endsOn:startsOn}});
   }
   const result=await tx.teacherAssignment.create({data:{teacherId,classSubjectId,classId:subject.classId,startsOn,endsOn}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:previousId?"ASSIGNMENT_REPLACED":"ASSIGNMENT_CREATED",targetType:"TeacherAssignment",targetId:result.id}});return result;
  });
 }
}
@Module({imports:[PrismaModule],controllers:[AssignmentsController]})
export class AssignmentsModule {}
