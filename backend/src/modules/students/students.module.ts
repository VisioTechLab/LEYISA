import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { StudentsController } from "./students.controller.js";
import { StudentsSessionGuard } from "./students-session.guard.js";
import { StudentsService } from "./students.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsSessionGuard],
  exports: [StudentsService],
})
export class StudentsModule {}
