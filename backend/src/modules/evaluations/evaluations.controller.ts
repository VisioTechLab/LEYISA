import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { EvaluationsService } from "./evaluations.service.js";

@Controller("evaluations")
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list() {
    return this.evaluations.list();
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.evaluations.detail(id);
  }

  @Put(":id/grades")
  @Header("Cache-Control", "no-store")
  saveGrades(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.evaluations.saveGrades(id, body);
  }

  @Post(":id/submission")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  submit(@Param("id", ParseUUIDPipe) id: string) {
    return this.evaluations.submit(id);
  }
}
