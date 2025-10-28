import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');

    // This API supports The Gift of the Magi for B1 level
    if (bookId !== 'gift-of-the-magi' && bookId !== 'gift-of-the-magi-b1') {
      return NextResponse.json({
        success: false,
        error: 'This API only supports The Gift of the Magi B1'
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Load B1 bundles from cache
    const bundlePath = path.join(process.cwd(), 'cache', 'gift-of-the-magi-B1-bundles.json');

    if (!fs.existsSync(bundlePath)) {
      return NextResponse.json({
        success: false,
        error: 'B1 bundles not found. Please generate them first.'
      }, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    const bundleData = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

    return NextResponse.json({
      success: true,
      book: {
        id: bundleData.bookId,
        title: bundleData.title,
        author: bundleData.author
      },
      level: bundleData.cefrLevel,
      totalBundles: bundleData.totalBundles,
      bundleCount: bundleData.totalBundles,
      totalSentences: bundleData.totalSentences,
      bundles: bundleData.bundles
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('Error loading Gift of the Magi B1 bundles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load B1 bundles'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}