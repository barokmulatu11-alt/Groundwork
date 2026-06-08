import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Start with a plain next response — don't forward cookies unless they change
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  // Track whether any cookies were actually modified
  let cookiesModified = false;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Only mark modified if values actually differ
        cookiesToSet.forEach(({ name, value, options }) => {
          const existing = request.cookies.get(name)?.value;
          if (existing !== value) {
            cookiesModified = true;
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              // Limit cookie size — only store what's needed
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 7, // 7 days
            });
          }
        });
      },
    },
  });

  // Refresh session silently — this is the key call
  await supabase.auth.getUser();

  // If the dashboard route requires auth and user isn't present, redirect
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
