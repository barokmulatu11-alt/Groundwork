import defaultTemplates from '@/data/default-email-templates.json';
import { EmailTemplate, EmailLog } from '@/lib/email-templates';
import { queryNeon } from '@/lib/neon-db';

/**
 * In-memory cache for fast reads and cold-start fallback
 */
let inMemoryTemplates: EmailTemplate[] = (defaultTemplates as any[]).map((t) => ({
  ...t,
  variables: Array.isArray(t.variables) ? t.variables : [],
  is_default: Boolean(t.is_default),
  created_at: t.created_at || new Date().toISOString(),
  updated_at: t.updated_at || new Date().toISOString(),
}));

let inMemoryLogs: EmailLog[] = [];

/**
 * Get all email templates from Neon PostgreSQL (with in-memory fallback)
 */
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  try {
    const rows = await queryNeon<any>(
      'SELECT id, slug, name, category, description, subject, body_html, body_text, variables, is_default, created_at, updated_at FROM public.email_templates ORDER BY is_default DESC, name ASC'
    );

    if (rows && rows.length > 0) {
      const templates: EmailTemplate[] = rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        category: (r.category || 'custom') as any,
        description: r.description ? String(r.description) : '',
        subject: String(r.subject || ''),
        body_html: String(r.body_html || ''),
        body_text: String(r.body_text || ''),
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : (r.variables || []),
        is_default: Boolean(r.is_default),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      inMemoryTemplates = templates;
      return templates;
    }
  } catch (err: any) {
    console.warn('[email-store] Failed to fetch templates from Neon, using fallback:', err?.message);
  }

  return inMemoryTemplates;
}

/**
 * Find template by ID or slug
 */
export async function getTemplateByIdOrSlug(idOrSlug: string): Promise<EmailTemplate | null> {
  try {
    const rows = await queryNeon<any>(
      'SELECT id, slug, name, category, description, subject, body_html, body_text, variables, is_default, created_at, updated_at FROM public.email_templates WHERE id = $1 OR slug = $1 LIMIT 1',
      [idOrSlug]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        category: (r.category || 'custom') as any,
        description: r.description ? String(r.description) : '',
        subject: String(r.subject || ''),
        body_html: String(r.body_html || ''),
        body_text: String(r.body_text || ''),
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : (r.variables || []),
        is_default: Boolean(r.is_default),
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.warn('[email-store] DB lookup failed, falling back to cache:', err?.message);
  }

  const cached = inMemoryTemplates.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
  return cached || null;
}

/**
 * Create or save a new template
 */
export async function createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const id = data.id || `tpl_${Date.now()}`;
  const slug =
    data.slug ||
    (data.name || 'custom-template')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const newTemplate: EmailTemplate = {
    id,
    slug,
    name: data.name || 'Untitled Template',
    category: data.category || 'custom',
    description: data.description || '',
    subject: data.subject || 'Groundwork Notification',
    body_html: data.body_html || '<p>Hello {{user_name}},</p>',
    body_text: data.body_text || 'Hello {{user_name}},',
    variables: data.variables || ['user_name', 'action_url', 'app_name', 'year'],
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await queryNeon(
      `INSERT INTO public.email_templates (id, slug, name, category, description, subject, body_html, body_text, variables, is_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         subject = EXCLUDED.subject,
         body_html = EXCLUDED.body_html,
         body_text = EXCLUDED.body_text,
         variables = EXCLUDED.variables,
         updated_at = now()`,
      [
        newTemplate.id,
        newTemplate.slug,
        newTemplate.name,
        newTemplate.category,
        newTemplate.description,
        newTemplate.subject,
        newTemplate.body_html,
        newTemplate.body_text,
        JSON.stringify(newTemplate.variables),
        newTemplate.is_default,
      ]
    );
  } catch (err: any) {
    console.error('[email-store] DB insert error:', err?.message);
  }

  // Update in-memory list
  inMemoryTemplates = [newTemplate, ...inMemoryTemplates.filter((t) => t.id !== id)];
  return newTemplate;
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
  const current = await getTemplateByIdOrSlug(id);
  if (!current) return null;

  const updated: EmailTemplate = {
    ...current,
    ...updates,
    id, // Prevent modifying ID
    updated_at: new Date().toISOString(),
  };

  try {
    await queryNeon(
      `INSERT INTO public.email_templates (id, slug, name, category, description, subject, body_html, body_text, variables, is_default, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         subject = EXCLUDED.subject,
         body_html = EXCLUDED.body_html,
         body_text = EXCLUDED.body_text,
         variables = EXCLUDED.variables,
         updated_at = now()`,
      [
        updated.id,
        updated.slug,
        updated.name,
        updated.category,
        updated.description,
        updated.subject,
        updated.body_html,
        updated.body_text,
        JSON.stringify(updated.variables),
        updated.is_default,
      ]
    );
  } catch (err: any) {
    console.error('[email-store] DB update error:', err?.message);
  }

  // Update in-memory cache
  const idx = inMemoryTemplates.findIndex((t) => t.id === id);
  if (idx !== -1) {
    inMemoryTemplates[idx] = updated;
  } else {
    inMemoryTemplates.push(updated);
  }

  return updated;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    await queryNeon('DELETE FROM public.email_templates WHERE id = $1', [id]);
  } catch (err: any) {
    console.error('[email-store] DB delete error:', err?.message);
  }

  inMemoryTemplates = inMemoryTemplates.filter((t) => t.id !== id);
  return true;
}

