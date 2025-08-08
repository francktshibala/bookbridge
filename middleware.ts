import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Allow public files
  if (request.nextUrl.pathname.startsWith('/manifest.json') ||
      request.nextUrl.pathname.startsWith('/icon-') ||
      request.nextUrl.pathname.includes('.')) {
    return response;
  }
  
  // Allow Next.js internal requests (RSC prefetching)
  if (request.nextUrl.searchParams.has('_rsc') || 
      request.headers.get('rsc') === '1' ||
      request.headers.get('next-router-prefetch') === '1') {
    return response;
  }
  
  // FULLY PASSIVE MIDDLEWARE: No auth checks at all
  // All auth protection is now handled client-side by AuthProvider and useRequireAuth hook
  // The API routes will handle their own authentication validation

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};