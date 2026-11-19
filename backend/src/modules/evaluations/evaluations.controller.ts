import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { EvaluationsService } from "./evaluations.service.js";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";

@Controller("evaluations")
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get()
  @Requires("evaluations.read")
  @Header("Cache-Control", "no-store")
  list(@CurrentAuth() auth:AuthContext) {
    return this.evaluations.list(auth);
  }

  @Get(":id")
  @Requires("evaluations.read")
  @Header("Cache-Control", "no-store")
  detail(@Param("id", ParseUUIDPipe) id: string,@CurrentAuth() auth:AuthContext) {
    return this.evaluations.detail(id,auth);
  }

  @Put(":id/grades")
  @Requires("grades.write")
  @Header("Cache-Control", "no-store")
  saveGrades(@Param("id", ParseUUIDPipe) id: string, @Body() body: unknown,@CurrentAuth() auth:AuthContext) {
    return this.evaluations.saveGrades(id, body,auth);
  }

  @Post(":id/submission")
  @Requires("grades.submit")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  submit(@Param("id", ParseUUIDPipe) id: string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {
    return this.evaluations.submit(id,auth,body);
  }
  @Post() @Requires("evaluations.create")
  create(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.evaluations.create(body,auth);}
}
