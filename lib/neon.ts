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

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf8')
    );
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const exp = parseJwtExpiry(token);
  if (!exp) return true; // unparseable = treat as expired
  return Date.now() >= exp - 30_000; // 30s clock skew buffer
}

// ─── Persistence API ──────────────────────────────────────────────────────────

/**
 * Persist the current session JWT and its expiry to AsyncStorage.
 * Called from the SDK's onSuccess hook after any successful auth operation.
 * No-op on web (browser manages cookies natively).
 */
export async function persistSessionToken(token: string | null | undefined): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (token) {
      const exp = parseJwtExpiry(token);
      await AsyncStorage.multiSet([
        [PERSISTED_TOKEN_KEY, token],
        [PERSISTED_TOKEN_EXPIRY_KEY, String(exp ?? 0)],
      ]);
    } else {
      await AsyncStorage.multiRemove([PERSISTED_TOKEN_KEY, PERSISTED_TOKEN_EXPIRY_KEY]);
    }
  } catch {
    // Non-fatal: session won't persist across restarts
  }
}

/**
 * Read the persisted session token from AsyncStorage.
 * Returns null if absent, expired, or on web.
 */
export async function getPersistedSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const token = await AsyncStorage.getItem(PERSISTED_TOKEN_KEY);
    if (!token) return null;
    if (isJwtExpired(token)) {
      // Remove stale token proactively
      await AsyncStorage.multiRemove([PERSISTED_TOKEN_KEY, PERSISTED_TOKEN_EXPIRY_KEY]);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Clear all persisted session state. Must be called on signOut.
 */
export async function clearPersistedSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await AsyncStorage.multiRemove([PERSISTED_TOKEN_KEY, PERSISTED_TOKEN_EXPIRY_KEY]);
  } catch {}
}

/**
 * Attempt to restore session on app startup (React Native only).
 *
 * Process:
 * 1. Read the persisted JWT from AsyncStorage.
 * 2. If absent or expired: return null (user must sign in again).
 * 3. If present and not expired: call getSession() to validate with the server.
 *    - If server returns a valid session: persist the fresh token and return it.
 *    - If server returns no session (cookie expired / invalidated): clear local
 *      state and return null.
 *
 * This function does NOT invent a session from a stale token — it always
 * validates with the server when possible.
 *
 * Returns the current valid JWT, or null if no session can be restored.
 */
export async function restoreSession(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const isManual = await AsyncStorage.getItem('groundwork_manual_signout');
    if (isManual === 'true') {
      await clearPersistedSession();
      return null;
    }
  } catch {}

  const localToken = await getPersistedSessionToken();
  if (!localToken) return null; // no persisted token or it has expired

  try {
    // Attempt live server validation
    const { data } = await neonAuth.getSession();
    const freshToken = data?.session?.token;
    if (freshToken) {
      await persistSessionToken(freshToken);
      return freshToken;
    }
    // Server does not recognise the session (cookie expired or revoked)
    await clearPersistedSession();
    return null;
  } catch {
    // Network unavailable: return local token for offline Data API access.
    // The token's authenticity has not been re-validated — callers must handle
    // the case where the server later rejects it.
    return localToken;
  }
}

// ─── Neon Auth Client ────────────────────────────────────────────────────────

const internalAuth = createInternalNeonAuth(NEON_AUTH_URL, {
  allowAnonymous: true,
  fetchOptions: {
    headers: {
      ...(Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
        ? { Origin: window.location.origin }
        : {}),
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
 * On React Native, falls back to the persisted token for offline use.
 */
export const getNeonJWTToken = async (): Promise<string | null> => {
  const liveToken = await internalAuth.getJWTToken().catch(() => null);
  if (liveToken) return liveToken;
  // Fallback: use persisted token for offline/degraded network scenarios
  return getPersistedSessionToken();
};

// ─── Neon Data API (PostgREST) ────────────────────────────────────────────────
// Circular import note: supabase.ts imports from neon.ts, and neon.ts imports
// rawSupabaseClient from supabase.ts. Both are singletons initialized once.
import { rawSupabaseClient } from './supabase';

export const neonData = new PostgrestClient(NEON_API_URL, {
  fetch: async (url, options) => {
    if (process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const sbUrl = urlStr.replace(NEON_API_URL, 'https://yevrsmlwmegovfwdxpjw.supabase.co/rest/v1');
      return (rawSupabaseClient as any).rest.fetch(sbUrl, options);
    }

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

    const token = await getNeonJWTToken();
    const headers = new Headers(options?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('apikey', token);
    }
    return fetch(reqUrl, { ...options, headers });
  },
});
