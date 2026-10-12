'use strict';
/**
 * test_orchestration.js
 *
 * Runs mocked orchestration tests.
 */
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
process.env.NEON_DATABASE_URL = 'postgres://mock:mock@mock/mock';
process.env.EXPO_PUBLIC_NEON_AUTH_URL = 'http://mockauth';

const pg = require('pg');
const supabase = require('@supabase/supabase-js');

// Must mock BEFORE require so destructured imports get the mock
let queryLog = [];
let mockOpts = {};

pg.Client = class MockClient {
  constructor() {}
  async connect() {}
  async end() {}
  async query(sql, params) {
    queryLog.push({ sql, params });
    
    if (sql.includes('SELECT table_schema, table_name')) {
      return { rows: [
        { table_name: 'user', table_schema: mockOpts.authSchema || 'public' },
        { table_name: 'account', table_schema: mockOpts.authSchema || 'public' }
      ] };
    }
    if (sql.includes('SELECT column_name, data_type')) {
      return { rows: [
        { column_name: 'id', data_type: 'text' },
        { column_name: 'email', data_type: 'text' }
      ] };
    }
    if (sql.includes('SELECT kcu.column_name')) {
      return { rows: [{ column_name: 'id' }] };
    }
    if (sql.includes('SELECT * FROM public.')) {
      if (mockOpts.mismatchValues) {
        return { rows: [{ id: '1', email: 'mismatch' }] };
      }
      return { rows: [{ id: '1', email: 'a@b.com' }] };
    }
    if (sql.includes('INSERT INTO')) {
      return { rowCount: 1 };
    }
    if (sql.includes('SAVEPOINT') || sql.includes('RELEASE') || sql.includes('ROLLBACK') || sql.includes('BEGIN') || sql.includes('COMMIT')) {
      return {};
    }
    return { rows: [] };
  }
};

supabase.createClient = () => ({
  auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'u1', email: 'a@b.com' }] }, error: null }) } },
  storage: { from: () => ({
    list: async () => ({ data: mockOpts.hasFiles ? [{ name: 'file.jpg', id: '123', metadata: { mimetype: 'image/jpeg' } }] : [] }),
    download: async () => ({ data: { arrayBuffer: async () => new ArrayBuffer(0), type: 'image/jpeg' } })
  }) },
  from: () => ({
    select: () => ({
      range: async () => {
        return { data: [{ id: '1', email: 'a@b.com' }], error: null };
      }
    })
  })
});

global.fetch = async (url) => ({
  ok: true, status: 200, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0)
});

const { runMigration } = require('../scripts/migrate_supabase_to_neon');

let passed = 0, failed = 0;
function assert(condition, label, detail) {
  if (condition) {
    process.stdout.write(`  ✔ ${label}\n`);
    passed++;
  } else {
    process.stderr.write(`  ✗ ${label}\n`);
    if (detail) process.stderr.write(`    ${detail}\n`);
    failed++;
  }
}

async function runMocked(opts) {
  mockOpts = opts;
  queryLog.length = 0;

  let err = null;
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = () => {}; console.warn = () => {};
  try {
    await runMigration();
  } catch (e) {
    err = e;
  }
  console.log = origLog; console.warn = origWarn;
  return { err, queryLog: [...queryLog] };
}

async function main() {
  console.log('\n--- Orchestration Regression Tests ---');

  // Test 1: Missing storage credentials with existing files blocks success
  process.env.NEON_MIGRATION_JWT = '';
  let res = await runMocked({ hasFiles: true });
  assert(res.err && res.err.message.includes('NEON_MIGRATION_JWT'), 
    'orchestration throws when storage files exist but JWT is missing',
    res.err ? `Actual error: ${res.err.message}` : 'Did not throw');

  // Test 2: Auth tables outside public
  process.env.NEON_MIGRATION_JWT = 'valid';
  res = await runMocked({ hasFiles: false, authSchema: 'custom_auth' });
  const usedCustomAuthInsert = res.queryLog.some(q => q.sql.includes('custom_auth"."user"'));
  const passedSchemaToCols = res.queryLog.some(q => q.sql.includes('SELECT column_name, data_type') && q.params && q.params[0] === 'custom_auth');
  const passedSchemaToPKs = res.queryLog.some(q => q.sql.includes('SELECT kcu.column_name') && q.params && q.params[0] === 'custom_auth');
  
  assert(res.err === null, 'orchestration completes successfully without errors for non-public auth schema');
  assert(usedCustomAuthInsert, 'orchestration inserts into non-public auth schema when discovered');
  assert(passedSchemaToCols && passedSchemaToPKs, 'orchestration passes discovered auth schema to introspection queries as parameter');

  // Test 3: Matching keys with mismatched values
  res = await runMocked({ hasFiles: false, mismatchValues: true });
  assert(res.err && res.err.message.includes('field values mismatched'), 
    'orchestration fails verification when field values mismatch');

  if (failed > 0) process.exit(1);
}

main();
