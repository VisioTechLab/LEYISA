import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

export function createClient(options = {}) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL est nécessaire (voir .env.example).");
  try {
    const url = new URL(connectionString);
    if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("DATABASE_URL doit être une URL PostgreSQL valide.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ ...options, connectionString }) });
}
