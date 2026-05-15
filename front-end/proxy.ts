import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = process.env.SESSION_COOKIE_NAME || 'scaler_dashboard_session';
  const hasSession = Boolean(request.cookies.get(cookieName)?.value);

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasSession) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};
