import { Injectable, SetMetadata, ForbiddenException, HttpException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";
import { SessionGuard, type AuthRequest } from "./session.guard.js";
import { PERMISSION_KEY } from "./permission.guard.js";
import { rolesAllow } from "./permissions.js";
import { readCookie } from "./session-token.js";
import { PrismaService } from "../../common/prisma.service.js";

export const Public = () => SetMetadata("leyisa:public", true);
export const SessionOnly = () => SetMetadata("leyisa:session-only", true);
export const CSRF_COOKIE = "leyisa_csrf";

/** Refus global : toute nouvelle route doit déclarer son accès. */
@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly sessions: SessionGuard,private readonly prisma:PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    try {return await this.check(context,request);}
    catch(error) {
      if(error instanceof HttpException && [401,403].includes(error.getStatus())) {
        await this.prisma.client.auditEntry.create({data:{actorId:request.auth?.userId??null,action:'DENY',targetType:'API',targetId:null,details:{status:error.getStatus(),method:request.method??'GET'}}});
      }
      throw error;
    }
  }
  private async check(context:ExecutionContext,request:AuthRequest) {
    const targets = [context.getHandler(), context.getClass()];
    const publicRoute = this.reflector.getAllAndOverride<boolean>("leyisa:public", targets);
    if (!publicRoute) {
      await this.sessions.canActivate(context);
      const permission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, targets);
      if (!this.reflector.getAllAndOverride<boolean>("leyisa:session-only", targets) &&
          (!permission || !rolesAllow(request.auth!.roles, permission))) {
        throw new ForbiddenException("Vous n'avez pas accès à cette action.");
      }
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method ?? "GET")) {
      const origins = (process.env.APP_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173").split(",");
      const cookie = readCookie(request.headers.cookie, CSRF_COOKIE) ?? "";
      const token = request.headers["x-csrf-token"] ?? "";
      if (!request.headers.origin || !origins.includes(request.headers.origin) ||
          !/^[a-f0-9]{64}$/.test(cookie) || typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) ||
          !timingSafeEqual(Buffer.from(cookie), Buffer.from(token))) {
        throw new ForbiddenException("La vérification de sécurité a échoué. Rechargez la page.");
      }
    }
    return true;
  }
}
