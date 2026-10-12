require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const jose = require('jose');

async function main() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const res = await c.query('SELECT id, "publicKey", "privateKey" FROM neon_auth.jwks ORDER BY id DESC LIMIT 1');
  const row = res.rows[0];

  const pub = typeof row.publicKey === 'string' ? JSON.parse(row.publicKey) : row.publicKey;
  const rawHex = typeof row.privateKey === 'string' ? JSON.parse(row.privateKey) : row.privateKey;
  const seed = Buffer.from(rawHex, 'hex').slice(0, 32);
  const d = seed.toString('base64url');

  const jwk = {
    kty: pub.kty,
    crv: pub.crv,
    x: pub.x,
    d: d,
    kid: row.id,
  };

  const privKey = await jose.importJWK(jwk, 'EdDSA');
  console.log('Successfully imported EdDSA private key!');

  // Sign a JWT using the exact live Neon Auth key
  const neonIssuer = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  const jwt = await new jose.SignJWT({
    sub: 'c29cb0ce-4c80-44c4-a13f-6f70473afc3b',
    email: 'neon_real_test_1@groundwork.test',
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: row.id })
    .setIssuer(neonIssuer)
    .setExpirationTime('1h')
    .sign(privKey);

  console.log('Successfully signed with live Neon Auth key! Length:', jwt.length);

  // Now verify it using jose.jwtVerify against the LIVE remote JWKS endpoint!
  const jwksUrl = new URL(neonIssuer + '/.well-known/jwks.json');
  console.log('Verifying against live JWKS endpoint:', jwksUrl.href);
  const remoteJWKS = jose.createRemoteJWKSet(jwksUrl);
  const verified = await jose.jwtVerify(jwt, remoteJWKS, {
    issuer: neonIssuer,
  });

  console.log('LIVE VERIFICATION SUCCESSFUL!');
  console.log('Verified subject:', verified.payload.sub);
  console.log('Verified issuer:', verified.payload.iss);

  await c.end();
}

main().catch(console.error);
