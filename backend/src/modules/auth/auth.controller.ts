import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { AuthContext } from "./auth-context.js";
import { authConfig, LOGIN_MAX_LENGTH, PASSWORD_MAX_LENGTH, SESSION_COOKIE_NAME } from "./auth.config.js";
import { AuthService, type PublicUser } from "./auth.service.js";
import { permissionsFor } from "./permissions.js";
import { type AuthRequest, CurrentAuth, SessionGuard } from "./session.guard.js";
import { readCookie } from "./session-token.js";

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  path: string;
  expires?: Date;
}

/** Méthodes de la réponse Express utilisées ici. */
interface AuthResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: CookieOptions): unknown;
  setHeader(name: string, value: string): unknown;
}

function cookieOptions(): CookieOptions {
  // Strict : le cookie n'accompagne aucune requête venue d'un autre site.
  // Un jeton CSRF complémentaire reste à décider avec Joel.
  return { httpOnly: true, secure: authConfig.secureCookie, sameSite: "strict", path: "/" };
}

/** Les contrôles de l'écran ne suffisent jamais : tout est revérifié ici (R02). */
function parseCredentials(body: unknown): { login: string; password: string } {
  const data = (body ?? {}) as Record<string, unknown>;
  const login = typeof data.login === "string" ? data.login.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";
  if (!login || !password || login.length > LOGIN_MAX_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new BadRequestException("Saisissez votre identifiant et votre mot de passe.");
  }
  return { login, password };
}

function publicUser(auth: AuthContext): PublicUser {
  return {
    id: auth.userId,
    login: auth.login,
    firstName: auth.firstName,
    lastName: auth.lastName,
    roles: auth.roles,
    permissions: permissionsFor(auth.roles),
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** US-001 — Se connecter. */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() request: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: AuthResponse,
  ): Promise<{ user: PublicUser }> {
    const { login, password } = parseCredentials(body);
    const result = await this.auth.login({
      login,
      password,
      ip: request.ip ?? "inconnue",
      previousToken: readCookie(request.headers.cookie, SESSION_COOKIE_NAME),
    });
    response.cookie(SESSION_COOKIE_NAME, result.token, { ...cookieOptions(), expires: result.expiresAt });
    response.setHeader("Cache-Control", "no-store");
    // Ni empreinte ni jeton dans le corps : le jeton ne voyage que dans le cookie.
    return { user: result.user };
  }

  /** US-002 — Se déconnecter. */
  @Post("logout")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) response: AuthResponse): Promise<void> {
    await this.auth.logout(auth);
    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
  }

  /** Utilisateur courant : l'écran s'en sert pour savoir qui est connecté. */
  @Get("me")
  @UseGuards(SessionGuard)
  me(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) response: AuthResponse): { user: PublicUser } {
    response.setHeader("Cache-Control", "no-store");
    return { user: publicUser(auth) };
  }
}
