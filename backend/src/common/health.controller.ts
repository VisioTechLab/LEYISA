import { Controller, Get, Header, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { Public } from "../modules/auth/security.guard.js";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @Header("Cache-Control", "no-store")
  async check(): Promise<{ status: "ok" }> {
    if (!await this.prisma.isReady()) {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
    return { status: "ok" };
  }
}
