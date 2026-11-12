import { Controller, Get, Header, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async check(): Promise<{ status: "ok" }> {
    if (!await this.prisma.isReady()) {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
    return { status: "ok" };
  }
}
