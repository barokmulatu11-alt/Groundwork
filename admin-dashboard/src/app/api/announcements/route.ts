import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
};

export async function GET(_req: NextRequest) {
  try {
    const sql = `
      SELECT id, title, message, type, is_active, created_at, expires_at 
      FROM announcements 
      WHERE is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    const rows = await queryNeon<any>(sql);

    return NextResponse.json(
      {
        success: true,
        announcements: rows || [],
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (err: any) {
    console.error('API /api/announcements GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch announcements',
        announcements: [],
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
