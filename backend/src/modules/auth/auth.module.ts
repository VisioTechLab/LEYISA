import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { AuditWriter } from "./audit-writer.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PermissionGuard } from "./permission.guard.js";
import { SessionGuard } from "./session.guard.js";

/**
 * Module Accès. Exporte les contrats communs aux autres modules :
 * SessionGuard, CurrentAuth et @Requires (C01, identité et droits) ; AuditWriter (C09, audit).
 * Un module qui utilise @Requires importe AuthModule.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuditWriter, SessionGuard, PermissionGuard],
  exports: [AuthService, AuditWriter, SessionGuard, PermissionGuard],
})
export class AuthModule {}
