const { neonAuth, persistSessionToken } = require('./lib/neon');

async function test() {
  console.log('Testing signIn.email...');
  const res = await neonAuth.signIn.email({
    email: 'barok.m.lakew@gmail.com',
    password: 'Password123!' // or whatever test password
  });
  console.log('signIn result error:', res.error);
  console.log('signIn result data:', res.data ? 'got data' : 'null');
  if (res.data) {
    console.log('user:', res.data.user);
    console.log('session:', res.data.session);
    console.log('Now testing getSession()...');
    const sess = await neonAuth.getSession();
    console.log('getSession data:', sess.data);
  }
}
test().catch(console.error);
