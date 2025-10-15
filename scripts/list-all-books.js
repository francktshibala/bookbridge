#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllBooks() {
  try {
    console.log('📚 All books in database:\n');

    const books = await prisma.book.findMany({
      orderBy: { id: 'asc' }
    });

    books.forEach(book => {
      console.log(`ID: ${book.id}`);
      console.log(`Title: ${book.title}`);
      console.log(`Author: ${book.author}`);
      console.log('---');
    });

    console.log(`\nTotal: ${books.length} books`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllBooks();
