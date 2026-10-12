'use strict';
/**
 * test_preflight.js
 *
 * Runs mocked preflight tests.
 */
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
process.env.NEON_DATABASE_URL = 'postgres://mock:mock@mock/mock';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://mock';

const pg = require('pg');
const supabase = require('@supabase/supabase-js');

let mockOpts = {};

pg.Client = class MockClient {
  constructor() {}
  async connect() {}
  async end() {}
  async query(sql, params) {
    if (sql.includes('SELECT table_schema, table_name')) {
      return { rows: [
        { table_name: 'user', table_schema: 'public' },
        { table_name: 'account', table_schema: 'public' }
      ] };
    }
    if (sql.includes('SELECT to_regclass')) {
      if (mockOpts.missingTables) {
        return { rows: [{ exists: null }] };
      }
      return { rows: [{ exists: 'public."table"' }] };
    }
    return { rows: [] };
  }
};

supabase.createClient = () => ({
  auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'u1' }] }, error: null }) } },
  storage: { from: () => ({
    list: async () => ({ data: mockOpts.hasFiles ? [{ name: 'file.jpg', id: '123', metadata: { mimetype: 'image/jpeg' } }] : [] })
  }) },
  from: () => ({
    select: () => ({ count: 10, error: null })
  })
});

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === '@aws-sdk/client-s3') {
    return {
      S3Client: class {
        send() {
          if (process.env.AWS_ACCESS_KEY_ID === 'valid') return { Buckets: [{ Name: 'uploads' }] };
          throw new Error('Invalid S3');
        }
      },
      ListBucketsCommand: class {}
    };
  }
  return origRequire.apply(this, arguments);
};

const { runPreflight } = require('../scripts/preflight_migration');

let passed = 0, failed = 0;
function assert(condition, label) {
  if (condition) {
    process.stdout.write(`  ✔ ${label}\n`);
    passed++;
  } else {
    process.stderr.write(`  ✗ ${label}\n`);
    failed++;
  }
}

async function runMocked(opts) {
  mockOpts = opts;
  let exitCode = 0;
  const origExit = process.exit;
  const origError = console.error;
  const origLog = console.log;
  const origWarn = console.warn;
  
  process.exit = (code) => { exitCode = code || 0; };
  console.error = () => {};
  console.log = () => {};
  console.warn = () => {};

  try {
    await runPreflight();
  } catch (e) {
    // If runPreflight throws, we might not catch it if process.exit was called inside it,
    // but runPreflight doesn't throw, it calls process.exit(1).
  }
  process.exit = origExit;
  console.error = origError;
  console.log = origLog;
  console.warn = origWarn;
  
  return exitCode;
}

async function main() {
  console.log('\n--- Preflight Regression Tests ---');

  // Test 1: Successful inspection
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://mock';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
  process.env.NEON_DATABASE_URL = 'postgres://mock:mock@mock/mock';
  process.env.NEON_MIGRATION_JWT = 'valid';
  let code = await runMocked({ hasFiles: false });
  assert(code === 0, 'successful inspection exits with 0', code);

  // Test 2: Missing configuration
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  code = await runMocked({ hasFiles: false });
  assert(code === 1, 'missing credentials exits with 1');

  // Test 3: Missing tables
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
  code = await runMocked({ hasFiles: false, missingTables: true });
  assert(code === 1, 'missing application tables exits with 1');

  // Test 4: Unresolved storage permissions
  process.env.NEON_MIGRATION_JWT = 'valid';
  code = await runMocked({ hasFiles: true, missingTables: false });
  // Since we changed it to block if JWT is present but rights are unknown
  assert(code === 1, 'unverified storage permissions block success (exits with 1)');

  if (failed > 0) process.exit(1);
}

main();
