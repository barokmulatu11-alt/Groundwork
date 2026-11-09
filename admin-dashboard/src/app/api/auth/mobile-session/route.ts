import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

export const dynamic = 'force-dynamic';

interface BridgeSession {
  token: string;
  userId: string;
  email?: string;
  name?: string;
  expiresAt: number;
}

// Temporary in-flight bridge cache for OAuth redirects, strictly keyed by userId
const pendingSessions = new Map<string, BridgeSession>();

function is3PartJwt(token: any): boolean {
  return typeof token === 'string' && token.split('.').length === 3 && token.length > 50;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();

    // Security guard: NEVER return an unauthenticated session or guess a user.
    // An explicit, valid userId is strictly required.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || userId === 'guest' || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Explicit non-guest UUID userId parameter is required',
        },
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // 1. Check in-flight cache keyed strictly to this user
    const pending = pendingSessions.get(userId);
    if (pending) {
      if (Date.now() < pending.expiresAt && is3PartJwt(pending.token)) {
        return NextResponse.json(
          {
            success: true,
            session: {
              token: pending.token,
              userId: pending.userId,
              email: pending.email,
              name: pending.name,
            },
          },
          { headers: CORS_HEADERS }
        );
      } else {
        pendingSessions.delete(userId);
      }
    }

    // 2. Query database strictly for this user's active, non-expired session
    const sql = `
      SELECT s.token, s."userId", s."expiresAt", u.email, u.name, u.image 
      FROM neon_auth.session s 
      JOIN neon_auth.user u ON s."userId" = u.id 
      WHERE s."userId" = $1 AND s."expiresAt" > NOW() 
      ORDER BY s."createdAt" DESC LIMIT 1
    `;

    const rows = await queryNeon<any>(sql, [userId]);

    if (rows && rows.length > 0) {
      const sess = rows[0];
      return NextResponse.json(
        {
          success: true,
          session: sess,
        },
        { headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No active session found for the requested user',
      },
      {
        status: 404,
        headers: CORS_HEADERS,
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Database query error',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sess = body?.session || body;
    const token = sess?.token;
    const userId = (sess?.userId || sess?.user?.id)?.trim();

    if (!userId || userId === 'guest' || !token || !is3PartJwt(token)) {
      return NextResponse.json(
        { error: 'Valid userId and 3-part JWT token required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Store in-flight bridge session with 5-minute TTL keyed strictly by userId
    pendingSessions.set(userId, {
      token,
      userId,
      email: sess.email || sess?.user?.email || '',
      name: sess.name || sess?.user?.name || '',
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Prune stale entries
    const now = Date.now();
    for (const [key, value] of pendingSessions.entries()) {
      if (value.expiresAt < now) {
        pendingSessions.delete(key);
      }
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error parsing body' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
