import {
  HttpException,
  HttpStatus,
  Injectable,
  type OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../common/prisma.service.js";
import type { AuthContext, RoleCode } from "./auth-context.js";
import { authConfig } from "./auth.config.js";
import { AUTH_AUDIT_ACTIONS, AuditWriter } from "./audit-writer.js";
import { LoginThrottle } from "./login-throttle.js";
import { hashPassword, verifyPassword } from "./password.js";
import { type Permission, permissionsFor } from "./permissions.js";
import { generateSessionToken, hashSessionToken } from "./session-token.js";

/** Message unique pour tout échec : ne révèle jamais si l'identifiant existe (US-001). */
export const INVALID_CREDENTIALS_MESSAGE = "Identifiant ou mot de passe incorrect.";

export interface LoginInput {
  login: string;
  password: string;
  ip: string;
  /** Jeton déjà présent dans le navigateur : il est révoqué à la connexion. */
  previousToken?: string;
}

export interface PublicUser {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  roles: RoleCode[];
  /** Permissions déduites de la matrice : l'écran s'en sert pour ses menus, le serveur revérifie toujours. */
  permissions: Permission[];
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly throttle = new LoginThrottle(authConfig.maxFailedAttempts, authConfig.lockoutMinutes);
  /** Empreinte factice : un identifiant inconnu coûte le même temps qu'un vrai. */
  private dummyHash = "";

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hashPassword(randomBytes(32).toString("hex"));
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const db = this.prisma.client;
    const throttleKey = LoginThrottle.key(input.ip, input.login);
    const retryAfter = this.throttle.retryAfterSeconds(throttleKey);
    if (retryAfter > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Trop de tentatives. Réessayez dans quelques minutes.",
          retryAfterSeconds: retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Identifiant comparé tel quel : la règle de casse reste à décider.
    const user = await db.user.findUnique({
      where: { login: input.login },
      include: { roles: true },
    });

    const passwordOk = await verifyPassword(user?.passwordHash ?? this.dummyHash, input.password);

    if (!user || !user.loginEnabled || !user.passwordHash || !passwordOk) {
      this.throttle.recordFailure(throttleKey);
      // AuditEntry.targetId est obligatoire : un identifiant inconnu n'a pas de cible à tracer.
      if (user) {
        await this.audit.write(db, {
          actorId: null,
          action: AUTH_AUDIT_ACTIONS.loginFailure,
          targetType: "User",
          targetId: user.id,
        });
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.throttle.recordSuccess(throttleKey);

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + authConfig.sessionTtlMinutes * 60_000);

    await db.$transaction(async (tx) => {
      // Nouvelle session à chaque connexion ; l'ancienne éventuelle est fermée.
      if (input.previousToken) {
        await tx.session.updateMany({
          where: { tokenHash: hashSessionToken(input.previousToken), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      const session = await tx.session.create({
        data: { tokenHash: hashSessionToken(token), userId: user.id, userKind: user.kind, expiresAt },
      });
      await this.audit.write(tx, {
        actorId: user.id,
        action: AUTH_AUDIT_ACTIONS.loginSuccess,
        targetType: "Session",
        targetId: session.id,
      });
    });

    const roles = user.roles.map(({ role }) => role as RoleCode);
    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        login: input.login,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions: permissionsFor(roles),
      },
    };
  }

  /** Contexte de la session, ou null si elle est absente, expirée, révoquée ou si le compte est désactivé. */
  async resolveSession(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { roles: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
    const { user } = session;
    if (!user.loginEnabled || !user.login) return null;
    return {
      userId: user.id,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map(({ role }) => role as RoleCode),
      sessionId: session.id,
    };
  }

  async logout(context: AuthContext): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: context.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(tx, {
        actorId: context.userId,
        action: AUTH_AUDIT_ACTIONS.logout,
        targetType: "Session",
        targetId: context.sessionId,
      });
    });
  }
}
