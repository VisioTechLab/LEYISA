import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma.module.js";
import { ResultsController } from "./results.controller.js";
import { ResultsService } from "./results.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
