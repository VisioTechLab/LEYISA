import { createHash } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";

interface AuthenticatedRequest {
  headers: { authorization?: string };
}

const studentOfficeRoles = new Set(["ADM", "SEC"]);

@Injectable()
export class StudentsSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]{32,512})$/);
    if (!match) throw new UnauthorizedException("Session requise.");

    const tokenHash = createHash("sha256").update(match[1]).digest("hex");
    const session = await this.prisma.client.session.findFirst({
      where: { tokenHash, userKind: "STAFF", revokedAt: null, expiresAt: { gt: new Date() } },
      select: { user: { select: { kind: true, roles: { select: { role: true } } } } },
    });
    if (!session || session.user.kind !== "STAFF") {
      throw new UnauthorizedException("Session invalide ou expirée.");
    }
    if (!session.user.roles.some(({ role }) => studentOfficeRoles.has(role))) {
      throw new ForbiddenException("Accès au module élèves refusé.");
    }
    return true;
  }
}