/**
 * Reset a default template back to original code
 */
export async function resetTemplateToDefault(id: string): Promise<EmailTemplate | null> {
  const original = (defaultTemplates as any[]).find((t) => t.id === id);
  if (!original) return null;

  return updateTemplate(id, {
    ...original,
    updated_at: new Date().toISOString(),
  } as EmailTemplate);
}

/**
 * Log an email send attempt in Neon
 */
export async function logEmailSend(logData: {
  template_id?: string;
  template_name?: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  message_id?: string;
}): Promise<EmailLog> {
  const logEntry: EmailLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    template_id: logData.template_id,
    template_name: logData.template_name,
    recipient: logData.recipient,
    subject: logData.subject,
    status: logData.status,
    error: logData.error,
    message_id: logData.message_id,
    sent_at: new Date().toISOString(),
  };

  try {
    await queryNeon(
      `INSERT INTO public.email_logs (id, template_id, template_name, recipient, subject, status, error, message_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [
        logEntry.id,
        logEntry.template_id || null,
        logEntry.template_name || null,
        logEntry.recipient,
        logEntry.subject,
        logEntry.status,
        logEntry.error || null,
        logEntry.message_id || null,
      ]
    );
  } catch (err: any) {
    console.warn('[email-store] Failed to write log to Neon:', err?.message);
  }

  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > 200) inMemoryLogs = inMemoryLogs.slice(0, 200);

  return logEntry;
}

/**
 * Get all email logs
 */
export async function getEmailLogs(): Promise<EmailLog[]> {
  try {
    const rows = await queryNeon<any>(
      'SELECT id, template_id, template_name, recipient, subject, status, error, message_id, sent_at FROM public.email_logs ORDER BY sent_at DESC LIMIT 200'
    );

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: String(r.id),
        template_id: r.template_id ? String(r.template_id) : undefined,
        template_name: r.template_name ? String(r.template_name) : undefined,
        recipient: String(r.recipient),
        subject: String(r.subject),
        status: (r.status === 'sent' ? 'sent' : 'failed') as any,
        error: r.error ? String(r.error) : undefined,
        message_id: r.message_id ? String(r.message_id) : undefined,
        sent_at: r.sent_at ? new Date(r.sent_at).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (err: any) {
    console.warn('[email-store] Failed to fetch logs from Neon:', err?.message);
  }

  return inMemoryLogs;
}

/**
 * Clear all email logs
 */
export async function clearEmailLogs(): Promise<boolean> {
  try {
    await queryNeon('DELETE FROM public.email_logs');
    inMemoryLogs = [];
    return true;
  } catch (err: any) {
    console.warn('[email-store] Failed to clear logs:', err?.message);
    return false;
  }
}
