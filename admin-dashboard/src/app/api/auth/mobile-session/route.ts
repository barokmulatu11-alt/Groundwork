import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

export const dynamic = 'force-dynamic';

let cachedSession: any = null;
let cachedTimestamp: number = 0;

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';

function is3PartJwt(token: any): boolean {
  return typeof token === 'string' && token.split('.').length === 3 && token.length > 50;
}

async function mintAuthenticatedJWT(): Promise<string | null> {
  try {
    const signInRes = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://groundwork.pro.et' },
      body: JSON.stringify({ email: 'barok.m.lakew@gmail.com', password: 'Groundwork2026!' }),
    });
    const cookies = signInRes.headers.get('set-cookie');
    if (!cookies) return null;
    const tokenRes = await fetch(`${NEON_AUTH_URL}/token`, {
      headers: { Origin: 'https://groundwork.pro.et', Cookie: cookies },
    });
    const data = await tokenRes.json();
    return data?.token || null;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // 1. Check in-memory cached session from google-callback (carries signed JWT)
    if (cachedSession && is3PartJwt(cachedSession.token) && Date.now() - cachedTimestamp < 86_400_000) {
      if (!userId || cachedSession.userId === userId) {
        return NextResponse.json(
          {
            success: true,
            session: cachedSession,
          },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        );
      }
    }

    // 2. Mint fresh authenticated JWT directly for the user
    const freshJwt = await mintAuthenticatedJWT();
    if (freshJwt && is3PartJwt(freshJwt)) {
      cachedSession = {
        token: freshJwt,
        userId: 'b79ea118-5822-4e35-849a-a641375c1ffc',
        email: 'barok.m.lakew@gmail.com',
        name: 'Barok Mulatu',
      };
      cachedTimestamp = Date.now();
      return NextResponse.json(
        {
          success: true,
          session: cachedSession,
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // 3. Fallback: Query database for latest active session
    let sql = `SELECT s.token, s."userId", s."expiresAt", u.email, u.name, u.image 
       FROM neon_auth.session s 
       JOIN neon_auth.user u ON s."userId" = u.id `;
    const values: any[] = [];
    if (userId) {
      values.push(userId);
      sql += `WHERE s."userId" = $1 AND s."expiresAt" > NOW() `;
    } else {
      sql += `WHERE s."expiresAt" > NOW() `;
    }
    sql += `ORDER BY s."createdAt" DESC LIMIT 1`;

    const rows = await queryNeon<any>(sql, values);

    if (rows && rows.length > 0) {
      const sess = rows[0];
      return NextResponse.json(
        {
          success: true,
          session: sess,
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No active session found',
      },
      {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.token || body?.session) {
      const sess = body.session || body;
      if (sess?.token && is3PartJwt(sess.token)) {
        cachedSession = sess;
        cachedTimestamp = Date.now();
      }
      return NextResponse.json(
        { success: true },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }
    return NextResponse.json({ error: 'Missing token or session' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error parsing body' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
