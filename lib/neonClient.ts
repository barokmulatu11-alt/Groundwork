/**
 * Canonical Neon Client — lib/neonClient.ts
 *
 * This client routes all authentication to Neon Auth, all database queries
 * to Neon Data API (PostgREST) with JWT session injection, and all file
 * uploads to Neon S3 Storage.
 *
 * Note: lib/supabase.ts is kept as a backwards-compatibility alias for legacy
 * imports that haven't been renamed yet.
 */
import { supabase, NeonUnifiedClient, NeonRealtimeChannel } from './supabase';

export { supabase, NeonUnifiedClient, NeonRealtimeChannel };
export const neonClient = supabase;
export default neonClient;
