const fetch = require('node-fetch');

const NEON_AUTH_URL = 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
const NEON_API_URL = 'https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1';

async function main() {
  console.log('=== FULL SYNC FLOW VERIFICATION ===');
  
  // 1. Sign in as test user
  console.log('\n1. Signing in via email & password...');
  const signInRes = await fetch(NEON_AUTH_URL + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const cookies = signInRes.headers.get('set-cookie');
  console.log('Sign in status:', signInRes.status);

  // 2. Obtain authenticated JWT
  console.log('\n2. Retrieving authenticated JWT with cookie...');
  const tokenRes = await fetch(NEON_AUTH_URL + '/token', {
    headers: { Origin: 'http://localhost:8081', Cookie: cookies },
  });
  const { token: jwt } = await tokenRes.json();
  console.log('Token status:', tokenRes.status);
  
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
  console.log('JWT verified claims:');
  console.log('  user id:', payload.sub);
  console.log('  role:', payload.role);
  console.log('  email:', payload.email);
  const userId = payload.sub;

  const authHeaders = {
    Authorization: `Bearer ${jwt}`,
    apikey: jwt,
    'Content-Type': 'application/json',
  };

  // 3. PULL (Retrieve cloud data for all sync tables)
  console.log('\n3. Testing PULL from cloud (simulating useStore.syncData)...');
  const syncTables = [
    'tasks',
    'habits',
    'notes',
    'focus_sessions',
    'day_notes',
    'sub_tasks',
    'user_settings',
  ];

  for (const table of syncTables) {
    const res = await fetch(`${NEON_API_URL}/${table}?user_id=eq.${userId}`, {
      headers: authHeaders,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ Table ${table} PULL failed (${res.status}): ${text}`);
      process.exit(1);
    }
    const data = JSON.parse(text);
    console.log(`✔ ${table.padEnd(16)}: status 200, count = ${data.length}`);
  }

  // 4. PUSH (Simulate pushToCloud for tasks, habits, notes, focus_sessions, day_notes)
  console.log('\n4. Testing PUSH to cloud (simulating pushToCloud)...');
  const now = new Date().toISOString();
  const testItems = [
    {
      table: 'tasks',
      body: {
        id: `sync_test_task_${Date.now()}`,
        user_id: userId,
        title: 'Cloud Sync Verified Task',
        date: now.split('T')[0],
        completed: false,
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'habits',
      body: {
        id: `sync_test_habit_${Date.now()}`,
        user_id: userId,
        title: 'Daily Meditation',
        frequency: 'daily',
        streak: 3,
        best_streak: 5,
        dates_completed: '[]',
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'notes',
      body: {
        id: `sync_test_note_${Date.now()}`,
        user_id: userId,
        title: 'Meeting Notes',
        content: 'Sync between devices verified.',
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'focus_sessions',
      body: {
        id: `sync_test_focus_${Date.now()}`,
        user_id: userId,
        duration_minutes: 25,
        started_at: now,
        completed_at: now,
        mode: 'Focus',
        date: now.split('T')[0],
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'day_notes',
      body: {
        id: `sync_test_daynote_${Date.now()}`,
        user_id: userId,
        date: now.split('T')[0],
        note_text: 'Device sync active and working.',
        created_at: now,
        updated_at: now,
      },
    },
  ];

  for (const item of testItems) {
    const postRes = await fetch(`${NEON_API_URL}/${item.table}`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(item.body),
    });
    const postText = await postRes.text();
    if (!postRes.ok) {
      console.error(`❌ Table ${item.table} PUSH failed (${postRes.status}): ${postText}`);
      process.exit(1);
    }
    console.log(`✔ PUSH ${item.table.padEnd(14)}: status ${postRes.status}`);

    // Clean up
    await fetch(`${NEON_API_URL}/${item.table}?id=eq.${item.body.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
  }

  console.log('\n=============================================');
  console.log('🎉 ALL SYNC PULL AND PUSH CHECKS PASSED 100%!');
  console.log('=============================================');
}

main().catch(console.error);
