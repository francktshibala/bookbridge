export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Using singleton prisma from @/lib/prisma;

interface BundleMetadata {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: Array<{
    sentenceId: string;
    sentenceIndex: number;
    text: string;
    startTime: number;
    endTime: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level') || 'B1';

    // This API supports The Necklace for B1 level
    if (bookId !== 'the-necklace' && bookId !== 'the-necklace-b1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Necklace B1'
      }, { status: 400 });
    }

    console.log(`💎 Loading The Necklace bundles for level: ${level}`);

    // Fast-fail check: count bundles first to avoid timeout
    const chunkCount = await prisma.bookChunk.count({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'B1'
      }
    });

    if (chunkCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Necklace B1'
      }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    // Get bundles from BookChunk table
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'B1'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Necklace B1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    bookChunks.forEach((chunk, index) => {
      // Generate Supabase storage URL
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${chunk.audioFilePath}`;

      // Split chunk text into sentences with improved regex for complex B1 punctuation
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+(?=[A-Z"]|$)/) // Split on sentence endings followed by capital letter or quote
        .map(s => s.trim())
        .filter(s => s.length > 5)
        // Further split on quote-separated sentences like "sentence!" "Another sentence."
        .flatMap(sentence => {
          // Handle cases like: "Ah, the good stew!" "I cannot imagine..."
          const quoteSplit = sentence.split(/(?<=["'][.!?])\s+(?=["'][A-Z])/);
          return quoteSplit.map(s => s.trim()).filter(s => s.length > 5);
        });

      console.log(`Bundle ${index}: ${chunkSentences.length} sentences`);

      // Calculate dynamic timings using B1-optimized formula (0.40s per word for complex sentences)
      let cumulativeTime = 0;
      const sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
        const words = text.trim().split(/\s+/).length;
        const secondsPerWord = 0.40; // B1 timing: slower for complex sentences
        const minDuration = 2.0;     // Minimum duration for short sentences
        const duration = Math.max(words * secondsPerWord, minDuration);

        const startTime = cumulativeTime;
        const endTime = startTime + duration;
        cumulativeTime = endTime; // Update for next sentence

        return {
          sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
          sentenceIndex: totalSentencesProcessed + sentenceIdx,
          text: text.trim(),
          startTime: startTime,
          endTime: endTime
        };
      });

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: cumulativeTime, // Use final cumulative time
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-necklace' }
    });

    // Load section data for thematic headers
    let sections = null;
    try {
      const sectionsPath = path.join(process.cwd(), 'cache', 'the-necklace-sections.json');
      const sectionsData = fs.readFileSync(sectionsPath, 'utf-8');
      sections = JSON.parse(sectionsData).sections;
    } catch (error) {
      console.log('Could not load sections data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Necklace',
        author: bookContent?.author || 'Guy de Maupassant'
      },
      level: 'B1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      sections, // Add thematic sections for UI
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('The Necklace B1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}