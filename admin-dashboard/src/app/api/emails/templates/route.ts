import { NextResponse } from 'next/server';
import { getAllTemplates, createTemplate } from '@/lib/email-store';
import { extractVariables } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = await getAllTemplates();
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.subject || !body.body_html) {
      return NextResponse.json(
        { error: 'Name, subject, and body_html are required' },
        { status: 400 }
      );
    }

    const autoVariables = extractVariables(`${body.subject} ${body.body_html} ${body.body_text || ''}`);
    const variables = Array.from(new Set([...(body.variables || []), ...autoVariables]));

    const template = await createTemplate({
      name: body.name,
      slug: body.slug,
      category: body.category || 'custom',
      description: body.description || '',
      subject: body.subject,
      body_html: body.body_html,
      body_text: body.body_text || body.body_html.replace(/<[^>]+>/g, ' '),
      variables,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
