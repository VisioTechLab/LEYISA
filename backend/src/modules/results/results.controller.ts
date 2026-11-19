import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";
import { ResultsService } from "./results.service.js";

@Controller("results")
@Requires("results.preview")
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get("bootstrap")
  @Header("Cache-Control", "no-store")
  bootstrap() {
    return this.results.bootstrap();
  }

  @Get("submissions")
  @Header("Cache-Control", "no-store")
  submissions(@Query("periodId") periodId?: string) {
    return this.results.listPendingSubmissions(periodId);
  }

  @Get("submissions/:id")
  @Header("Cache-Control", "no-store")
  submissionDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.results.submissionDetail(id);
  }

  @Requires("submissions.decide")
  @Post("submissions/:id/approve")
  @HttpCode(200)
  approve(@Param("id", ParseUUIDPipe) id: string, @CurrentAuth() auth:AuthContext) {
    return this.results.approveSubmission(id, auth.userId);
  }

  @Requires("submissions.decide")
  @Post("submissions/:id/reject")
  @HttpCode(200)
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown,@CurrentAuth() auth:AuthContext) {
    return this.results.rejectSubmission(id, auth.userId, body);
  }

  @Get("class-periods")
  @Header("Cache-Control", "no-store")
  classPeriods(@Query("periodId") periodId?: string) {
    return this.results.listClassPeriods(periodId);
  }

  @Get("class-periods/:id/preview")
  @Header("Cache-Control", "no-store")
  preview(@Param("id", ParseUUIDPipe) id: string) {
    return this.results.previewClassPeriod(id);
  }

  @Requires("results.close")
  @Post("class-periods/:id/close")
  @HttpCode(201)
  close(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown,@CurrentAuth() auth:AuthContext) {
    return this.results.closeClassPeriod(id, auth.userId, body);
  }

  @Post("class-periods/:id/publish") @Requires("results.publish") @HttpCode(200)
  publish(@Param("id",ParseUUIDPipe) id:string,@CurrentAuth() auth:AuthContext) {return this.results.publish(id,auth.userId);}

  @Get("class-periods/:id/final-results")
  @Header("Cache-Control", "no-store")
  finalResults(@Param("id", ParseUUIDPipe) id: string) {
    return this.results.finalResults(id);
  }
}
