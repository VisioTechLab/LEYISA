import "reflect-metadata";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createRenderProxyMiddleware } from "./common/render-proxy.js";

async function bootstrap(): Promise<void> {
  const envFile = new URL("../../.env", import.meta.url);
  if (existsSync(envFile)) loadEnvFile(envFile);
  const { AppModule } = await import("./app.module.js");
  if(process.env.NODE_ENV==='production' && (!process.env.APP_ORIGINS || process.env.APP_ORIGINS.split(',').some(origin=>!origin.startsWith('https://')))) {
    throw new Error("APP_ORIGINS HTTPS explicite requis en production.");
  }

  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "0.0.0.0";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535.");
  }

  const renderProxy = process.env.LEYISA_DEPLOYMENT === "render"
    ? createRenderProxyMiddleware(process.env.LEYISA_PROXY_SECRET)
    : undefined;
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.use((_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  if (renderProxy) app.use(renderProxy);
  app.enableShutdownHooks();
  try {
    await app.listen(port, host);
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
