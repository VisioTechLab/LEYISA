import "reflect-metadata";
import { Controller, Get, Header, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Controller()
class StatusController {
  @Get(["/", "/health"])
  @Header("Content-Type", "text/plain; charset=utf-8")
  @Header("Cache-Control", "no-store")
  status(): string {
    return "LEYISA — NestJS est en ligne.";
  }
}

@Module({ controllers: [StatusController] })
class AppModule {}

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT doit être un entier compris entre 1 et 65535.");
}

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(port, "0.0.0.0");
