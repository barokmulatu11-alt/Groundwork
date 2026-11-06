import { NextResponse } from 'next/server';
import { verifySmtpConnection, getSmtpConfig } from '@/lib/nodemailer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getSmtpConfig();
  const result = await verifySmtpConnection();

  return NextResponse.json({
    ok: result.ok,
    message: result.message,
    config: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      isConfigured: config.isConfigured,
      maskedPass: config.maskedPass,
    },
  });
}

export async function POST() {
  const config = getSmtpConfig();
  const result = await verifySmtpConnection();

  return NextResponse.json({
    ok: result.ok,
    message: result.message,
    config: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      isConfigured: config.isConfigured,
      maskedPass: config.maskedPass,
    },
  });
}
