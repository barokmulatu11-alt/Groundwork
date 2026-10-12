'use strict';

/**
 * Server-Side Storage Authorization and S3 Signing Service.
 *
 * Rules:
 * 1. S3 secrets stay server-side only.
 * 2. Uses the configured S3 bucket: 'uploads'.
 * 3. Enforces server-side ownership for private recordings ('notes' / 'audio')
 *    and private receipts ('payment-screenshots').
 * 4. Only authenticates via verified cryptographic JWT Bearer tokens from configured
 *    Neon Auth provider (via JWKS). Request-body identities and unverified tokens are strictly rejected.
 * 5. Privileged roles ('admin', 'owner') are strictly derived from trusted database
 *    queries (public.profiles), NEVER from user-controlled token metadata.
 * 6. Rejects unknown bucket names and invalid/traversal object paths.
 * 7. Issues presigned PUT URLs for uploads and presigned GET URLs for downloads.
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const jose = require('jose');
const { Pool } = require('pg');

const S3_BUCKET = 'uploads';
const ALLOWED_BUCKETS = new Set(['notes', 'audio', 'avatars', 'payment-screenshots']);

let defaultPgPool = null;

function getPgPool() {
  if (defaultPgPool) return defaultPgPool;
  const connectionString = process.env.NEON_DATABASE_URL;
  if (connectionString) {
    defaultPgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return defaultPgPool;
}

function getS3Client() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.EXPO_PUBLIC_NEON_S3_ENDPOINT;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-2';

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

// Cached JWKS instance
let currentJwksUrl = null;
let currentJWKS = null;

function getJWKS() {
  const authUrl = process.env.NEON_AUTH_URL || process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  const defaultJwks = authUrl
    ? `${authUrl.replace(/\/+$/, '')}/.well-known/jwks.json`
    : 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json';
  const jwksUri = process.env.NEON_AUTH_JWKS_URL || defaultJwks;

  if (currentJwksUrl !== jwksUri || !currentJWKS) {
    currentJwksUrl = jwksUri;
    currentJWKS = jose.createRemoteJWKSet(new URL(jwksUri));
  }
  return currentJWKS;
}

/**
 * Derives user's privileged role strictly from trusted server-side Postgres storage.
 * User-controlled claims or metadata in tokens are NEVER trusted.
 */
async function getServerSideUserRole(userId, pgClient = null) {
  const clientOrPool = pgClient || getPgPool();
  if (!clientOrPool || !userId) return 'user';

  try {
    const res = await clientOrPool.query('SELECT role FROM public.profiles WHERE id = $1', [userId]);
    const dbRole = res.rows[0]?.role;
    if (dbRole === 'admin' || dbRole === 'owner') {
      return dbRole;
    }
  } catch (err) {
    console.warn('[serverStorage] Role lookup failed:', err.message);
  }
  return 'user';
}

/**
 * Cryptographically verifies JWT signature, expiration, issuer, and audience
 * against the configured Neon Auth provider.
 */
async function verifyCaller(authHeader, pgClient = null) {
  if (!authHeader || typeof authHeader !== 'string') {
    return {
      caller: null,
      error: { status: 401, message: 'Unauthorized: Missing Authorization header.' },
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      caller: null,
      error: { status: 401, message: 'Unauthorized: Invalid Authorization header format. Expected "Bearer <token>".' },
    };
  }

  const token = parts[1].trim();
  if (!token) {
    return {
      caller: null,
      error: { status: 401, message: 'Unauthorized: Bearer token is empty.' },
    };
  }

  const jwks = getJWKS();
  const authUrl = process.env.NEON_AUTH_URL || process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  let expectedIssuer = process.env.NEON_AUTH_ISSUER;
  if (!expectedIssuer && authUrl) {
    try {
      const parsed = new URL(authUrl);
      expectedIssuer = [authUrl, parsed.origin];
    } catch (_) {
      expectedIssuer = authUrl;
    }
  }

  const verifyOptions = {};
  if (expectedIssuer) {
    verifyOptions.issuer = expectedIssuer;
  }
  if (process.env.NEON_AUTH_AUDIENCE) {
    verifyOptions.audience = process.env.NEON_AUTH_AUDIENCE;
  }

  let payload;
  try {
    const result = await jose.jwtVerify(token, jwks, verifyOptions);
    payload = result.payload;
  } catch (err) {
    return {
      caller: null,
      error: { status: 401, message: `Unauthorized: Token verification failed (${err.code || err.message}).` },
    };
  }

  const userId = payload.sub;
  if (!userId || typeof userId !== 'string') {
    return {
      caller: null,
      error: { status: 401, message: 'Unauthorized: Token missing subject (sub) claim.' },
    };
  }

  // Derive role strictly from server-side database
  const role = await getServerSideUserRole(userId, pgClient);

  return {
    caller: {
      userId,
      email: payload.email,
      role,
    },
    error: null,
  };
}

