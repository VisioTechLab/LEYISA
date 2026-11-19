import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import { object, page, text, uuid } from "../../common/input.js";
import { Requires } from "./permission.guard.js";
import { CurrentAuth } from "./session.guard.js";
import type { AuthContext, RoleCode } from "./auth-context.js";
import { hashPassword, verifyPassword } from "./password.js";
import { SessionOnly } from "./security.guard.js";

const userSelect = { id:true, firstName:true, lastName:true, login:true, loginEnabled:true, roles:true } as const;
function password(value: unknown) {
  if (typeof value!=="string" || value.length<12 || value.length>256) throw new BadRequestException("Mot de passe de 12 à 256 caractères requis.");
  return value;
}
function roles(value: unknown): RoleCode[] {
  if (!Array.isArray(value) || value.length===0 || value.length>4 || value.some(v=>!["ADM","SEC","ENS","DIR"].includes(v))) throw new BadRequestException("Rôles STAFF invalides.");
  return [...new Set(value)] as RoleCode[];
}

@Controller()
export class AccountsController {
 constructor(private readonly prisma: PrismaService) {}

 @Get("users") @Requires("accounts.manage")
 async list(@Query("page") p?: string) {
  const n=page(p); const where={kind:"STAFF" as const};
  const [items,total]=await Promise.all([this.prisma.client.user.findMany({where,select:userSelect,orderBy:{lastName:"asc"},skip:(n-1)*50,take:50}),this.prisma.client.user.count({where})]);
  return {items,total,page:n};
 }
 @Post("users") @Requires("accounts.manage")
 async create(@Body() body: unknown,@CurrentAuth() auth:AuthContext) {
  const d=object(body);const assigned=roles(d.roles);if(assigned.length!==1) throw new BadRequestException("Un rôle initial minimal requis.");
  const passwordHash=await hashPassword(password(d.initialPassword));
  return this.prisma.client.$transaction(async tx=>{
   const user=await tx.user.create({data:{firstName:text(d.firstName,"Prénom"),lastName:text(d.lastName,"Nom"),login:text(d.login,"Login",100),passwordHash,kind:"STAFF",loginEnabled:false,roles:{create:assigned.map(role=>({role}))}},select:userSelect});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:"USER_CREATED",targetType:"User",targetId:user.id}});return user;
  });
 }
 @Patch("users/:id/status") @Requires("accounts.manage")
 status(@Param("id") raw:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
  const d=object(body);if(typeof d.enabled!=="boolean")throw new BadRequestException("Statut invalide.");
  return this.update(raw,auth,{enabled:d.enabled});
 }
 @Put("users/:id/roles") @Requires("accounts.manage")
 setRoles(@Param("id") raw:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.update(raw,auth,{roles:roles(object(body).roles)});}

 private async update(raw:string,auth:AuthContext,change:{enabled?:boolean;roles?:RoleCode[]}) {
  const id=uuid(raw);if(id===auth.userId)throw new ForbiddenException("Vous ne pouvez modifier vos propres rôles ou statut.");
  return this.prisma.client.$transaction(async tx=>{
   await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(19731119)`;
   const target=await tx.user.findUnique({where:{id},include:{roles:true}});if(!target || target.kind!=="STAFF")throw new NotFoundException("Compte STAFF introuvable.");
   if(target.loginEnabled&&target.roles.some(r=>r.role==="ADM")&&(change.enabled===false||change.roles&&!change.roles.includes("ADM"))) {
    const count=await tx.user.count({where:{loginEnabled:true,roles:{some:{role:"ADM"}}}});if(count<=1)throw new ForbiddenException("Le dernier administrateur actif est protégé.");
   }
   if(change.enabled && (!target.passwordHash||!target.login))throw new BadRequestException("Identifiants initiaux requis.");
   if(change.roles) {
    await tx.userRole.deleteMany({where:{userId:id}});
    await tx.userRole.createMany({data:change.roles.map(role=>({userId:id,userKind:"STAFF",role}))});
   }
   if(change.enabled!==undefined)await tx.user.update({where:{id},data:{loginEnabled:change.enabled}});
   await tx.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:change.roles?"ROLE_CHANGED":change.enabled?"USER_ENABLED":"USER_DISABLED",targetType:"User",targetId:id,
    details:change.roles?{previousRoles:target.roles.map(r=>r.role),newRoles:change.roles}:{previousEnabled:target.loginEnabled,newEnabled:change.enabled}}});
   return tx.user.findUnique({where:{id},select:userSelect});
  });
 }
 @Post("auth/change-password") @HttpCode(204) @SessionOnly()
 async changePassword(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
  const d=object(body);const next=password(d.newPassword);const current=text(d.currentPassword,"Ancien mot de passe",256);
  const hash=await hashPassword(next);
  await this.prisma.client.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "User" WHERE id=${auth.userId}::uuid FOR UPDATE`;
   const user=await tx.user.findUnique({where:{id:auth.userId}});
   if(!user?.passwordHash || !await verifyPassword(user.passwordHash,current))throw new ForbiddenException("Mot de passe actuel incorrect.");
   await tx.user.update({where:{id:auth.userId},data:{passwordHash:hash}});
   await tx.session.updateMany({where:{userId:auth.userId,id:{not:auth.sessionId},revokedAt:null},data:{revokedAt:new Date()}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:"PASSWORD_CHANGED",targetType:"User",targetId:auth.userId}});
  },{timeout:15000});
 }
 @Get("audit") @Requires("audit.read")
 async audit(@Query("page") p?:string,@Query("action") action?:string,@Query("actorId") actorId?:string) {
  const n=page(p);const where={...(action?{action:text(action,"Action",80)}:{}),...(actorId?{actorId:uuid(actorId)}:{})};
  const [items,total]=await Promise.all([this.prisma.client.auditEntry.findMany({where,skip:(n-1)*50,take:50,orderBy:{occurredAt:"desc"}}),this.prisma.client.auditEntry.count({where})]);
  return {items,total,page:n};
 }
}
