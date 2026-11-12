import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
