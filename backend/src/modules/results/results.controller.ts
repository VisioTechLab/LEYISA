import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ResultsService } from "./results.service.js";

@Controller("results")
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

  @Post("submissions/:id/approve")
  @HttpCode(200)
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.results.approveSubmission(id, body);
  }

  @Post("submissions/:id/reject")
  @HttpCode(200)
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.results.rejectSubmission(id, body);
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

  @Post("class-periods/:id/close")
  @HttpCode(201)
  close(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.results.closeClassPeriod(id, body);
  }

  @Get("class-periods/:id/final-results")
  @Header("Cache-Control", "no-store")
  finalResults(@Param("id", ParseUUIDPipe) id: string) {
    return this.results.finalResults(id);
  }
}
