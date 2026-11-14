import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { createClient } from "../../prisma/client.mjs";

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  readonly client = createClient({
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  });

  async isReady(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1 FROM public."SchoolYear" LIMIT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}
