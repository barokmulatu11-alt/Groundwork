import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const connStr =
  process.env.NEON_DATABASE_URL || '';

const endpoint =
  process.env.NEON_SQL_URL ||
  'https://ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/sql';

function formatParam(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

export function interpolateSql(text: string, params: any[] = []): string {
  if (!params || params.length === 0) return text;
  return text.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    if (idx >= 0 && idx < params.length) {
      return formatParam(params[idx]);
    }
    return match;
  });
}

export async function queryNeon<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const finalSql = interpolateSql(text, params);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connStr,
    },
    body: JSON.stringify({ query: finalSql }),
  });

  const json = await res.json();
  if (json.message) {
    throw new Error(json.message);
  }
  return (json.rows || []) as T[];
}

export function getNeonPool() {
  return {
    query: async (text: string, params: any[] = []) => {
      const rows = await queryNeon(text, params);
      return { rows };
    },
  };
}
