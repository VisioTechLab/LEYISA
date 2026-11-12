import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

export function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL est nécessaire (voir .env.example).");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
