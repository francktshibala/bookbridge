import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPgbouncerUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    const params = url.searchParams;
    if (!params.has('pgbouncer')) params.set('pgbouncer', 'true');
    if (!params.has('connection_limit')) params.set('connection_limit', '1');
    if (!params.has('pool_timeout')) params.set('pool_timeout', '30');
    return url.toString();
  } catch {
    return baseUrl;
  }
}

const runtimeDatabaseUrl = buildPgbouncerUrl(process.env.DATABASE_URL);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: runtimeDatabaseUrl
    ? {
        db: {
          url: runtimeDatabaseUrl,
        },
      }
    : undefined,
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;