import { Body, Controller, Get, Header, Post, UseGuards } from "@nestjs/common";
import { StudentsService } from "./students.service.js";
import { StudentsSessionGuard } from "./students-session.guard.js";

@Controller("students")
@UseGuards(StudentsSessionGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list() {
    return this.students.list();
  }

  @Get("registration-options")
  @Header("Cache-Control", "no-store")
  registrationOptions() {
    return this.students.registrationOptions();
  }

  @Post()
  @Header("Cache-Control", "no-store")
  register(@Body() input: unknown) {
    return this.students.register(input);
  }
}
