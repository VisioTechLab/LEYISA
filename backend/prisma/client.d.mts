import type { PrismaClient } from "../generated/prisma/client.js";

export function createClient(options?: {
  connectionTimeoutMillis?: number;
  query_timeout?: number;
}): PrismaClient;
