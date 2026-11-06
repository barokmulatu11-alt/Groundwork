async function test() {
  const url = 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
  const signInRes = await fetch(url + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const cookies = signInRes.headers.get('set-cookie');
  const tokenRes = await fetch(url + '/token', {
    method: 'GET',
    headers: { 'Origin': 'http://localhost:8081', Cookie: cookies },
  });
  const { token } = await tokenRes.json();
  console.log('Got real JWT:', token.slice(0, 30) + '...');

  const postgrestUrl = 'https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1/tasks?select=*&limit=2';
  const r1 = await fetch(postgrestUrl, {
    headers: { 'Authorization': 'Bearer ' + token, 'apikey': token }
  });
  console.log('PostgREST status with fresh token:', r1.status);
  const data = await r1.json();
  console.log('Data:', data);
}
test().catch(console.error);
