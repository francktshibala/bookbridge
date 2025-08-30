import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Accept and noop-store reading progress to avoid 404s
    return NextResponse.json({ ok: true, received: body }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}


