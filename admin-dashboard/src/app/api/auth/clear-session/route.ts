import { NextResponse } from 'next/server';

// Clears all Supabase auth cookies — used when REQUEST_HEADER_TOO_LARGE occurs
export async function GET() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'https://v0-barok-labs.vercel.app')
  );

  // Clear all known Supabase cookie patterns
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    '__supabase_session',
  ];

  // Also clear any chunked variants
  for (let i = 0; i < 10; i++) {
    cookieNames.push(`sb-access-token.${i}`);
    cookieNames.push(`sb-refresh-token.${i}`);
  }

  cookieNames.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' });
  });

  // Nuclear option: clear by prefix pattern via header
  response.headers.set('Clear-Site-Data', '"cookies"');

  return response;
}
