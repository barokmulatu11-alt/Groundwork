import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
  isConfigured: boolean;
  maskedPass: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'smtp_config.json');

function loadCustomConfigFile(): Record<string, any> | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Nodemailer] Could not read custom smtp_config.json:', e);
  }
  return null;
}

export function getCleanPassword(): string {
  const custom = loadCustomConfigFile();
  const rawPass = custom?.pass || process.env.SMTP_PASS || 'rdiv gfvn svcr xfys';
  // Strip quotes and spaces often introduced in env files or copy-pasted Google App Passwords
  return String(rawPass).replace(/["']/g, '').replace(/\s+/g, '');
}

export function getSmtpConfig(): SmtpConfig {
  const custom = loadCustomConfigFile();

  const user = custom?.user || process.env.SMTP_USER || 'barok.m.lakew@gmail.com';
  const host = custom?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(String(custom?.port || process.env.SMTP_PORT || '465'), 10);
  const secure = custom?.secure !== undefined ? Boolean(custom.secure) : process.env.SMTP_SECURE !== 'false';
  const fromName = custom?.fromName || process.env.SMTP_FROM_NAME || 'Groundwork';
  const fromEmail = custom?.fromEmail || process.env.SMTP_FROM_EMAIL || user;
  const pass = getCleanPassword();

  const maskedPass = pass.length > 4 ? `${pass.slice(0, 2)}••••••••${pass.slice(-2)}` : '••••••••';

  return {
    host,
    port,
    secure,
    user,
    fromName,
    fromEmail,
    isConfigured: Boolean(user && pass),
    maskedPass,
  };
}

export function saveSmtpConfig(updates: {
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
  host?: string;
  port?: number;
  secure?: boolean;
}) {
  const existing = loadCustomConfigFile() || {};
  const merged = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const dataDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (fsErr) {
    console.warn('[Nodemailer] Could not persist smtp_config.json to disk (read-only filesystem on serverless):', fsErr);
  }

  // Also attempt to update .env / .env.local if present locally for consistency
  try {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
    ];
    for (const ep of envPaths) {
      if (fs.existsSync(ep)) {
        let content = fs.readFileSync(ep, 'utf-8');
        if (updates.user) {
          content = content.replace(/^SMTP_USER=.*$/m, `SMTP_USER=${updates.user}`);
        }
        if (updates.pass) {
          const cleanP = updates.pass.replace(/["']/g, '').replace(/\s+/g, '');
          content = content.replace(/^SMTP_PASS=.*$/m, `SMTP_PASS="${cleanP}"`);
        }
        if (updates.fromName) {
          content = content.replace(/^SMTP_FROM_NAME=.*$/m, `SMTP_FROM_NAME="${updates.fromName}"`);
        }
        if (updates.fromEmail) {
          content = content.replace(/^SMTP_FROM_EMAIL=.*$/m, `SMTP_FROM_EMAIL=${updates.fromEmail}`);
        }
        fs.writeFileSync(ep, content, 'utf-8');
      }
    }
  } catch (e) {
    // Non-fatal if env files are read-only
  }

  return getSmtpConfig();
}

export function getNodemailerTransporter(overridePass?: string, overrideUser?: string) {
  const config = getSmtpConfig();
  const pass = overridePass ? overridePass.replace(/["']/g, '').replace(/\s+/g, '') : getCleanPassword();
  const user = overrideUser || config.user;

  return nodemailer.createTransport({
    service: 'gmail', // Gmail service automatically handles smtp.gmail.com with SSL/TLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Helps avoid corporate/proxy certificate rejections
    },
  });
}

function parseSmtpError(error: any): string {
  const rawMsg = error?.message || 'Failed to authenticate with SMTP server.';
  if (rawMsg.includes('535') || rawMsg.includes('BadCredentials') || rawMsg.includes('Username and Password not accepted')) {
    return 'Invalid login: Google rejected the credentials (535 Bad Credentials). Your 16-character Google App Password has expired, was revoked, or is incorrect. Please generate a new App Password at https://myaccount.google.com/apppasswords and save it.';
  }
  return rawMsg;
}

export async function verifySmtpConnection(testPass?: string, testUser?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = getNodemailerTransporter(testPass, testUser);
    await transporter.verify();
    return {
      ok: true,
      message: 'SMTP connection established and authenticated successfully with Gmail.',
    };
  } catch (error: any) {
    console.error('Nodemailer verification error:', error);
    return {
      ok: false,
      message: parseSmtpError(error),
    };
  }
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getSmtpConfig();
    const transporter = getNodemailerTransporter();

    const senderName = options.fromName || config.fromName;
    const senderEmail = options.fromEmail || config.fromEmail;

    const fromAddress = `"${senderName}" <${senderEmail}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, ' '),
      replyTo: options.replyTo || senderEmail,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: parseSmtpError(error),
    };
  }
}
