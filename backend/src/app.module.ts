import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";
import { ResultsModule } from "./modules/results/results.module.js";

@Module({
  imports: [PrismaModule, ResultsModule],
  controllers: [HealthController],
})
export class AppModule {}
