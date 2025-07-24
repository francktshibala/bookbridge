import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const feedUrl = searchParams.get('url');
    
    if (!feedUrl) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }
    
    // Only allow Standard Ebooks URLs
    if (!feedUrl.startsWith('https://standardebooks.org/')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    
    const response = await fetch(feedUrl, {
      headers: {
        'Accept': 'application/atom+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; BookBridge/1.0)',
        'Referer': 'https://standardebooks.org/'
      },
      redirect: 'follow'
    });
    
    if (!response.ok) {
      console.error(`Standard Ebooks API error: ${response.status} ${response.statusText}`);
      console.error('Requested URL:', feedUrl);
      throw new Error(`Feed error: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    return new NextResponse(xmlText, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error) {
    console.error('Error proxying Standard Ebooks feed:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Standard Ebooks feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}