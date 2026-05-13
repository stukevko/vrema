import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Prisma 7: URL liegt nur in der Umgebung; Client braucht den PG-Adapter. */
export function createScriptPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL fehlt.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}
