import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const loginUrl = new URL('/login', req.url);
  const response = NextResponse.redirect(loginUrl);

  const cookieNames = [
    'admin_session',
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    '__supabase_session',
  ];

  for (let i = 0; i < 20; i++) {
    cookieNames.push(`sb-access-token.${i}`);
    cookieNames.push(`sb-refresh-token.${i}`);
    cookieNames.push(`sb-${i}`);
    cookieNames.push(`sb-auth-token.${i}`);
  }

  cookieNames.forEach((name) => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' });
  });

  // Nuclear wipe of cookies for this origin to clear 431 errors
  response.headers.set('Clear-Site-Data', '"cookies"');
  return response;
}
