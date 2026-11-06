import { NextResponse } from 'next/server';
import { getSmtpConfig, saveSmtpConfig, verifySmtpConnection } from '@/lib/nodemailer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getSmtpConfig();
  return NextResponse.json({
    user: config.user,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    host: config.host,
    port: config.port,
    secure: config.secure,
    isConfigured: config.isConfigured,
    maskedPass: config.maskedPass,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, pass, fromName, fromEmail } = body;

    const currentConfig = getSmtpConfig();
    const testUser = user ? String(user).trim() : currentConfig.user;
    const testPass = pass ? String(pass).replace(/["']/g, '').replace(/\s+/g, '') : undefined;

    // Test connection with the provided credentials
    const testResult = await verifySmtpConnection(testPass, testUser);

    if (!testResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.message,
        },
        { status: 400 }
      );
    }

    // If verified, save
    const updated = saveSmtpConfig({
      user: testUser,
      pass: testPass,
      fromName: fromName ? String(fromName).trim() : currentConfig.fromName,
      fromEmail: fromEmail ? String(fromEmail).trim() : (user || currentConfig.fromEmail),
    });

    return NextResponse.json({
      success: true,
      message: 'SMTP credentials verified and saved successfully!',
      config: updated,
    });
  } catch (error: any) {
    console.error('Error saving SMTP config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update SMTP settings',
      },
      { status: 500 }
    );
  }
}