/**
 * Validates storage bucket and sanitizes object path.
 * Rejects unknown buckets and path traversal/illegal characters.
 */
function validateBucketAndPath(bucket, filePath) {
  if (!bucket || typeof bucket !== 'string' || !ALLOWED_BUCKETS.has(bucket)) {
    return {
      cleanPath: null,
      error: { status: 400, message: `Invalid or unsupported storage bucket: "${bucket}".` },
    };
  }

  if (!filePath || typeof filePath !== 'string') {
    return {
      cleanPath: null,
      error: { status: 400, message: 'Invalid object path: path must be a non-empty string.' },
    };
  }

  // Path traversal & illegal character checks
  if (filePath.includes('\0') || filePath.includes('\\') || filePath.includes('..')) {
    return {
      cleanPath: null,
      error: { status: 400, message: 'Invalid object path: directory traversal or illegal characters detected.' },
    };
  }

  let cleanPath = filePath.replace(/^\/+/, '').trim();
  if (!cleanPath) {
    return {
      cleanPath: null,
      error: { status: 400, message: 'Invalid object path: path cannot be empty.' },
    };
  }

  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.slice(bucket.length + 1).replace(/^\/+/, '');
  }

  if (!cleanPath) {
    return {
      cleanPath: null,
      error: { status: 400, message: 'Invalid object path: path cannot be empty.' },
    };
  }

  const validPathRegex = /^[a-zA-Z0-9_\-\.\/]+$/;
  if (!validPathRegex.test(cleanPath)) {
    return {
      cleanPath: null,
      error: { status: 400, message: 'Invalid object path: contains illegal characters.' },
    };
  }

  return { cleanPath, error: null };
}

/**
 * Authorize and sign an upload request.
 */
async function authorizeAndSignUpload({ caller, bucket, filePath, contentType = 'application/octet-stream' }) {
  if (!caller || !caller.userId) {
    return {
      data: null,
      error: { status: 401, message: 'Unauthorized: Anonymous users cannot upload files.' },
    };
  }

  const pathValidation = validateBucketAndPath(bucket, filePath);
  if (pathValidation.error) {
    return { data: null, error: pathValidation.error };
  }
  const cleanPath = pathValidation.cleanPath;

  const s3 = getS3Client();
  if (!s3) {
    return {
      data: null,
      error: { status: 500, message: 'Server storage configuration is unavailable.' },
    };
  }

  // Enforce ownership: Caller can only upload to their own user directory
  const folderMatch = cleanPath.match(/^([^/]+)/);
  const resourceOwnerId = folderMatch ? folderMatch[1] : null;

  if (resourceOwnerId && resourceOwnerId !== caller.userId) {
    return {
      data: null,
      error: {
        status: 403,
        message: `Forbidden: Cannot upload to another user's directory (${resourceOwnerId}).`,
      },
    };
  }

  // Prepend userId if not already in path
  let finalRelativePath = cleanPath;
  if (!resourceOwnerId || resourceOwnerId !== caller.userId) {
    finalRelativePath = `${caller.userId}/${cleanPath}`;
  }

  const s3Key = `${bucket}/${finalRelativePath}`;

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return {
      data: {
        uploadUrl,
        s3Key,
        path: finalRelativePath,
        bucket: S3_BUCKET,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: { status: 500, message: `Failed to generate upload URL: ${err.message}` },
    };
  }
}

/**
 * Authorize and sign a download / read request for private objects.
 */
