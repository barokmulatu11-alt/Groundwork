import './cryptoPolyfill';
import { createInternalNeonAuth } from '@neondatabase/auth';
import { PostgrestClient } from '@supabase/postgrest-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

export const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL || 'https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1';
export const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
export const NEON_S3_ENDPOINT = process.env.EXPO_PUBLIC_NEON_S3_ENDPOINT || 'https://ep-gentle-night-b4oacb89.storage.c-6.us-east-2.aws.neon.tech';

// ─── SDK Notes ────────────────────────────────────────────────────────────────
// @neondatabase/auth v0.5.0-beta SDK behaviour (confirmed by source inspection):
//
// 1. customFetchImpl passed via fetchOptions is OVERRIDDEN inside NeonAuthAdapterCore
//    constructor. The user-provided value is completely discarded.
//
// 2. The SDK manages sessions server-side via HTTP cookies. On web, the browser
//    handles cookie storage automatically. On React Native, fetch does not manage
//    cookies — sessions are lost on restart.
//
// 3. The SDK exposes fetchOptions.onSuccess, which receives ctx.data.session.token
//    (the JWT injected from the `set-auth-jwt` response header). This is the only
//    supported hook for intercepting session tokens.
//
// 4. getSession() calls the live server — it does not read from AsyncStorage.
//    Token expiry is checked by the SDK's in-memory TokenCache (backed by JWT exp claim).
//
// Strategy for React Native persistence:
// - On each successful auth operation, persist the JWT token via onSuccess hook.
// - On app startup, read the persisted token, check its expiry, and if valid,
//   call getSession() to attempt server-side session recovery (the server validates
//   the cookie/session state). The persisted token is used as a fallback for
//   offline Data API requests only.
// - On signOut, clear the persisted token AND call neonAuth.signOut() to
//   invalidate the server-side session.
// - On expiry: isPersistedTokenExpired() returns true, forcing a fresh login.

// ─── Storage Keys ────────────────────────────────────────────────────────────
const PERSISTED_TOKEN_KEY = 'neon_auth_jwt';
const PERSISTED_TOKEN_EXPIRY_KEY = 'neon_auth_jwt_exp'; // ms epoch

// ─── JWT Utilities ────────────────────────────────────────────────────────────

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      break;
  }
  return Buffer.from(output, 'base64').toString('utf8');
}

