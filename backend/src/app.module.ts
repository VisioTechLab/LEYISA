import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";
import { StudentsModule } from "./modules/students/students.module.js";

@Module({
  imports: [PrismaModule, StudentsModule],
  controllers: [HealthController],
})
export class AppModule {}
