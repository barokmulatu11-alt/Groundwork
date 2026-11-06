import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

const NEON_AUTH_URL =
  process.env.EXPO_PUBLIC_NEON_AUTH_URL ||
  'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const origin = req.headers.get('origin') || 'https://groundwork.app';

    let authenticatedUserId: string | null = null;
    let sessionToken: string | null = null;
    let userName: string | null = null;

    // 1. Try authenticating with Neon Auth endpoint
    try {
      const authRes = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
        },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const authData = await authRes.json().catch(() => ({}));

      if (authRes.ok && (authData.user || authData.token)) {
        authenticatedUserId = authData.user?.id || authData.token;
        sessionToken = authData.token || null;
        userName = authData.user?.name || null;
      }
    } catch (authErr) {
      console.warn('Neon Auth /sign-in/email endpoint check error:', authErr);
    }

    // 2. Fallback: Direct database password verification via neon_auth.account
    if (!authenticatedUserId) {
      try {
        const userRows = await queryNeon<{
          id: string;
          email: string;
          name: string | null;
          password: string | null;
        }>(
          `SELECT u.id, u.email, u.name, a.password 
           FROM neon_auth.user u
           JOIN neon_auth.account a ON a."userId" = u.id AND a."providerId" = 'credential'
           WHERE LOWER(u.email) = $1
           LIMIT 1`,
          [cleanEmail]
        );

        if (userRows.length > 0 && userRows[0].password) {
          const [salt, key] = userRows[0].password.split(':');
          if (salt && key) {
            const crypto = await import('node:crypto');
            const isValid = await new Promise<boolean>((resolve) => {
              crypto.scrypt(
                password.normalize('NFKC'),
                salt,
                64,
                { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
                (err, derivedKey) => {
                  if (err || !derivedKey) resolve(false);
                  else resolve(derivedKey.toString('hex') === key);
                }
              );
            });

            if (isValid) {
              authenticatedUserId = userRows[0].id;
              userName = userRows[0].name;
              sessionToken = 'admin_direct_' + Math.random().toString(36).substring(2);
            }
          }
        }
      } catch (dbAuthErr) {
        console.warn('Direct database password verification error:', dbAuthErr);
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Query profiles table for role and authorization
    const profRows = await queryNeon<any>(
      'SELECT * FROM profiles WHERE id = $1 OR LOWER(email) = $2 LIMIT 1',
      [authenticatedUserId, cleanEmail]
    );

    const profile = profRows[0];
    if (!profile) {
      return NextResponse.json(
        { error: 'No profile record found in database for this account.' },
        { status: 403 }
      );
    }

    if (profile.is_banned === true) {
      return NextResponse.json(
        { error: 'This account has been banned.' },
        { status: 403 }
      );
    }

    const role = String(profile.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: `Unauthorized: Role "${profile.role}" does not have dashboard access.` },
        { status: 403 }
      );
    }

    // Lightweight cookie payload: only minimal metadata, NEVER huge json settings or session lists
    const sessionCookiePayload = {
      token: sessionToken || 'admin_token_' + Date.now(),
      userId: profile.id,
      email: profile.email || cleanEmail,
      role: profile.role,
    };

    const sessionPayload = {
      token: sessionCookiePayload.token,
      user: {
        id: profile.id,
        email: profile.email || cleanEmail,
        full_name: profile.full_name || userName || 'Admin',
      },
      profile,
    };

    const response = NextResponse.json({
      success: true,
      session: sessionPayload,
      user: sessionPayload.user,
      profile,
      error: null,
    });

    // Set secure cookie for dashboard session (tiny: ~100 bytes)
    response.cookies.set('admin_session', JSON.stringify(sessionCookiePayload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Proactively clear any legacy Supabase cookies that cause HTTP 431 Request Header Too Large
    const legacyCookies = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', '__supabase_session'];
    for (let i = 0; i < 10; i++) {
      legacyCookies.push(`sb-access-token.${i}`);
      legacyCookies.push(`sb-refresh-token.${i}`);
      legacyCookies.push(`sb-${i}`);
    }
    legacyCookies.forEach((name) => {
      response.cookies.delete(name);
    });

    return response;
  } catch (error: any) {
    console.error('API /api/auth/login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
