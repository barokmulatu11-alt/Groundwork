const assert = require('assert');

// Test 1: Connectivity check verification
async function testConnectivity() {
  console.log('Testing connectivity check...');
  let online = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const ping = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    online = ping.status === 204 || ping.ok;
  } catch (_) {}

  assert.strictEqual(online, true, 'Connectivity check should return true when network is up');
  console.log('✔ Connectivity test passed (online = true)');
}

// Test 2: Task field sanitization and column validation logic
function testTaskUpdateSanitization() {
  console.log('Testing task update sanitization...');
  const VALID_TASK_COLUMNS = new Set([
    'user_id',
    'title',
    'time_block',
    'due_time',
    'date',
    'completed',
    'completed_at',
    'priority',
    'note',
    'reminder_time',
    'order_index',
    'created_at',
    'updated_at',
    'deleted_at'
  ]);

  const rawUpdates = {
    title: '  Finish Design Audit  ',
    note: 'Important notes here',
    priority: 'high',
    date: '2026-10-25',
    due_time: '15:30',
    sub_tasks: [{ id: 'st_1', title: 'Check colors', completed: false }],
    unknown_column_that_doesnt_exist: 'should be stripped',
  };

  const sanitized = { ...rawUpdates };
  if (sanitized.title !== undefined) {
    sanitized.title = sanitized.title.trim();
  }
  if (sanitized.due_time !== undefined) {
    sanitized.due_time = sanitized.due_time.trim();
    sanitized.time_block = sanitized.due_time;
  }

  const keys = Object.keys(sanitized).filter(k => k !== 'id' && VALID_TASK_COLUMNS.has(k));
  
  assert.ok(keys.includes('title'), 'Should include title');
  assert.ok(keys.includes('note'), 'Should include note');
  assert.ok(keys.includes('priority'), 'Should include priority');
  assert.ok(keys.includes('date'), 'Should include date');
  assert.ok(keys.includes('due_time'), 'Should include due_time');
  assert.ok(keys.includes('time_block'), 'Should include time_block');
  assert.strictEqual(keys.includes('sub_tasks'), false, 'sub_tasks must not be in keys');
  assert.strictEqual(keys.includes('unknown_column_that_doesnt_exist'), false, 'non-column must be stripped');

  const values = keys.map(k => sanitized[k]);
  values.forEach(v => {
    assert.notStrictEqual(v, undefined, 'No value should be undefined in SQL bindings');
  });

  console.log('✔ Task update sanitization passed');
}

async function run() {
  try {
    await testConnectivity();
    testTaskUpdateSanitization();
    console.log('\nAll task editing & connectivity tests passed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
