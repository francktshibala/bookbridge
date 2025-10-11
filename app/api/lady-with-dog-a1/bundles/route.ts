import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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
    const level = searchParams.get('level') || 'A1';

    // This API supports The Lady with the Dog for A1 level
    if (bookId !== 'lady-with-dog' && bookId !== 'lady-with-dog-a1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Lady with the Dog A1'
      }, { status: 400 });
    }

    console.log(`🐕 Loading The Lady with the Dog bundles for level: ${level}`);

    // Get bundles from BookChunk table
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'lady-with-dog',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No bundles found for The Lady with the Dog A1'
      }, { status: 404 });
    }

    console.log(`✅ Loaded ${bookChunks.length} bundles from BookChunk table`);

    // Convert BookChunk data to API format with proper timing
    const bundles: BundleMetadata[] = [];
    let totalSentencesProcessed = 0;

    // Initialize Supabase client once
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    bookChunks.forEach((chunk, index) => {
      // Generate Supabase storage URL from relative path using API, not hardcoded domain
      const audioUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(chunk.audioFilePath!)
        .data.publicUrl;

      // Split chunk text into sentences
      const chunkSentences = chunk.chunkText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      console.log(`Bundle ${index}: ${chunkSentences.length} sentences`);

      // Use measured timings from ffprobe (proportional distribution)
      // Get actual audio duration using ffprobe if available
      let actualDuration: number | null = null;
      try {
        const { execSync } = require('child_process');
        const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioUrl}"`;
        const result = execSync(command, { encoding: 'utf-8' }).trim();
        actualDuration = parseFloat(result);
      } catch (error) {
        console.log(`Could not measure duration for bundle ${index}, using estimated timings`);
      }

      let sentencesWithTimings;
      let cumulativeTime: number = 0;

      if (actualDuration && !isNaN(actualDuration) && actualDuration > 0) {
        // Use measured duration for proportional sentence timing
        console.log(`Bundle ${index}: Using measured duration ${actualDuration.toFixed(3)}s`);

        const totalWords = chunkSentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0);
        let currentTime = 0;

        sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
          const words = text.trim().split(/\s+/).length;
          const wordRatio = words / totalWords;
          const estimatedDuration = actualDuration! * wordRatio;

          const startTime = currentTime;
          const endTime = currentTime + estimatedDuration;
          currentTime = endTime;

          return {
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text.trim(),
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3))
          };
        });
      } else {
        // Fallback to improved estimated timings (0.35s per word + buffer)
        console.log(`Bundle ${index}: Using improved estimated timings`);

        cumulativeTime = 0;
        sentencesWithTimings = chunkSentences.map((text, sentenceIdx) => {
          const words = text.trim().split(/\s+/).length;
          const secondsPerWord = 0.35; // Improved from 0.30 to 0.35
          const lengthPenalty = words > 12 ? (words - 12) * 0.03 : 0; // Penalty for long sentences
          const buffer = 0.20; // Increased buffer from 0.12 to 0.20
          const duration = words * secondsPerWord + lengthPenalty + buffer;

          const startTime = cumulativeTime;
          const endTime = startTime + duration;
          cumulativeTime = endTime;

          return {
            sentenceId: `s${totalSentencesProcessed + sentenceIdx}`,
            sentenceIndex: totalSentencesProcessed + sentenceIdx,
            text: text.trim(),
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3))
          };
        });
        actualDuration = cumulativeTime; // Use estimated total as fallback
      }

      const bundle = {
        bundleId: `bundle_${index}`,
        bundleIndex: index,
        audioUrl,
        totalDuration: parseFloat((actualDuration || cumulativeTime).toFixed(3)),
        sentences: sentencesWithTimings
      };

      bundles.push(bundle);
      totalSentencesProcessed += sentencesWithTimings.length;
    });

    // Get book metadata
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'lady-with-dog' }
    });

    // Load chapter data (from our chapter detection)
    let chapters = null;
    try {
      const chaptersPath = path.join(process.cwd(), 'cache', 'lady-with-dog-chapters.json');
      const chaptersData = fs.readFileSync(chaptersPath, 'utf-8');
      const chapterStructure = JSON.parse(chaptersData);

      // Convert to UI format with bundle mapping
      chapters = chapterStructure.chapters.map((ch: any, index: number) => ({
        chapterNumber: index + 1,
        title: ch.title,
        startSentence: ch.startSentence,
        endSentence: ch.endSentence,
        startBundle: Math.floor(ch.startSentence / 4), // 4 sentences per bundle
        endBundle: Math.floor(ch.endSentence / 4)
      }));
    } catch (error) {
      console.log('Could not load chapters data:', error instanceof Error ? error.message : 'Unknown error');
    }

    const totalSentences = bundles.reduce((sum, bundle) => sum + bundle.sentences.length, 0);

    return NextResponse.json({
      success: true,
      book: {
        id: bookId,
        title: bookContent?.title || 'The Lady with the Dog',
        author: bookContent?.author || 'Anton Chekhov'
      },
      level: 'A1',
      totalBundles: bundles.length,
      totalSentences,
      bundles,
      chapters, // Add chapter structure for UI
      source: 'dedicated-api' // Indicates this came from dedicated API for debugging
    });

  } catch (error) {
    console.error('The Lady with the Dog A1 API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}