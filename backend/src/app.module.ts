import { Module } from "@nestjs/common";
import { HealthController } from "./common/health.controller.js";
import { PrismaModule } from "./common/prisma.module.js";
import { EvaluationsModule } from "./modules/evaluations/evaluations.module.js";
import { ResultsModule } from "./modules/results/results.module.js";
import { AuthModule } from "./modules/auth/index.js";
import { StudentsModule } from "./modules/students/students.module.js";
import { SchoolModule } from "./modules/school/school.module.js";
import { AssignmentsModule } from "./modules/assignments/assignments.module.js";
import { BulletinsModule } from "./modules/bulletins/bulletins.module.js";

@Module({
  imports: [PrismaModule, AuthModule, SchoolModule, StudentsModule, AssignmentsModule, EvaluationsModule, ResultsModule, BulletinsModule],
  controllers: [HealthController],
})
export class AppModule {}
