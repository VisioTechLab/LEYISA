import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { AuditWriter } from "./audit-writer.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SessionGuard } from "./session.guard.js";

/**
 * Module Accès. Exporte les contrats communs aux autres modules :
 * SessionGuard et CurrentAuth (C01, identité) ; AuditWriter (C09, audit).
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuditWriter, SessionGuard],
  exports: [AuthService, AuditWriter, SessionGuard],
})
export class AuthModule {}
