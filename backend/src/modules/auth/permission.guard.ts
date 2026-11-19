import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FORBIDDEN_MESSAGE } from "./access-rules.js";
import { type Permission, rolesAllow } from "./permissions.js";
import { type AuthRequest, SessionGuard } from "./session.guard.js";

export const PERMISSION_KEY = "leyisa:permission";

/** Vérifie, après la session, que les rôles du compte donnent la permission demandée. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.auth) throw new UnauthorizedException("Connectez-vous pour continuer.");
    // R02 : une route protégée sans permission déclarée est refusée.
    if (!permission || !rolesAllow(request.auth.roles, permission)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
    return true;
  }
}

/**
 * Protège une route ou un contrôleur : session valide + permission de la matrice.
 *   @Requires("students.enroll")
 *   @Post() inscrire(@CurrentAuth() auth: AuthContext, …) { … }
 * 401 sans session, 403 si le rôle ne suffit pas.
 */
export function Requires(permission: Permission) {
  return applyDecorators(SetMetadata(PERMISSION_KEY, permission), UseGuards(SessionGuard, PermissionGuard));
}
