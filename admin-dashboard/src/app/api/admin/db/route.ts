import { NextRequest, NextResponse } from 'next/server';
import { getNeonPool } from '@/lib/neon-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    if (!table) {
      return NextResponse.json({ error: 'Missing table parameter' }, { status: 400 });
    }

    // Sanitize table name against SQL injection
    const cleanTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const pool = getNeonPool();

    const conditions: string[] = [];
    const values: any[] = [];

    // Parse filters
    searchParams.forEach((val, key) => {
      if (['table', 'select', 'order', 'limit', 'offset'].includes(key)) return;
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (val === 'null') {
        conditions.push(`"${cleanKey}" IS NULL`);
      } else {
        values.push(val);
        conditions.push(`"${cleanKey}" = $${values.length}`);
      }
    });

    let sql = `SELECT * FROM "${cleanTable}"`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const order = searchParams.get('order');
    if (order) {
      const parts = order.split('.');
      const col = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
      const dir = parts[1]?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      sql += ` ORDER BY "${col}" ${dir}`;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      const numLimit = parseInt(limit, 10);
      if (!isNaN(numLimit) && numLimit > 0) {
        sql += ` LIMIT ${numLimit}`;
      }
    }

    const res = await pool.query(sql, values);
    return NextResponse.json({ data: res.rows, error: null });
  } catch (error: any) {
    console.error('API /api/admin/db GET error:', error);
    return NextResponse.json({ data: null, error: { message: error.message || 'Database error' } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, data, match } = body;

    if (!table || !data || !match) {
      return NextResponse.json({ error: 'Missing required update parameters' }, { status: 400 });
    }

    const cleanTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const pool = getNeonPool();

    const setClauses: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, val]) => {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      values.push(val);
      setClauses.push(`"${cleanKey}" = $${values.length}`);
    });

    // Auto-update updated_at if it exists
    if (!('updated_at' in data)) {
      setClauses.push(`"updated_at" = NOW()`);
    }

    const whereClauses: string[] = [];
    Object.entries(match).forEach(([key, val]) => {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      values.push(val);
      whereClauses.push(`"${cleanKey}" = $${values.length}`);
    });

    const sql = `UPDATE "${cleanTable}" SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
    const res = await pool.query(sql, values);

    return NextResponse.json({ data: res.rows, error: null });
  } catch (error: any) {
    console.error('API /api/admin/db PATCH error:', error);
    return NextResponse.json({ data: null, error: { message: error.message || 'Update failed' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, data } = body;

    if (!table || !data) {
      return NextResponse.json({ error: 'Missing required insert parameters' }, { status: 400 });
    }

    const cleanTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const pool = getNeonPool();

    const cols: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, val]) => {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      cols.push(`"${cleanKey}"`);
      values.push(val);
      placeholders.push(`$${values.length}`);
    });

    const sql = `INSERT INTO "${cleanTable}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const res = await pool.query(sql, values);

    return NextResponse.json({ data: res.rows[0], error: null });
  } catch (error: any) {
    console.error('API /api/admin/db POST error:', error);
    return NextResponse.json({ data: null, error: { message: error.message || 'Insert failed' } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, match } = body;

    if (!table || !match) {
      return NextResponse.json({ error: 'Missing required delete parameters' }, { status: 400 });
    }

    const cleanTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const pool = getNeonPool();

    const whereClauses: string[] = [];
    const values: any[] = [];

    Object.entries(match).forEach(([key, val]) => {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      values.push(val);
      whereClauses.push(`"${cleanKey}" = $${values.length}`);
    });

    const sql = `DELETE FROM "${cleanTable}" WHERE ${whereClauses.join(' AND ')} RETURNING *`;
    const res = await pool.query(sql, values);

    return NextResponse.json({ data: res.rows, error: null });
  } catch (error: any) {
    console.error('API /api/admin/db DELETE error:', error);
    return NextResponse.json({ data: null, error: { message: error.message || 'Delete failed' } }, { status: 500 });
  }
}