async function authorizeAndSignDownload({ caller, bucket, filePath, expiresIn = 60, pgClient = null }) {
  if (!caller || !caller.userId) {
    return {
      data: null,
      error: { status: 401, message: 'Unauthorized: Authentication required.' },
    };
  }

  const pathValidation = validateBucketAndPath(bucket, filePath);
  if (pathValidation.error) {
    return { data: null, error: pathValidation.error };
  }
  const cleanPath = pathValidation.cleanPath;

  const s3 = getS3Client();
  if (!s3) {
    return {
      data: null,
      error: { status: 500, message: 'Server storage configuration is unavailable.' },
    };
  }

  const folderMatch = cleanPath.match(/^([^/]+)/);
  const resourceOwnerId = folderMatch ? folderMatch[1] : null;

  // 1. Private recordings ('notes' and 'audio'): only the owner may access
  if (bucket === 'notes' || bucket === 'audio') {
    if (!resourceOwnerId || caller.userId !== resourceOwnerId) {
      return {
        data: null,
        error: { status: 403, message: "Forbidden: You do not have permission to access another account's private audio (403)." },
      };
    }
  }

  // 2. Private receipts ('payment-screenshots'): owner or server-verified admin/owner only
  if (bucket === 'payment-screenshots') {
    if (!resourceOwnerId || caller.userId !== resourceOwnerId) {
      let role = caller.role;
      if (role !== 'admin' && role !== 'owner') {
        role = await getServerSideUserRole(caller.userId, pgClient);
      }
      if (role !== 'admin' && role !== 'owner') {
        return {
          data: null,
          error: { status: 403, message: 'Forbidden: You do not have permission to view this receipt (403).' },
        };
      }
    }
  }

  const s3Key = `${bucket}/${cleanPath}`;

  try {
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
      }),
      { expiresIn }
    );

    return {
      data: {
        signedUrl,
        s3Key,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: { status: 500, message: `Failed to generate signed URL: ${err.message}` },
    };
  }
}

/**
 * Handle HTTP storage API request (compatible with Node HTTP, Express, and Vercel serverless).
 */
async function handleStorageApiRequest(req, res, pgClient = null) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: null, error: { status: 405, message: 'Method Not Allowed' } }));
    return;
  }

  // Retrieve payload whether pre-parsed (Vercel/Express) or raw stream
  const getPayload = () => new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch (e) { return reject(e); }
    }
    let bodyData = '';
    req.on('data', (chunk) => { bodyData += chunk; });
    req.on('end', () => {
      try {
        resolve(bodyData ? JSON.parse(bodyData) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

  let payload;
  try {
    payload = await getPayload();
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: null, error: { status: 400, message: `Invalid JSON body: ${err.message}` } }));
    return;
  }

  // Authentication MUST come from the HTTP Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const { caller, error: authError } = await verifyCaller(authHeader, pgClient);

  if (authError || !caller) {
    res.statusCode = authError?.status || 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: null, error: authError || { status: 401, message: 'Unauthorized' } }));
    return;
  }

  const action = payload.action;
  const bucket = payload.bucket;
  const filePath = payload.filePath || payload.path || '';
  const contentType = payload.contentType || 'application/octet-stream';
  const expiresIn = typeof payload.expiresIn === 'number' ? payload.expiresIn : 60;

  if (action === 'get-upload-url') {
    const result = await authorizeAndSignUpload({
      caller,
      bucket,
      filePath,
      contentType,
    });

    res.statusCode = result.error ? (result.error.status || 400) : 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
    return;
  }

  if (action === 'create-signed-url') {
    const result = await authorizeAndSignDownload({
      caller,
      bucket,
      filePath,
      expiresIn,
      pgClient,
    });

    res.statusCode = result.error ? (result.error.status || 400) : 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
    return;
  }

  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ data: null, error: { status: 400, message: `Unknown action: "${action}"` } }));
}

module.exports = {
  S3_BUCKET,
  ALLOWED_BUCKETS,
  getS3Client,
  verifyCaller,
  validateBucketAndPath,
  authorizeAndSignUpload,
  authorizeAndSignDownload,
  handleStorageApiRequest,
};
