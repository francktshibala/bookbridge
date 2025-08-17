import { PrismaClient } from '@prisma/client';

// Create a separate Prisma client that uses service role privileges
// This bypasses RLS for server-side operations

const globalForServicePrisma = globalThis as unknown as {
  servicePrisma: PrismaClient | undefined;
};

// Use the service role connection that bypasses RLS
const databaseUrl = process.env.DATABASE_URL_SERVICE_ROLE || process.env.DATABASE_URL;

export const servicePrisma = globalForServicePrisma.servicePrisma ?? 
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForServicePrisma.servicePrisma = servicePrisma;
}

export default servicePrisma;