import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching original content for ID:', id);

    // Map book IDs to cache files containing original text
    const originalCacheMap: { [key: string]: string } = {
      'great-gatsby-a2': 'great-gatsby-modernized.json', // Use modernized as fallback
      'gutenberg-1952-A1': 'yellow-wallpaper-modernized.json',
      'gutenberg-1513': 'romeo-juliet-original.json',
      'gutenberg-43': 'jekyll-hyde-original.json',
      'sleepy-hollow-enhanced': 'sleepy-hollow-modernized.json'
    };

    // Book metadata
    const bookMeta: { [key: string]: { title: string; author: string } } = {
      'great-gatsby-a2': { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
      'gutenberg-1952-A1': { title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' },
      'gutenberg-1513': { title: 'Romeo and Juliet', author: 'William Shakespeare' },
      'gutenberg-43': { title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson' },
      'sleepy-hollow-enhanced': { title: 'The Legend of Sleepy Hollow', author: 'Washington Irving' }
    };

    const cacheFile = originalCacheMap[id];
    const metadata = bookMeta[id];

    if (!cacheFile || !metadata) {
      return NextResponse.json(
        { error: `Book not found: ${id}` },
        { status: 404 }
      );
    }

    const cacheFilePath = path.join(process.cwd(), 'cache', cacheFile);

    if (!fs.existsSync(cacheFilePath)) {
      return NextResponse.json(
        { error: `Original content file not found: ${cacheFile}` },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
    const cacheData = JSON.parse(fileContent);

    // Extract the text - handle both original and modernized cache formats
    let originalText = '';

    if (cacheData.fullText) {
      originalText = cacheData.fullText;
    } else if (cacheData.text) {
      originalText = cacheData.text;
    } else if (cacheData.content) {
      originalText = cacheData.content;
    } else if (cacheData.chunks) {
      // For modernized files, extract from chunks
      originalText = cacheData.chunks
        .map((chunk: any) => chunk.original || chunk.modernized || chunk.text)
        .filter((text: string) => text && text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      return NextResponse.json(
        { error: 'No text content found in cache file' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      title: metadata.title,
      author: metadata.author,
      content: originalText,
      contentType: 'text',
      language: 'en'
    });

  } catch (error) {
    console.error('Original content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}