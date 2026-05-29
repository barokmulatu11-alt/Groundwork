import { supabase, AdminRole, Profile } from '@/lib/supabase';

export function normalizeRole(role: string | undefined | null): AdminRole {
  const r = (role || 'user').trim().toLowerCase();
  if (r === 'owner' || r === 'admin' || r === 'moderator') return r;
  return 'user';
}

export function isAdminRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'owner';
}

export function canAssignRole(actorRole: AdminRole | undefined, targetRole: AdminRole): boolean {
  if (!actorRole) return false;
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') {
    return targetRole === 'moderator' || targetRole === 'user';
  }
  return false;
}

export async function clearUserData(userId: string): Promise<{ ok: boolean; error?: string }> {
  const promises = [
    supabase.from('tasks').delete().eq('user_id', userId),
    supabase.from('habits').delete().eq('user_id', userId),
    supabase.from('notes').delete().eq('user_id', userId),
    supabase.from('focus_sessions').delete().eq('user_id', userId),
    supabase.from('day_notes').delete().eq('user_id', userId),
    supabase.from('sub_tasks').delete().eq('user_id', userId),
    supabase.from('note_tags').delete().eq('user_id', userId),
    supabase.from('user_notifications').delete().eq('user_id', userId),
    supabase.from('connect_social_links').delete().eq('user_id', userId),
    supabase.from('connect_achievements').delete().eq('user_id', userId),
    supabase.from('connect_xp_log').delete().eq('user_id', userId),
    supabase.from('connect_friendships').delete().or(`user_id1.eq.${userId},user_id2.eq.${userId}`),
    supabase.from('connect_friend_requests').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    supabase.from('connect_follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    supabase.from('connect_blocks').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    supabase.from('connect_profiles').update({
      xp: 0,
      level: 1,
      tasks_completed_count: 0,
      longest_streak: 0,
      focus_hours: 0,
      bio: '',
      avatar_url: null,
    }).eq('user_id', userId),
  ];

  const results = await Promise.all(promises);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return { ok: false, error: firstError.message };
  return { ok: true };
}

export function roleUpdateForAction(
  type: string,
  actor: Profile | null
): { update: Record<string, unknown> } | { error: string } {
  const map: Record<string, AdminRole> = {
    makeOwner: 'owner',
    makeAdmin: 'admin',
    makeModerator: 'moderator',
    makeUser: 'user',
  };
  const target = map[type];
  if (!target) return { error: 'Unknown action' };
  if (!canAssignRole(actor?.role, target)) {
    return { error: 'Only owners can assign owner/admin roles.' };
  }
  if (type === 'makeOwner') return { update: { role: 'owner' } };
  if (type === 'makeAdmin') return { update: { role: 'admin' } };
  if (type === 'makeModerator') return { update: { role: 'moderator' } };
  if (type === 'makeUser') return { update: { role: 'user' } };
  return { error: 'Unknown action' };
}
