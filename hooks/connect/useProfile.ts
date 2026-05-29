import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';
import { supabase } from '@/lib/connect/connectSupabase';
import { getLevelTitle, subscribeToConnectEvents, emitConnectEvent } from '@/lib/connect/xpSystem';
import { getUserStats, ACHIEVEMENTS } from '@/lib/connect/achievementEngine';
import { normalizePlatformId, normalizeSocialUrl } from '@/lib/socialPlatforms';

export interface ConnectProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  productivity_category: string;
  joined_at: string;
  updated_at: string;
  tasks_completed_count?: number;
  longest_streak?: number;
  focus_hours?: number;
  privacy_level?: string;
  institution?: string | null;
}

export interface SocialLink {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  created_at: string;
}

export const useProfile = (targetUserId?: string) => {
  const { session, isGuest, profile: authProfile } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');
  const userId = targetUserId || currentUserId;
  const isOwnProfile = userId === currentUserId;

  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionState, setConnectionState] = useState<'none' | 'sent' | 'received' | 'friends' | 'blocked'>('none');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!userId || userId === 'guest') {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      let p = db.getFirstSync<ConnectProfile>('SELECT * FROM connect_profiles WHERE user_id = ?', [userId]);
      
      if (!p && isOwnProfile) {
        let cloudProfileData: ConnectProfile | null = null;
        if (session?.user?.id) {
          try {
            const { data, error } = await supabase
              .from('connect_profiles')
              .select('*')
              .eq('user_id', userId)
              .single();
            if (!error && data) {
              cloudProfileData = data as ConnectProfile;
            }
          } catch (err) {
            console.warn('[useProfile] Failed to fetch cloud profile during init:', err);
          }
        }

        if (cloudProfileData) {
          db.runSync(
            'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at, privacy_level, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              cloudProfileData.id,
              cloudProfileData.user_id,
              cloudProfileData.username,
              cloudProfileData.bio || '',
              cloudProfileData.avatar_url || null,
              cloudProfileData.xp || 0,
              cloudProfileData.level || 1,
              cloudProfileData.productivity_category || 'General',
              cloudProfileData.joined_at,
              cloudProfileData.updated_at,
              cloudProfileData.privacy_level || 'public',
              cloudProfileData.institution || null
            ]
          );
          p = db.getFirstSync<ConnectProfile>('SELECT * FROM connect_profiles WHERE user_id = ?', [userId]);
        } else {
          const id = Math.random().toString(36).substring(7);
          const now = new Date().toISOString();
          const username = authProfile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || ('user_' + Math.floor(Math.random()*10000));
          const bio = authProfile?.bio || 'On a mission to stay productive.';
          const avatarUrl = authProfile?.avatar_url || null;

          db.runSync(
            'INSERT INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at, privacy_level, institution) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?, \'public\', NULL)',
            [id, userId, username, bio, avatarUrl, 'General', now, now]
          );
          p = db.getFirstSync<ConnectProfile>('SELECT * FROM connect_profiles WHERE user_id = ?', [userId]);

          if (session?.user?.id) {
            (async () => {
              try {
                const { error } = await supabase.from('connect_profiles').upsert({
                  id,
                  user_id: userId,
                  username,
                  bio,
                  avatar_url: avatarUrl,
                  xp: 0,
                  level: 1,
                  productivity_category: 'General',
                  joined_at: now,
                  updated_at: now,
                  privacy_level: 'public',
                  institution: null
                }, { onConflict: 'user_id' });
                if (error) console.error('[useProfile] Supabase profile create error:', error);
              } catch (err) {
                console.warn('[useProfile] Supabase profile create catch:', err);
              }
            })();
          }
        }
      }

      if (p && isOwnProfile && authProfile) {
        let updated = false;
        if (authProfile.username && authProfile.username !== p.username) {
          p.username = authProfile.username;
          updated = true;
        }
        if (authProfile.bio !== undefined && authProfile.bio !== null && authProfile.bio !== p.bio) {
          p.bio = authProfile.bio;
          updated = true;
        }
        if (authProfile.avatar_url !== undefined && authProfile.avatar_url !== p.avatar_url) {
          p.avatar_url = authProfile.avatar_url || null;
          updated = true;
        }
        if (updated) {
          db.runSync('UPDATE connect_profiles SET username = ?, bio = ?, avatar_url = ? WHERE user_id = ?', [p.username, p.bio, p.avatar_url, userId]);
          if (session?.user?.id) {
            (async () => {
              try {
                const { error } = await supabase.from('connect_profiles')
                  .update({ username: p.username, bio: p.bio, avatar_url: p.avatar_url })
                  .eq('user_id', userId);
                if (error) console.error('[useProfile] sync update error:', error);
              } catch (err) {
                console.warn('[useProfile] sync update catch:', err);
              }
            })();
          }
        }
      }

      if (p && isOwnProfile && userId !== 'guest') {
        try {
          const { data: cloudProfile, error: cpError } = await supabase.from('connect_profiles').select('*').eq('user_id', userId).single();
          
          const uStats = getUserStats(userId);
          const focusHours = Math.round((uStats.totalFocusMinutes || 0) / 60);

          if (cpError || !cloudProfile) {
            // Missing on cloud! Let's upload immediately so other users can see it!
            console.log('[useProfile] Profile missing on Supabase. Upserting to Supabase...');
            await supabase.from('connect_profiles').upsert({
              id: p.id,
              user_id: p.user_id,
              username: p.username,
              bio: p.bio,
              avatar_url: p.avatar_url,
              xp: p.xp,
              level: p.level,
              productivity_category: p.productivity_category,
              joined_at: p.joined_at,
              updated_at: p.updated_at,
              tasks_completed_count: uStats.totalTasksCompleted,
              longest_streak: uStats.longestStreak,
              focus_hours: focusHours,
              privacy_level: p.privacy_level || 'public',
              institution: p.institution || null
            }, { onConflict: 'user_id' });
          } else {
            // Sync cloud XP/level and other details
            let updatedLocal = false;
            let updatedCloud = false;

            if (cloudProfile.xp !== p.xp || cloudProfile.level !== p.level) {
              const highestXp = Math.max(cloudProfile.xp, p.xp);
              const highestLevel = Math.max(cloudProfile.level, p.level);
              if (p.xp !== highestXp || p.level !== highestLevel) {
                p.xp = highestXp;
                p.level = highestLevel;
                updatedLocal = true;
              }
              if (cloudProfile.xp !== highestXp || cloudProfile.level !== highestLevel) {
                updatedCloud = true;
              }
            }

            // For personal fields, compare the updated_at timestamp
            const localTime = p.updated_at ? Date.parse(p.updated_at) : 0;
            const cloudTime = cloudProfile.updated_at ? Date.parse(cloudProfile.updated_at) : 0;

            if (localTime > cloudTime + 2000) {
              // Local changes are newer: sync up to cloud
              updatedCloud = true;
            } else if (cloudTime > localTime + 2000) {
              // Cloud changes are newer: sync down to local
              p.username = cloudProfile.username || p.username;
              p.bio = cloudProfile.bio || p.bio;
              p.avatar_url = cloudProfile.avatar_url || p.avatar_url;
              p.privacy_level = cloudProfile.privacy_level || p.privacy_level || 'public';
              p.institution = cloudProfile.institution !== undefined ? cloudProfile.institution : p.institution;
              updatedLocal = true;
            } else {
              // Same time, fallback to default checks if they differ
              if (p.bio && p.bio !== cloudProfile.bio && p.bio !== 'On a mission to stay productive.') {
                updatedCloud = true;
              } else if (cloudProfile.bio && cloudProfile.bio !== p.bio) {
                p.bio = cloudProfile.bio;
                updatedLocal = true;
              }

              if (p.username && p.username !== cloudProfile.username && !p.username.startsWith('user_')) {
                updatedCloud = true;
              } else if (cloudProfile.username && cloudProfile.username !== p.username) {
                p.username = cloudProfile.username;
                updatedLocal = true;
              }

              if (p.avatar_url && p.avatar_url !== cloudProfile.avatar_url) {
                updatedCloud = true;
              } else if (cloudProfile.avatar_url && cloudProfile.avatar_url !== p.avatar_url) {
                p.avatar_url = cloudProfile.avatar_url;
                updatedLocal = true;
              }
            }

            // Verify if cloud stats are outdated compared to local fresh stats
            if (
              cloudProfile.tasks_completed_count !== uStats.totalTasksCompleted ||
              cloudProfile.longest_streak !== uStats.longestStreak ||
              cloudProfile.focus_hours !== focusHours
            ) {
              updatedCloud = true;
            }

            if (updatedLocal) {
              db.runSync(
                'UPDATE connect_profiles SET username = ?, bio = ?, avatar_url = ?, xp = ?, level = ?, privacy_level = ?, institution = ?, updated_at = ? WHERE user_id = ?',
                [p.username, p.bio, p.avatar_url, p.xp, p.level, p.privacy_level || 'public', p.institution || null, new Date().toISOString(), userId]
              );
              emitConnectEvent({ type: 'XP_UPDATED', xp: p.xp, level: p.level });
            }

            if (updatedCloud) {
              await supabase.from('connect_profiles').update({
                username: p.username,
                bio: p.bio,
                avatar_url: p.avatar_url,
                xp: p.xp,
                level: p.level,
                tasks_completed_count: uStats.totalTasksCompleted,
                longest_streak: uStats.longestStreak,
                focus_hours: focusHours,
                privacy_level: p.privacy_level || 'public',
                institution: p.institution || null,
                updated_at: new Date().toISOString()
              }).eq('user_id', userId);
            }
          }
          
          p.tasks_completed_count = uStats.totalTasksCompleted;
          p.longest_streak = uStats.longestStreak;
          p.focus_hours = focusHours;
        } catch (err) {
          console.warn('[useProfile] cloud sync-down catch:', err);
        }
      }

      if (!isOwnProfile && userId !== 'guest') {
        try {
          const { data: cloudProfile, error: cpError } = await supabase
            .from('connect_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          if (cpError) {
            console.error('[useProfile] Fetch other connect_profile error:', cpError);
          }
          if (cloudProfile) {
            p = cloudProfile as ConnectProfile;
            try {
              const { data: mainProfile } = await supabase
                .from('profiles')
                .select('avatar_url, full_name')
                .eq('id', userId)
                .maybeSingle();
              if (mainProfile?.avatar_url) {
                p.avatar_url = mainProfile.avatar_url;
              }
            } catch (_) {
              /* profiles row optional */
            }
            db.runSync(
              'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at, tasks_completed_count, longest_streak, focus_hours, privacy_level, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [p.id, p.user_id, p.username, p.bio, p.avatar_url, p.xp, p.level, p.productivity_category, p.joined_at, p.updated_at, (p as any).tasks_completed_count || 0, (p as any).longest_streak || 0, (p as any).focus_hours || 0, (p as any).privacy_level || 'public', (p as any).institution || null]
            );
          }
        } catch (err) {
          console.warn('[useProfile] Fetch other connect_profile catch:', err);
        }
      }

      if (p) setProfile(p);

      // Sync manual_links from Auth metadata to connect_social_links if isOwnProfile
      if (isOwnProfile && session?.user?.user_metadata?.manual_links) {
        try {
          const manualLinks = session.user.user_metadata.manual_links as Array<{ name: string; url: string; type: string; username?: string }>;
          const currentConnectLinks = db.getAllSync<SocialLink>('SELECT * FROM connect_social_links WHERE user_id = ?', [userId]);

          // Remove any links that no longer exist in manual_links
          for (const cl of currentConnectLinks) {
            const stillExists = manualLinks.some(ml => (ml.name || ml.type || 'Website') === cl.platform);
            if (!stillExists) {
              db.runSync('DELETE FROM connect_social_links WHERE id = ?', [cl.id]);
              supabase.from('connect_social_links').delete().eq('id', cl.id).then(({ error }) => {
                if (error) console.error('[useProfile] Supabase delete sync error:', error);
              });
            }
          }

          // Add or update links
          for (const ml of manualLinks) {
            const platformName = ml.name || ml.type || 'Website';
            const existing = currentConnectLinks.find(cl => cl.platform === platformName);
            if (existing) {
              if (existing.url !== ml.url) {
                db.runSync('UPDATE connect_social_links SET url = ? WHERE id = ?', [ml.url, existing.id]);
                supabase.from('connect_social_links').update({ url: ml.url }).eq('id', existing.id).then(({ error }) => {
                  if (error) console.error('[useProfile] Supabase update sync error:', error);
                });
              }
            } else {
              const id = Math.random().toString(36).substring(7);
              const now = new Date().toISOString();
              const newLink = { id, user_id: currentUserId, platform: platformName, url: ml.url, created_at: now };
              db.runSync('INSERT INTO connect_social_links (id, user_id, platform, url, created_at) VALUES (?, ?, ?, ?, ?)', [id, currentUserId, platformName, ml.url, now]);
              supabase.from('connect_social_links').insert(newLink).then(({ error }) => {
                if (error) console.error('[useProfile] Supabase insert sync error:', error);
              });
            }
          }
        } catch (syncErr) {
          console.warn('[useProfile] Failed to sync manual links:', syncErr);
        }
      }

      let links = db.getAllSync<SocialLink>('SELECT * FROM connect_social_links WHERE user_id = ?', [userId]);
      if (!links.length) {
        const { data } = await supabase.from('connect_social_links').select('*').eq('user_id', userId);
        if (data && data.length) {
          links = data as SocialLink[];
          links.forEach(l => {
            db.runSync('INSERT OR REPLACE INTO connect_social_links VALUES (?, ?, ?, ?, ?)', [l.id, l.user_id, l.platform, l.url, l.created_at]);
          });
        }
      }

      // Deduplicate by platform to ensure no duplicate buttons are rendered
      const uniqueLinks: SocialLink[] = [];
      const seenPlatforms = new Set<string>();
      for (const l of links) {
        const platformLower = l.platform.toLowerCase();
        if (!seenPlatforms.has(platformLower)) {
          seenPlatforms.add(platformLower);
          uniqueLinks.push(l);
        } else {
          // Clean up duplicate from SQLite and Supabase
          try {
            db.runSync('DELETE FROM connect_social_links WHERE id = ?', [l.id]);
            supabase.from('connect_social_links').delete().eq('id', l.id).then();
          } catch (e) {
            console.error('[useProfile] Clean up duplicate error:', e);
          }
        }
      }
      setSocialLinks(uniqueLinks);

      if (!isOwnProfile && p) {
        setStats({
          totalTasksCompleted: (p as any).tasks_completed_count || 0,
          longestStreak: (p as any).longest_streak || 0,
          totalFocusMinutes: ((p as any).focus_hours || 0) * 60,
        });
      } else {
        const userStats = getUserStats(userId);
        setStats(userStats);
      }

      // Sync friendships from cloud to local SQLite to ensure the friendsCount is perfectly accurate
      if (userId && userId !== 'guest') {
        try {
          const { data: cloudFriendships, error: fError } = await supabase.from('connect_friendships')
            .select('*')
            .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
          if (cloudFriendships) {
            db.runSync('DELETE FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?', [userId, userId]);
            cloudFriendships.forEach(f => {
              db.runSync('INSERT OR REPLACE INTO connect_friendships (id, user_id1, user_id2, created_at) VALUES (?, ?, ?, ?)', [f.id, f.user_id1, f.user_id2, f.created_at]);
            });
          }
        } catch (syncErr) {
          console.warn('[useProfile] Friendship sync failed:', syncErr);
        }
      }

      const friendsCount = db.getFirstSync<{ c: number }>(
        'SELECT COUNT(*) as c FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?',
        [userId, userId]
      )?.c || 0;
      setFollowingCount(friendsCount);
      setFollowersCount(friendsCount);

      if (!isOwnProfile) {
        if (currentUserId !== 'guest') {
          try {
            // Sync blocks for this interaction
            const { data: cloudBlocks } = await supabase.from('connect_blocks')
              .select('*')
              .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${currentUserId})`);
            if (cloudBlocks) {
              cloudBlocks.forEach(b => {
                db.runSync('INSERT OR REPLACE INTO connect_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)', [b.id, b.blocker_id, b.blocked_id, b.created_at]);
              });
            }

            // Sync friend requests for this interaction
            const { data: cloudReqs } = await supabase.from('connect_friend_requests')
              .select('*')
              .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`);
            if (cloudReqs && cloudReqs.length > 0) {
              cloudReqs.forEach(r => {
                db.runSync('INSERT OR REPLACE INTO connect_friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?, ?)', [r.id, r.sender_id, r.receiver_id, r.status, r.created_at]);
              });
            } else {
              db.runSync('DELETE FROM connect_friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [currentUserId, userId, userId, currentUserId]);
            }
          } catch (syncErr) {
            console.warn('[useProfile] Relationship sync failed:', syncErr);
          }
        }

        const checkBlock = db.getFirstSync<{ id: string }>(
          'SELECT id FROM connect_blocks WHERE blocker_id = ? AND blocked_id = ?',
          [currentUserId, userId]
        );
        if (checkBlock) {
          setConnectionState('blocked');
          setIsFollowing(false);
        } else {
          const checkFriendship = db.getFirstSync<{ id: string }>(
            'SELECT id FROM connect_friendships WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)',
            [currentUserId, userId, userId, currentUserId]
          );
          if (checkFriendship) {
            setConnectionState('friends');
            setIsFollowing(true);
          } else {
            setIsFollowing(false);
            const checkSent = db.getFirstSync<{ id: string }>(
              'SELECT id FROM connect_friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = \'pending\'',
              [currentUserId, userId]
            );
            if (checkSent) {
              setConnectionState('sent');
            } else {
              const checkReceived = db.getFirstSync<{ id: string }>(
                'SELECT id FROM connect_friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = \'pending\'',
                [userId, currentUserId]
              );
              if (checkReceived) {
                setConnectionState('received');
              } else {
                setConnectionState('none');
              }
            }
          }
        }
      }

      if (p && p.xp > 0) {
        const higherCount = db.getFirstSync<{c: number}>('SELECT COUNT(*) as c FROM connect_profiles WHERE xp > ?', [p.xp])?.c || 0;
        setRank(higherCount + 1);
      } else {
        setRank(null);
      }

      const recs = db.getAllSync<{achievement_key: string}>('SELECT achievement_key FROM connect_achievements WHERE user_id = ?', [userId]);
      const keys = new Set(recs.map(r => r.achievement_key));
      const unlocked = ACHIEVEMENTS.filter(a => keys.has(a.key));
      setUnlockedAchievements(unlocked);

    } catch (e) {
      console.error('[useProfile] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const unsubscribe = subscribeToConnectEvents((event) => {
      if (event.type === 'XP_UPDATED' || event.type === 'LEVEL_UP') {
        fetchProfile();
      }
    });

    // ── Real-time: refresh friend count when friendships change ──────
    if (userId && userId !== 'guest') {
      const friendCountChannel1Name = `profile_friends_u1_${userId}_${Math.random().toString(36).substring(5)}`;
      const friendCountChannel1 = supabase
        .channel(friendCountChannel1Name)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connect_friendships',
            filter: `user_id1=eq.${userId}`,
          },
          () => {
            fetchProfile();
          }
        )
        .subscribe();

      const friendCountChannel2Name = `profile_friends_u2_${userId}_${Math.random().toString(36).substring(5)}`;
      const friendCountChannel2 = supabase
        .channel(friendCountChannel2Name)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connect_friendships',
            filter: `user_id2=eq.${userId}`,
          },
          () => {
            fetchProfile();
          }
        )
        .subscribe();

      return () => {
        unsubscribe();
        supabase.removeChannel(friendCountChannel1);
        supabase.removeChannel(friendCountChannel2);
      };
    }

    return unsubscribe;
  }, [userId]);

  const updateProfile = async (updates: Partial<ConnectProfile>) => {
    if (!profile || !isOwnProfile) return false;
    const now = new Date().toISOString();
    try {
      if (updates.username && updates.username !== profile.username) {
        const { data, error } = await supabase.from('connect_profiles').select('id').eq('username', updates.username).neq('user_id', currentUserId).single();
        if (data) return false;
      }

      const keys = Object.keys(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const vals = keys.map(k => (updates as any)[k]);

      db.runSync(`UPDATE connect_profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`, [...vals, now, currentUserId]);
      
      setProfile({ ...profile, ...updates, updated_at: now } as ConnectProfile);

      await supabase.from('connect_profiles').update({ ...updates, updated_at: now }).eq('user_id', currentUserId);

      // Also sync back to main profiles table & auth store
      const { profile: currentAuthProfile } = useAuthStore.getState();
      if (currentAuthProfile) {
        const authUpdates: any = {};
        if (updates.username) authUpdates.username = updates.username;
        if (updates.bio !== undefined) authUpdates.bio = updates.bio;
        if (updates.avatar_url !== undefined) authUpdates.avatar_url = updates.avatar_url;

        useAuthStore.setState({ profile: { ...currentAuthProfile, ...authUpdates } });
        supabase.from('profiles').update(authUpdates).eq('id', currentUserId).then(({ error }) => { if (error) console.error('[updateProfile] main sync error:', error); });
      }

      return true;
    } catch (e) {
      console.error('[updateProfile] error:', e);
      return false;
    }
  };

  const addSocialLink = async (platform: string, url: string) => {
    if (!isOwnProfile || socialLinks.length >= 5) return false;
    const platformId = normalizePlatformId(platform);
    const normalizedUrl = normalizeSocialUrl(url);
    const id = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    try {
      db.runSync('INSERT INTO connect_social_links VALUES (?, ?, ?, ?, ?)', [
        id,
        currentUserId,
        platformId,
        normalizedUrl,
        now,
      ]);
      const newLink = { id, user_id: currentUserId, platform: platformId, url: normalizedUrl, created_at: now };
      setSocialLinks([...socialLinks, newLink]);
      await supabase.from('connect_social_links').insert(newLink);
      return true;
    } catch (e) {
      console.error('[addSocialLink] error:', e);
      return false;
    }
  };

  const deleteSocialLink = async (linkId: string) => {
    if (!isOwnProfile) return;
    try {
      db.runSync('DELETE FROM connect_social_links WHERE id = ?', [linkId]);
      setSocialLinks(prev => prev.filter(l => l.id !== linkId));
      await supabase.from('connect_social_links').delete().eq('id', linkId);
    } catch (e) {
      console.error('[deleteSocialLink] error:', e);
    }
  };

  return {
    profile,
    levelTitle: profile ? getLevelTitle(profile.level) : 'Beginner',
    socialLinks,
    stats,
    rank,
    followingCount,
    followersCount,
    unlockedAchievements,
    isFollowing,
    connectionState,
    loading,
    refresh: fetchProfile,
    updateProfile,
    addSocialLink,
    deleteSocialLink,
  };
};