function parseJwtExpiry(token: string): number | null {
  try {
    const raw = token.split('.')[1];
    if (!raw) return null;
    const json = base64UrlDecode(raw);
    const payload = JSON.parse(json);
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

export function parseJwtPayload(token: string): any | null {
  try {
    const raw = token.split('.')[1];
    if (!raw) return null;
    const json = base64UrlDecode(raw);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isJwt(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts[0].length > 10 && parts[1].length > 10 && parts[2].length > 10;
}

export function isJwtAnonymous(token: string): boolean {
  if (!isJwt(token)) return false;
  const payload = parseJwtPayload(token);
  return payload?.role === 'anonymous';
}

function isJwtExpired(token: string): boolean {
  if (!isJwt(token)) return true;
  const exp = parseJwtExpiry(token);
  if (exp) {
    return Date.now() >= exp - 30_000; // 30s clock skew buffer
  }
  return false;
}

// ─── Persistence API ──────────────────────────────────────────────────────────

/**
 * Persist the current session JWT and its expiry to AsyncStorage.
 * Called from the SDK's onSuccess hook after any successful auth operation.
 */
let cachedMemoryJwt: string | null = null;

export async function persistSessionToken(token: string | null | undefined): Promise<void> {
  try {
    cachedMemoryJwt = token && isJwt(token) ? token : null;
    if (token && isJwt(token)) {
      // NEVER overwrite an existing authenticated token with an anonymous token
      if (isJwtAnonymous(token)) {
        const existing = await AsyncStorage.getItem(PERSISTED_TOKEN_KEY);
        if (existing && isJwt(existing) && !isJwtExpired(existing) && !isJwtAnonymous(existing)) {
          return;
        }
      }
      const exp = parseJwtExpiry(token);
      await AsyncStorage.multiSet([
        [PERSISTED_TOKEN_KEY, token],
        [PERSISTED_TOKEN_EXPIRY_KEY, String(exp ?? (Date.now() + 3600 * 1000 * 24 * 30))], // default 30 days
      ]);
    } else if (!token) {
      await AsyncStorage.multiRemove([PERSISTED_TOKEN_KEY, PERSISTED_TOKEN_EXPIRY_KEY]);
    }
  } catch {
    // Non-fatal: session won't persist across restarts
  }
}

/**
 * Read the persisted session token from AsyncStorage.
 * Returns null if absent or manually signed out. Only returns valid JWT strings.
 */
export async function getPersistedSessionToken(): Promise<string | null> {
  try {
    const isManual = await AsyncStorage.getItem('groundwork_manual_signout');
    if (isManual === 'true') {
      return null;
    }

    let token = await AsyncStorage.getItem(PERSISTED_TOKEN_KEY);
    if (!token || !isJwt(token)) {
      const offlineSessionStr = await AsyncStorage.getItem('groundwork_offline_session');
      if (offlineSessionStr) {
        try {
          const parsed = JSON.parse(offlineSessionStr);
          const cand = parsed?.access_token || parsed?.token || null;
          if (cand && isJwt(cand)) {
            token = cand;
            await persistSessionToken(token);
          }
        } catch (_) {}
      }
    }
    if (token && isJwt(token)) {
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear all persisted session state. Must be called on signOut.
 */
export async function clearPersistedSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PERSISTED_TOKEN_KEY, PERSISTED_TOKEN_EXPIRY_KEY, 'neon_auth_cookie']);
  } catch {}
}

/**
 * Attempt to restore session on app startup.
 * Returns the best available persisted token.
 */
export async function restoreSession(): Promise<string | null> {
  try {
    const isManual = await AsyncStorage.getItem('groundwork_manual_signout');
    if (isManual === 'true') {
      await clearPersistedSession();
      return null;
    }
  } catch {}

  const localToken = await getPersistedSessionToken();
  if (!localToken) return null;

  return localToken;
}

// ─── Neon Auth Client ────────────────────────────────────────────────────────

const internalAuth = createInternalNeonAuth(NEON_AUTH_URL, {
  allowAnonymous: true,
  fetchOptions: {
    headers: {
      Origin: Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://groundwork.app',
    },
    onSuccess: async (ctx: any) => {
      // Persist fresh JWT whenever the SDK completes a successful auth operation.
      // ctx.data.session.token is populated by the SDK's own onSuccess handler
      // from the `set-auth-jwt` response header before userOnSuccess is called.
      const token: string | undefined = ctx?.data?.session?.token;
      if (token) {
        await persistSessionToken(token);
      }
    },
  } as any,
} as any);

export const neonAuth = internalAuth.adapter;

/**
 * Get a valid JWT for the current session.
 * For authenticated users:
 * 1. Checks persisted / in-memory tokens.
 * 2. If valid and not expired, returns immediately.
 * 3. If expired or forceRefresh requested:
 *    - Refreshes via Neon Auth cookie (/token)
 *    - Refreshes via internalAuth.getJWTToken() (Web browser session)
 *    - Refreshes via mobile-session bridge
 * 4. NEVER returns null if an authenticated user session exists, avoiding PostgREST auth errors.
 */
export const getNeonJWTToken = async (forceRefresh = false): Promise<string | null> => {
  // Check if an authenticated user session is active
  let isUserLoggedIn = false;
  let loggedInUserId: string | null = null;
  try {
    const { useAuthStore } = require('@/store/useAuthStore');
    const authState = useAuthStore.getState();
    loggedInUserId = authState.session?.user?.id || null;
    isUserLoggedIn = !authState.isGuest && Boolean(loggedInUserId && loggedInUserId !== 'guest');
  } catch (_) {}

  // 0. Ultra-fast in-memory cache check (avoids redundant async storage lookups)
  if (!forceRefresh && cachedMemoryJwt && isJwt(cachedMemoryJwt) && !isJwtExpired(cachedMemoryJwt)) {
    if (!isUserLoggedIn || !isJwtAnonymous(cachedMemoryJwt)) {
      return cachedMemoryJwt;
    }
  }

  // 1. Gather all local candidate user tokens
  const persisted = await getPersistedSessionToken();
  let storeToken: string | null = null;
  try {
    const { useAuthStore } = require('@/store/useAuthStore');
    storeToken = useAuthStore.getState().session?.access_token || null;
  } catch (_) {}

  let offlineToken: string | null = null;
  try {
    const offlineSessionStr = await AsyncStorage.getItem('groundwork_offline_session');
    if (offlineSessionStr) {
      const parsed = JSON.parse(offlineSessionStr);
      offlineToken = parsed?.access_token || parsed?.token || null;
    }
  } catch (_) {}

  const candidateUserToken = [persisted, storeToken, offlineToken].find(
    (t) => t && isJwt(t) && !isJwtAnonymous(t)
  );

  // If we already have a non-expired valid JWT user token and forceRefresh is false, return it immediately
  if (!forceRefresh && candidateUserToken && !isJwtExpired(candidateUserToken)) {
    cachedMemoryJwt = candidateUserToken;
    return candidateUserToken;
  }

  // 2. Refresh token using persisted Neon Auth session cookie (handles 15-minute token TTL)
  try {
    const savedCookie = await AsyncStorage.getItem('neon_auth_cookie');
    if (savedCookie) {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://groundwork.app';
      const tokenRes = await fetch(`${NEON_AUTH_URL}/token`, {
        method: 'GET',
        headers: {
          Origin: origin,
          Cookie: savedCookie,
        },
      });
      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json().catch(() => null);
        if (tokenJson?.token && isJwt(tokenJson.token) && !isJwtExpired(tokenJson.token)) {
          await persistSessionToken(tokenJson.token);
          return tokenJson.token;
        }
      }
    }
  } catch (_) {}

  // 3. Live token from internal Neon auth adapter (authenticated on web, anonymous on React Native)
  try {
    const liveToken = await internalAuth.getJWTToken().catch(() => null);
    if (liveToken && isJwt(liveToken) && !isJwtExpired(liveToken)) {
      if (!isUserLoggedIn || !isJwtAnonymous(liveToken)) {
        await persistSessionToken(liveToken);
        return liveToken;
      }
    }
  } catch (_) {}

  // 4. If user is logged in, attempt mobile-session bridge (which mints authentic EdDSA JWTs)
  if (isUserLoggedIn) {
    try {
      const bridgeUrl = loggedInUserId
        ? `https://barok-labs.pro.et/api/auth/mobile-session?userId=${encodeURIComponent(loggedInUserId)}`
        : 'https://barok-labs.pro.et/api/auth/mobile-session';
      const bridgeRes = await fetch(bridgeUrl);
      if (bridgeRes.ok) {
        const bridgeData = await bridgeRes.json().catch(() => null);
        const bridgeToken = bridgeData?.session?.token;
        if (bridgeToken && isJwt(bridgeToken) && !isJwtAnonymous(bridgeToken)) {
          await persistSessionToken(bridgeToken);
          return bridgeToken;
        }
      }
    } catch (_) {}
  }

  // 5. CRITICAL SAFEGUARD FOR LOGGED IN USERS:
  // If the user is logged in and we have a valid JWT candidate, return it.
  // NEVER return a non-JWT string (which causes "Provided authentication token is not a valid JWT encoding").
  if (isUserLoggedIn && candidateUserToken && isJwt(candidateUserToken)) {
    return candidateUserToken;
  }

  // 6. Fallback: if not logged in, return anonymous live token
  if (!isUserLoggedIn) {
    const anon = await internalAuth.getJWTToken().catch(() => null);
    if (anon && isJwt(anon) && !isJwtExpired(anon)) {
      return anon;
    }
  }

  return (candidateUserToken && isJwt(candidateUserToken)) ? candidateUserToken : null;
};

// ─── Neon Data API (PostgREST) ────────────────────────────────────────────────

export const neonData = new PostgrestClient(NEON_API_URL, {
  fetch: async (url, options) => {
    let reqUrl = typeof url === 'string' ? url : url.toString();
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location?.origin &&
      (window as any).__GROUNDWORK_ENABLE_TEST_HOOKS__ &&
      reqUrl.includes('.apirest.')
    ) {
      reqUrl = reqUrl.replace(/^https:\/\/[^/]+\/neondb\/rest\/v1/, `${window.location.origin}/neondb/rest/v1`);
    }

    let token = await getNeonJWTToken();
    const headers = new Headers(options?.headers);
    if (token && isJwt(token)) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('apikey', token);
    }
    let res = await fetch(reqUrl, { ...options, headers });

    // Auto-retry once on 401 or token errors by forcing a token refresh
    if (res.status === 401 || res.status === 400) {
      const clone = res.clone();
      const errText = await clone.text().catch(() => '');
      if (/jwt|token|credential|unauthorized|bearer/i.test(errText)) {
        console.log('[Neon Data] Token expired or invalid, attempting automatic refresh...');
        const freshToken = await getNeonJWTToken(true);
        if (freshToken && isJwt(freshToken) && freshToken !== token) {
          headers.set('Authorization', `Bearer ${freshToken}`);
          headers.set('apikey', freshToken);
          res = await fetch(reqUrl, { ...options, headers });
        }
      }
    }

    return res;
  },
});
