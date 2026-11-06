import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('admin_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ session: null, user: null, profile: null });
    }

    const parsed = JSON.parse(sessionCookie);
    const userId = parsed.userId || parsed.user?.id;
    if (!userId) {
      return NextResponse.json({ session: null, user: null, profile: null });
    }

    // Load full profile row on-demand from Neon
    const profRows = await queryNeon<any>(
      'SELECT * FROM profiles WHERE id = $1 LIMIT 1',
      [userId]
    );
    const profile = profRows[0] || null;

    const session = {
      token: parsed.token,
      user: {
        id: userId,
        email: profile?.email || parsed.email,
        full_name: profile?.full_name || 'Admin',
      },
      profile,
    };

    return NextResponse.json({
      session,
      user: session.user,
      profile,
    });
  } catch (error) {
    return NextResponse.json({ session: null, user: null, profile: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
