import { NextResponse } from 'next/server';
import { getTemplateByIdOrSlug, updateTemplate, deleteTemplate, resetTemplateToDefault } from '@/lib/email-store';
import { extractVariables } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const template = await getTemplateByIdOrSlug(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (body.action === 'reset') {
      const reset = await resetTemplateToDefault(id);
      if (!reset) {
        return NextResponse.json({ error: 'Cannot reset non-default template' }, { status: 400 });
      }
      return NextResponse.json({ template: reset });
    }

    const current = await getTemplateByIdOrSlug(id);
    if (!current) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const combinedText = `${body.subject || current.subject} ${body.body_html || current.body_html} ${body.body_text || current.body_text || ''}`;
    const autoVariables = extractVariables(combinedText);
    const variables = Array.from(new Set([...(body.variables || current.variables || []), ...autoVariables]));

    const updated = await updateTemplate(id, {
      ...body,
      variables,
    });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const success = await deleteTemplate(id);

    if (!success) {
      return NextResponse.json({ error: 'Template not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
