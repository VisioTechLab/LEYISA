import { Body, Controller, Get, Header, Post, Put, Param, Query } from "@nestjs/common";
import { StudentsService } from "./students.service.js";
import { Requires } from "../auth/permission.guard.js";
import { CurrentAuth } from "../auth/session.guard.js";
import type { AuthContext } from "../auth/auth-context.js";

@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @Requires("students.search")
  @Header("Cache-Control", "no-store")
  list(@CurrentAuth() auth: AuthContext,@Query() query: Record<string,string>) {
    return this.students.list(auth,query);
  }

  @Get("registration-options")
  @Requires("school.read")
  @Header("Cache-Control", "no-store")
  registrationOptions() {
    return this.students.registrationOptions();
  }

  @Post()
  @Requires("students.create")
  @Header("Cache-Control", "no-store")
  register(@Body() input: unknown,@CurrentAuth() auth: AuthContext) {
    return this.students.register(input,auth);
  }
  @Get(":id") @Requires("students.history")
  detail(@Param("id") id:string,@CurrentAuth() auth:AuthContext) {return this.students.findById(id,auth);}
  @Post("records") @Requires("students.create")
  record(@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.students.createRecord(body,auth);}
  @Post(":id/enrollments") @Requires("students.enroll")
  enroll(@Param("id") id:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.students.enroll(id,body,auth);}
  @Put(":id") @Requires("students.update")
  update(@Param("id") id:string,@Body() body:unknown,@CurrentAuth() auth:AuthContext) {return this.students.update(id,body,auth);}
}
