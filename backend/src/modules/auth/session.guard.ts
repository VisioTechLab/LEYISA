import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthContext } from "./auth-context.js";
import { SESSION_COOKIE_NAME } from "./auth.config.js";
import { AuthService } from "./auth.service.js";
import { readCookie } from "./session-token.js";

/** Champs de la requête HTTP utilisés par le module (évite une dépendance aux types Express). */
export interface AuthRequest {
  headers: { cookie?: string };
  ip?: string;
  auth?: AuthContext;
}

/**
 * Garde de session : refuse toute requête sans session valide (R02).
 * À poser sur chaque contrôleur protégé : @UseGuards(SessionGuard).
 * Les droits par rôle se vérifient ensuite avec hasAnyRole().
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = readCookie(request.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) throw new UnauthorizedException("Connectez-vous pour continuer.");

    const authContext = await this.auth.resolveSession(token);
    if (!authContext) throw new UnauthorizedException("Votre session a expiré. Reconnectez-vous.");

    request.auth = authContext;
    return true;
  }
}

/** Injecte l'AuthContext (C01) : @CurrentAuth() auth: AuthContext */
export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const request = context.switchToHttp().getRequest<AuthRequest>();
  if (!request.auth) throw new UnauthorizedException("Connectez-vous pour continuer.");
  return request.auth;
});
