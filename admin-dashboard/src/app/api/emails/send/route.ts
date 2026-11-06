import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/nodemailer';
import { logEmailSend, getTemplateByIdOrSlug } from '@/lib/email-store';
import { substituteVariables } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      subject,
      html,
      text,
      variables = {},
      templateId,
      templateName,
      fromName,
      fromEmail,
      replyTo,
    } = body;

    // Extract recipients first from either body.recipients or body.to
    const rawRecipients: Array<{ email: string; name?: string; variables?: Record<string, string> }> = [];

    if (Array.isArray(body.recipients)) {
      body.recipients.forEach((item: any) => {
        if (typeof item === 'string' && item.trim()) {
          rawRecipients.push({ email: item.trim() });
        } else if (item && typeof item === 'object' && item.email) {
          rawRecipients.push({
            email: String(item.email).trim(),
            name: item.name ? String(item.name).trim() : undefined,
            variables: item.variables || {},
          });
        }
      });
    } else if (Array.isArray(to)) {
      to.forEach((item: any) => {
        if (typeof item === 'string' && item.trim()) {
          rawRecipients.push({ email: item.trim() });
        } else if (item && typeof item === 'object' && item.email) {
          rawRecipients.push({
            email: String(item.email).trim(),
            name: item.name ? String(item.name).trim() : undefined,
            variables: item.variables || {},
          });
        }
      });
    } else if (typeof to === 'string') {
      const parts = to.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.length > 0 && s.includes('@'));
      if (parts.length > 0) {
        parts.forEach((email) => rawRecipients.push({ email }));
      } else {
        rawRecipients.push({ email: to.trim() });
      }
    }

    if (rawRecipients.length === 0) {
      return NextResponse.json({ error: 'At least one valid recipient email is required.' }, { status: 400 });
    }

    // Resolve subject and html (with template fallback if omitted)
    let finalSubject = subject;
    let finalHtml = html;
    let resolvedTemplateName = templateName;

    if ((!finalSubject || !finalHtml) && templateId) {
      const tpl = await getTemplateByIdOrSlug(templateId);
      if (tpl) {
        if (!finalSubject) finalSubject = tpl.subject;
        if (!finalHtml) finalHtml = tpl.body_html;
        if (!resolvedTemplateName) resolvedTemplateName = tpl.name;
      }
    }

    if (!finalSubject) {
      return NextResponse.json({ error: 'Email subject is required.' }, { status: 400 });
    }
    if (!finalHtml) {
      return NextResponse.json({ error: 'Email body HTML is required.' }, { status: 400 });
    }

    // Auto-normalize relative links in HTML to absolute https://barok-labs.pro.et URLs
    finalHtml = finalHtml
      .replace(/href="\/([^"]*)"/g, 'href="https://barok-labs.pro.et/$1"')
      .replace(/href='\/([^']*)'/g, "href='https://barok-labs.pro.et/$1'");

    // Auto-normalize action_url in variables
    const normalizedVariables: Record<string, string> = { ...variables };
    if (normalizedVariables.action_url) {
      const url = String(normalizedVariables.action_url).trim();
      if (url.startsWith('/')) {
        normalizedVariables.action_url = `https://barok-labs.pro.et${url}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        normalizedVariables.action_url = `https://${url}`;
      }
    } else {
      normalizedVariables.action_url = 'https://barok-labs.pro.et/open.html';
    }

    // Deduplicate recipients by email
    const seen = new Set<string>();
    const recipients = rawRecipients.filter((r) => {
      const lower = r.email.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    const isBulk = recipients.length > 1;

    // 1. Single recipient flow
    if (!isBulk) {
      const target = recipients[0];
      const mergedVars = {
        ...normalizedVariables,
        ...(target.name ? { user_name: target.name } : {}),
        ...(target.variables || {}),
      };

      const compiledSubject = substituteVariables(finalSubject, mergedVars);
      const compiledHtml = substituteVariables(finalHtml, mergedVars);
      const compiledText = text
        ? substituteVariables(text, mergedVars)
        : compiledHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const result = await sendEmail({
        to: target.email,
        subject: compiledSubject,
        html: compiledHtml,
        text: compiledText,
        fromName,
        fromEmail,
        replyTo,
      });

      const logEntry = await logEmailSend({
        template_id: templateId || undefined,
        template_name: templateName || undefined,
        recipient: target.email,
        subject: compiledSubject,
        status: result.success ? 'sent' : 'failed',
        error: result.error,
        message_id: result.messageId,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to send email via SMTP',
            log: logEntry,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        isBulk: false,
        messageId: result.messageId,
        recipient: target.email,
        subject: compiledSubject,
        log: logEntry,
      });
    }

    // 2. Bulk recipients flow (Individual personalized delivery)
    let sentCount = 0;
    let failedCount = 0;
    const batchLogs: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const target = recipients[i];
      const mergedVars = {
        ...normalizedVariables,
        ...(target.name ? { user_name: target.name } : {}),
        ...(target.variables || {}),
      };

      const compiledSubject = substituteVariables(finalSubject, mergedVars);
      const compiledHtml = substituteVariables(finalHtml, mergedVars);
      const compiledText = text
        ? substituteVariables(text, mergedVars)
        : compiledHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      try {
        const result = await sendEmail({
          to: target.email,
          subject: compiledSubject,
          html: compiledHtml,
          text: compiledText,
          fromName,
          fromEmail,
          replyTo,
        });

        const logEntry = await logEmailSend({
          template_id: templateId || undefined,
          template_name: templateName || undefined,
          recipient: target.email,
          subject: compiledSubject,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
          message_id: result.messageId,
        });

        batchLogs.push(logEntry);

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`${target.email}: ${result.error || 'SMTP Error'}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`${target.email}: ${err.message || 'Send exception'}`);
      }

      // Small throttling delay between SMTP deliveries (100ms)
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: sentCount > 0,
      isBulk: true,
      sentCount,
      failedCount,
      total: recipients.length,
      errors: errors.slice(0, 5),
      logsCount: batchLogs.length,
    });
  } catch (error: any) {
    console.error('API /api/emails/send error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while sending email.' },
      { status: 500 }
    );
  }
}
