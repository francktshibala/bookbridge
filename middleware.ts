import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  
  // Check if Supabase environment variables are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not found, skipping authentication middleware');
    return response;
  }
  
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Protected routes
    const protectedRoutes = ['/library', '/upload', '/settings', '/api/books', '/api/ai'];
    const authRoutes = ['/auth/login', '/auth/signup'];
    
    // Public API routes that should not require authentication
    const publicApiRoutes = ['/api/books/external', '/api/books/gutenberg-'];
    
    const isPublicApiRoute = publicApiRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );
    
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    ) && !isPublicApiRoute;
    
    const isAuthRoute = authRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to library if accessing auth routes while logged in
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/library', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's any error in middleware, allow the request to continue
    return response;
  }
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