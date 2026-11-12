import "reflect-metadata";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const envFile = new URL("../../.env", import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);

  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535.");
  }

  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.enableShutdownHooks();
  try {
    await app.listen(port, "0.0.0.0");
  } catch (error) {
    await app.close();
    throw error;
  }
}

try {
  await bootstrap();
} catch {
  Logger.error("Démarrage impossible. Vérifiez la configuration de PORT et DATABASE_URL.", undefined, "Bootstrap");
  process.exitCode = 1;
}
