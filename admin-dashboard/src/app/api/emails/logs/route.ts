import { NextResponse } from 'next/server';
import { getEmailLogs, clearEmailLogs } from '@/lib/email-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await getEmailLogs();
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch email logs' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const success = await clearEmailLogs();
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to clear email logs' }, { status: 500 });
  }
}
