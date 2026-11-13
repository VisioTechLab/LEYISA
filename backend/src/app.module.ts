import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";
import { AuthModule } from "./modules/auth/index.js";
import { EvaluationsModule } from "./modules/evaluations/evaluations.module.js";
import { ResultsModule } from "./modules/results/results.module.js";

@Module({
  imports: [PrismaModule, AuthModule, EvaluationsModule, ResultsModule],
  controllers: [HealthController],
})
export class AppModule {}