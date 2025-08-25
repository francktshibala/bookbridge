#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const prisma = new PrismaClient();

async function checkPaths() {
  const chunks = await prisma.bookChunk.findMany({
    where: { audioFilePath: { not: null } },
    select: { bookId: true, audioFilePath: true },
    take: 10
  });

  console.log('📊 Audio path samples:');
  chunks.forEach(chunk => {
    const hasBookId = chunk.audioFilePath?.includes(chunk.bookId);
    console.log(`${chunk.bookId}: ${hasBookId ? '✅' : '❌'} ${chunk.audioFilePath?.slice(-50)}`);
  });

  await prisma.$disconnect();
}

checkPaths().catch(console.error);