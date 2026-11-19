import { Global, Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { SecurityGuard } from "./security.guard.js";
import { ApiErrorsFilter } from "../../common/api-errors.filter.js";
import { AccountsController } from "./accounts.controller.js";
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
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController, AccountsController],
  providers: [AuthService, AuditWriter, SessionGuard, PermissionGuard,
    { provide: APP_GUARD, useClass: SecurityGuard }, { provide: APP_FILTER, useClass: ApiErrorsFilter }],
  exports: [AuthService, AuditWriter, SessionGuard, PermissionGuard],
})
export class AuthModule {}
