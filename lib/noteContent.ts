// Utilities for handling note content that may include HTML (e.g. from rich text editors).

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&#x27;/g, (m) => ENTITY_MAP[m] ?? m);
}

export function looksLikeHtml(input: string): boolean {
  if (!input) return false;
  // Quick heuristic: tags or common entities.
  return /<\/?[a-z][\s\S]*>/i.test(input) || /&nbsp;|&lt;|&gt;|&amp;|&quot;|&#39;|&#x27;/.test(input);
}

export function htmlToPlainText(html: string): string {
  let t = html ?? '';

  // Remove invisible BOM / zero-width chars that can sneak into persisted text.
  t = t.replace(/\uFEFF/g, '').replace(/[\u200B-\u200D\u2060]/g, '');

  // Normalize line breaks and convert common block separators to newlines.
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(div|p|h[1-6])>/gi, '\n');
  t = t.replace(/<(div|p|h[1-6])[^>]*>/gi, '');

  // Lists
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<li[^>]*>/gi, '• ');
  t = t.replace(/<\/?(ul|ol)[^>]*>/gi, '');

  // Strip any remaining tags
  t = t.replace(/<[^>]+>/g, '');

  // Decode common entities (e.g. &nbsp;)
  t = decodeHtmlEntities(t);

  // Some editors insert a leading "|" caret marker; remove if it's the first visible char.
  t = t.replace(/^\s*\|\s*/, '');

  // Clean up whitespace
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

/**
 * Normalizes note content for editing/display in a plain TextInput.
 * If it looks like HTML, converts it to plain text; otherwise returns as-is (trim not applied).
 */
export function normalizeNoteContent(input: string): string {
  if (!looksLikeHtml(input)) return input ?? '';
  return htmlToPlainText(input);
}

