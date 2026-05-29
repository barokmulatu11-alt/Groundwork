import { supabase } from '@/lib/connect/connectSupabase';

/** Normalize avatar URLs from profiles / connect_profiles / storage paths. */
export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }
  const path = trimmed.replace(/^\/+/, '').replace(/^avatars\//, '');
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || trimmed;
}
