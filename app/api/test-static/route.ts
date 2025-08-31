import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    message: 'Static route test working',
    timestamp: new Date().toISOString(),
    source: 'static-test-route'
  })
}

export async function HEAD() {
  return new NextResponse(null, { 
    status: 200, 
    headers: { 'x-route': 'test-static' } 
  })
}