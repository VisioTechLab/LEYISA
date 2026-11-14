import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";
import { EvaluationsModule } from "./modules/evaluations/evaluations.module.js";

@Module({
  imports: [PrismaModule, EvaluationsModule],
  controllers: [HealthController],
})
export class AppModule {}
