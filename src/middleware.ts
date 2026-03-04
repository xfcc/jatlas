
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/console/:path*',
};

export function middleware(req: NextRequest) {
  const session = req.cookies.get('session');

  if (!session || session.value !== process.env.ADMIN_PASSWORD) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
