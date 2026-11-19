import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

export function createClient(options = {}) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL est nécessaire (voir .env.example).");
  try {
    const url = new URL(connectionString);
    if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error();
    if (process.env.LEYISA_DEPLOYMENT === "render" &&
        (process.env.LEYISA_DB_MODE !== "shared" ||
          !/^[a-z0-9-]+-pooler\..+\.neon\.(tech|build)$/.test(url.hostname) ||
          url.searchParams.get("sslmode") !== "verify-full")) {
      throw new Error();
    }
  } catch {
    throw new Error("DATABASE_URL invalide. Render exige une URL Neon pooled avec sslmode=verify-full.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ ...options, connectionString }) });
}
