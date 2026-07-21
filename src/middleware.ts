import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_COOKIE = 'chefora_session';

if (!JWT_SECRET) {
  console.error('Warning: JWT_SECRET is not set');
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  try {
    
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    
    if (!token) {
      console.log(`[Middleware] No token found in cookies for ${request.nextUrl.pathname}`);
      
      const allCookies = request.cookies.getAll();
      console.log(`[Middleware] Available cookies:`, allCookies.map(c => c.name));
      return false;
    }

    if (!JWT_SECRET) {
      console.error('[Middleware] JWT_SECRET is not set');
      return false;
    }

    try {
      
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      const isValid = !!payload && !!payload.userId;
      if (!isValid) {
        console.log('[Middleware] Token decoded but invalid (no userId)');
      } else {
        console.log(`[Middleware] Token verified successfully for ${request.nextUrl.pathname}`);
      }
      return isValid;
    } catch (err) {
      console.log(`[Middleware] Token verification failed for ${request.nextUrl.pathname}:`, err);
      return false;
    }
  } catch (err) {
    console.error('[Middleware] Auth verification error:', err);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/signup'];
  if (publicRoutes.includes(pathname)) {
    
    return NextResponse.next();
  }

  const isProtectedRoute = 
    pathname === '/' || 
    pathname.startsWith('/community') ||
    pathname.startsWith('/ai-recipes') ||
    pathname.startsWith('/dashboard');
  
  if (isProtectedRoute) {
    const isAuthenticated = await verifyAuth(request);
    
    if (!isAuthenticated) {
      
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/community/:path*',
    '/ai-recipes/:path*',
    '/dashboard/:path*',
  ],
};
