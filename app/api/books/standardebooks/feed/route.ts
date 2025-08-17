import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Proxying Standard Ebooks feed request...');
    
    const response = await fetch('https://standardebooks.org/feeds/atom/new-releases', {
      headers: {
        'User-Agent': 'BookBridge/1.0 (Educational Platform)',
        'Accept': 'application/atom+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Standard Ebooks API error: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    return new NextResponse(xmlText, {
      headers: {
        'Content-Type': 'application/atom+xml',
        'Cache-Control': 'public, max-age=1800', // 30 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error proxying Standard Ebooks feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Standard Ebooks feed' },
      { status: 500 }
    );
  }
}