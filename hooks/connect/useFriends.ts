import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';
import { supabase } from '@/lib/connect/connectSupabase';
import { getLevelTitle, addXP, XP_VALUES } from '@/lib/connect/xpSystem';
import { checkAchievements } from '@/lib/connect/achievementEngine';

export interface FriendUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  levelTitle: string;
  xp: number;
  connectionState: 'none' | 'sent' | 'received' | 'friends' | 'blocked';
  requestId?: string;
}

export const useFriends = () => {
  const { session, isGuest } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendUser[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  // Anti-spam request timestamp tracking
  const lastRequestTime = useRef<number>(0);

  const enrichUsers = useCallback((profiles: any[], stateMap: Map<string, { state: 'none' | 'sent' | 'received' | 'friends' | 'blocked'; reqId?: string }>): FriendUser[] => {
    return profiles.map(p => {
      const stateInfo = stateMap.get(p.user_id) || { state: 'none' };
      return {
        user_id: p.user_id,
        username: p.username || 'User',
        avatar_url: p.avatar_url || null,
        level: p.level || 1,
        levelTitle: getLevelTitle(p.level || 1),
        xp: p.xp || 0,
        connectionState: stateInfo.state,
        requestId: stateInfo.reqId,
      };
    });
  }, []);

  const fetchFriendsData = useCallback(async () => {
    if (!currentUserId || currentUserId === 'guest') {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch Blocks
      const blockRows = db.getAllSync<{ blocked_id: string }>('SELECT blocked_id FROM connect_blocks WHERE blocker_id = ?', [currentUserId]);
      const blockedSet = new Set(blockRows.map(r => r.blocked_id));
      setBlockedUsers(Array.from(blockedSet));

      const blockedByRows = db.getAllSync<{ blocker_id: string }>('SELECT blocker_id FROM connect_blocks WHERE blocked_id = ?', [currentUserId]);
      const blockedBySet = new Set(blockedByRows.map(r => r.blocker_id));

      // 2. Fetch Friend Requests
      const reqRows = db.getAllSync<any>('SELECT * FROM connect_friend_requests WHERE sender_id = ? OR receiver_id = ?', [currentUserId, currentUserId]);
      
      // 3. Fetch Friendhips
      const friendshipRows = db.getAllSync<any>('SELECT * FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?', [currentUserId, currentUserId]);

      // Auto-resolve mutual pending friend requests
      let hasMutual = false;
      const pendingSent = reqRows.filter(r => r.sender_id.trim().toLowerCase() === currentUserId.trim().toLowerCase() && r.status === 'pending');
      const pendingReceived = reqRows.filter(r => r.receiver_id.trim().toLowerCase() === currentUserId.trim().toLowerCase() && r.status === 'pending');
      
      for (const sent of pendingSent) {
        const mutual = pendingReceived.find(rec => rec.sender_id.trim().toLowerCase() === sent.receiver_id.trim().toLowerCase());
        if (mutual) {
          console.log('[useFriends] Mutual pending request detected with:', sent.receiver_id, '. Resolving into friendship...');
          hasMutual = true;
          const friendshipId = Math.random().toString(36).substring(7);
          const now = new Date().toISOString();
          const user1 = currentUserId < sent.receiver_id ? currentUserId : sent.receiver_id;
          const user2 = currentUserId < sent.receiver_id ? sent.receiver_id : currentUserId;

          // Local SQLite update
          db.runSync('DELETE FROM connect_friend_requests WHERE id = ? OR id = ?', [sent.id, mutual.id]);
          db.runSync(
            'INSERT OR REPLACE INTO connect_friendships (id, user_id1, user_id2, created_at) VALUES (?, ?, ?, ?)',
            [friendshipId, user1, user2, now]
          );

          // Cloud update
          supabase.from('connect_friend_requests').delete().in('id', [sent.id, mutual.id]).then();
          supabase.from('connect_friendships').insert({
            id: friendshipId,
            user_id1: user1,
            user_id2: user2,
            created_at: now
          }).then();

          // Award 5 XP for accepted friendship
          addXP(currentUserId, 5, 'Friendship accepted').then(() => {
            checkAchievements(currentUserId);
          });
        }
      }

      if (hasMutual) {
        // Re-fetch clean states
        setTimeout(() => fetchFriendsData(), 200);
        return;
      }

      // Map out all relationship states
      const stateMap = new Map<string, { state: 'none' | 'sent' | 'received' | 'friends' | 'blocked'; reqId?: string }>();

      // Blocks first
      blockedSet.forEach(id => stateMap.set(id, { state: 'blocked' }));

      // Friendships
      const friendIdsSet = new Set<string>();
      friendshipRows.forEach(f => {
        const friendId = f.user_id1.trim().toLowerCase() === currentUserId.trim().toLowerCase() ? f.user_id2 : f.user_id1;
        if (!blockedSet.has(friendId) && !blockedBySet.has(friendId)) {
          stateMap.set(friendId, { state: 'friends' });
          friendIdsSet.add(friendId);
        }
      });

      // Requests
      const incomingIdsSet = new Set<string>();
      const sentIdsSet = new Set<string>();
      reqRows.forEach(r => {
        if (r.status === 'pending') {
          if (r.sender_id.trim().toLowerCase() === currentUserId.trim().toLowerCase()) {
            const receiverId = r.receiver_id;
            if (!blockedSet.has(receiverId) && !blockedBySet.has(receiverId)) {
              stateMap.set(receiverId, { state: 'sent', reqId: r.id });
              sentIdsSet.add(receiverId);
            }
          } else {
            const senderId = r.sender_id;
            if (!blockedSet.has(senderId) && !blockedBySet.has(senderId)) {
              stateMap.set(senderId, { state: 'received', reqId: r.id });
              incomingIdsSet.add(senderId);
            }
          }
        }
      });

      // Gather all related user profiles
      const allUserIds = Array.from(new Set([...Array.from(friendIdsSet), ...Array.from(incomingIdsSet), ...Array.from(sentIdsSet)]));

      let profiles: any[] = [];
      if (allUserIds.length > 0) {
        const placeholders = allUserIds.map(() => '?').join(',');
        profiles = db.getAllSync<any>(`SELECT * FROM connect_profiles WHERE user_id IN (${placeholders})`, allUserIds);

        // If local count doesn't match total profiles, sync from Supabase
        if (profiles.length < allUserIds.length) {
          const foundIds = new Set(profiles.map(p => p.user_id));
          const missingIds = allUserIds.filter(id => !foundIds.has(id));

          if (missingIds.length > 0) {
            const { data: cloudProfiles, error: cpError } = await supabase.from('connect_profiles').select('*').in('user_id', missingIds);
            if (cpError) {
              console.error('[useFriends] cloudProfiles fetch error:', cpError);
            }
            if (cloudProfiles && cloudProfiles.length > 0) {
              cloudProfiles.forEach(p => {
                if (!profiles.some(existing => existing.user_id === p.user_id)) {
                  profiles.push(p);
                }
                db.runSync(
                  'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [p.id, p.user_id, p.username, p.bio, p.avatar_url, p.xp, p.level, p.productivity_category, p.joined_at, p.updated_at]
                );
              });
            }

            // Fallback for profiles that exist only in standard 'profiles' table (e.g., brand new users)
            const stillMissingIds = allUserIds.filter(id => !profiles.some(existing => existing.user_id === id));
            if (stillMissingIds.length > 0) {
              const { data: standardProfiles, error: spError } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', stillMissingIds);
              if (spError) {
                console.error('[useFriends] standardProfiles fetch error:', spError);
              }
              if (standardProfiles && standardProfiles.length > 0) {
                standardProfiles.forEach(sp => {
                  const p = {
                    id: Math.random().toString(36).substring(7),
                    user_id: sp.id,
                    username: sp.username || sp.full_name || 'User',
                    bio: 'On a mission to stay productive.',
                    avatar_url: sp.avatar_url || null,
                    xp: 0,
                    level: 1,
                    productivity_category: 'General',
                    joined_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  if (!profiles.some(existing => existing.user_id === p.user_id)) {
                    profiles.push(p);
                  }
                  db.runSync(
                    'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.user_id, p.username, p.bio, p.avatar_url, p.xp, p.level, p.productivity_category, p.joined_at, p.updated_at]
                  );
                });
              }
            }
          }
        }

        // Guarantee that EVERY user in allUserIds has a profile row so they are NEVER hidden from lists due to RLS/db errors!
        allUserIds.forEach(userId => {
          if (!profiles.some(p => p.user_id === userId)) {
            const p = {
              id: Math.random().toString(36).substring(7),
              user_id: userId,
              username: 'Active User',
              bio: 'On a mission to stay productive.',
              avatar_url: null,
              xp: 0,
              level: 1,
              productivity_category: 'General',
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            profiles.push(p);
            db.runSync(
              'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [p.id, p.user_id, p.username, p.bio, p.avatar_url, p.xp, p.level, p.productivity_category, p.joined_at, p.updated_at]
            );
          }
        });
      }

      const enriched = enrichUsers(profiles, stateMap);

      setFriends(enriched.filter(u => u.connectionState === 'friends'));
      setIncomingRequests(enriched.filter(u => u.connectionState === 'received'));
      setSentRequests(enriched.filter(u => u.connectionState === 'sent'));

    } catch (e) {
      console.error('[useFriends] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, enrichUsers]);

  // Sync with cloud on load or focus
  useEffect(() => {
    fetchFriendsData();

    if (!currentUserId || currentUserId === 'guest') return;

    // Background sync from Supabase to SQLite
    const syncWithCloud = async () => {
      try {
        // Sync blocks
        const { data: cloudBlocks, error: blocksError } = await supabase.from('connect_blocks').select('*').eq('blocker_id', currentUserId);
        if (blocksError) {
          console.error('[useFriends] syncWithCloud blocks error:', blocksError);
        }
        if (cloudBlocks) {
          db.runSync('DELETE FROM connect_blocks WHERE blocker_id = ?', [currentUserId]);
          cloudBlocks.forEach(b => {
            db.runSync('INSERT OR REPLACE INTO connect_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)', [b.id, b.blocker_id, b.blocked_id, b.created_at]);
          });
        }

        // Sync friend requests
        const { data: cloudReqs, error: reqsError } = await supabase.from('connect_friend_requests')
          .select('*')
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
        if (reqsError) {
          console.error('[useFriends] syncWithCloud reqs error:', reqsError);
        }
        if (cloudReqs) {
          // Identify mutual requests (both sent and received requests are pending)
          const sentReqs = cloudReqs.filter(r => r.sender_id.trim().toLowerCase() === currentUserId.trim().toLowerCase() && r.status === 'pending');
          const receivedReqs = cloudReqs.filter(r => r.receiver_id.trim().toLowerCase() === currentUserId.trim().toLowerCase() && r.status === 'pending');
          
          const mutualPartners = new Set<string>();
          sentReqs.forEach(sr => {
            const hasMutual = receivedReqs.some(rr => rr.sender_id.trim().toLowerCase() === sr.receiver_id.trim().toLowerCase());
            if (hasMutual) {
              mutualPartners.add(sr.receiver_id);
            }
          });

          if (mutualPartners.size > 0) {
            for (const partnerId of mutualPartners) {
              const incoming = receivedReqs.find(rr => rr.sender_id.trim().toLowerCase() === partnerId.trim().toLowerCase());
              if (incoming) {
                // Automatically accept and establish friendship
                await acceptFriendRequest(incoming.id);
              }
            }
            // Re-fetch cloud friend requests after mutual resolutions
            const { data: updatedCloudReqs, error: updatedReqsError } = await supabase.from('connect_friend_requests')
              .select('*')
              .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
            if (updatedReqsError) {
              console.error('[useFriends] syncWithCloud re-fetch reqs error:', updatedReqsError);
            }
            if (updatedCloudReqs) {
              db.runSync('DELETE FROM connect_friend_requests WHERE sender_id = ? OR receiver_id = ?', [currentUserId, currentUserId]);
              updatedCloudReqs.forEach(r => {
                db.runSync('INSERT OR REPLACE INTO connect_friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?, ?)', [r.id, r.sender_id, r.receiver_id, r.status, r.created_at]);
              });
            }
          } else {
            db.runSync('DELETE FROM connect_friend_requests WHERE sender_id = ? OR receiver_id = ?', [currentUserId, currentUserId]);
            cloudReqs.forEach(r => {
              db.runSync('INSERT OR REPLACE INTO connect_friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, ?, ?)', [r.id, r.sender_id, r.receiver_id, r.status, r.created_at]);
            });
          }
        }

        // Sync friendships
        const { data: cloudFriendships, error: friendshipsError } = await supabase.from('connect_friendships')
          .select('*')
          .or(`user_id1.eq.${currentUserId},user_id2.eq.${currentUserId}`);
        if (friendshipsError) {
          console.error('[useFriends] syncWithCloud friendships error:', friendshipsError);
        }
        if (cloudFriendships) {
          db.runSync('DELETE FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?', [currentUserId, currentUserId]);
          cloudFriendships.forEach(f => {
            db.runSync('INSERT OR REPLACE INTO connect_friendships (id, user_id1, user_id2, created_at) VALUES (?, ?, ?, ?)', [f.id, f.user_id1, f.user_id2, f.created_at]);
          });
        }

        fetchFriendsData();
      } catch (err) {
        console.warn('[useFriends] Cloud sync background warning:', err);
      }
    };

    syncWithCloud();

    // ── Real-time subscriptions ──────────────────────────────────────
    // 1. Listen for new INCOMING friend requests (user B gets notified when user A sends a request)
    const requestChannelName = `friend_requests_in_${currentUserId}_${Math.random().toString(36).substring(5)}`;
    const requestChannel = supabase
      .channel(requestChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connect_friend_requests',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('[useFriends] Real-time: new incoming request from', (payload.new as any)?.sender_id);
          syncWithCloud();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'connect_friend_requests',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          syncWithCloud();
        }
      )
      .subscribe();

    // 2. Listen for friendship changes where this user is user_id1
    const friendshipChannel1Name = `friendships_u1_${currentUserId}_${Math.random().toString(36).substring(5)}`;
    const friendshipChannel1 = supabase
      .channel(friendshipChannel1Name)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connect_friendships',
          filter: `user_id1=eq.${currentUserId}`,
        },
        () => {
          console.log('[useFriends] Real-time: friendship (user_id1) changed');
          syncWithCloud();
        }
      )
      .subscribe();

    // 3. Listen for friendship changes where this user is user_id2
    const friendshipChannel2Name = `friendships_u2_${currentUserId}_${Math.random().toString(36).substring(5)}`;
    const friendshipChannel2 = supabase
      .channel(friendshipChannel2Name)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connect_friendships',
          filter: `user_id2=eq.${currentUserId}`,
        },
        () => {
          console.log('[useFriends] Real-time: friendship (user_id2) changed');
          syncWithCloud();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(friendshipChannel1);
      supabase.removeChannel(friendshipChannel2);
    };
  }, [currentUserId, fetchFriendsData]);

  // Search logic
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const blockRows = db.getAllSync<{ blocked_id: string }>('SELECT blocked_id FROM connect_blocks WHERE blocker_id = ?', [currentUserId]);
        const blockedSet = new Set(blockRows.map(r => r.blocked_id));

        const blockedByRows = db.getAllSync<{ blocker_id: string }>('SELECT blocker_id FROM connect_blocks WHERE blocked_id = ?', [currentUserId]);
        const blockedBySet = new Set(blockedByRows.map(r => r.blocker_id));

        // Get relationship states
        const reqRows = db.getAllSync<any>('SELECT * FROM connect_friend_requests WHERE sender_id = ? OR receiver_id = ?', [currentUserId, currentUserId]);
        const friendshipRows = db.getAllSync<any>('SELECT * FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?', [currentUserId, currentUserId]);

        const stateMap = new Map<string, { state: 'none' | 'sent' | 'received' | 'friends' | 'blocked'; reqId?: string }>();
        blockedSet.forEach(id => stateMap.set(id, { state: 'blocked' }));
        friendshipRows.forEach(f => {
          const friendId = f.user_id1 === currentUserId ? f.user_id2 : f.user_id1;
          stateMap.set(friendId, { state: 'friends' });
        });
        reqRows.forEach(r => {
          if (r.status === 'pending') {
            if (r.sender_id === currentUserId) {
              stateMap.set(r.receiver_id, { state: 'sent', reqId: r.id });
            } else {
              stateMap.set(r.sender_id, { state: 'received', reqId: r.id });
            }
          }
        });

        let profilesList: any[] = [];
        let success = false;

        try {
          // Search Supabase profiles table directly - all real users are here
          const { data: profileMatches, error: searchError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .or(`username.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`)
            .neq('id', currentUserId)
            .limit(20);

          if (!searchError && profileMatches && profileMatches.length > 0) {
            // Filter blocked users immediately
            const visible = profileMatches.filter(
              p => !blockedSet.has(p.id) && !blockedBySet.has(p.id)
            );

            // Fetch connect_profiles for XP/level enrichment (optional — won't block results)
            const visibleIds = visible.map(p => p.id);
            const { data: connectProfiles } = await supabase
              .from('connect_profiles')
              .select('user_id, xp, level')
              .in('user_id', visibleIds);

            const connectMap = new Map<string, { xp: number; level: number }>();
            (connectProfiles || []).forEach(c => connectMap.set(c.user_id, { xp: c.xp, level: c.level }));

            // Build profilesList combining profiles + optional connect enrichment
            profilesList = visible.map(p => ({
              user_id: p.id,
              username: p.username || p.full_name || 'User',
              avatar_url: p.avatar_url || null,
              xp: connectMap.get(p.id)?.xp || 0,
              level: connectMap.get(p.id)?.level || 1,
            }));

            success = true;
          } else if (!searchError && profileMatches && profileMatches.length === 0) {
            success = true; // Searched online, genuinely 0 matches
          }
        } catch (e) {
          console.warn('[useFriends] Supabase search failed/offline, falling back to SQLite:', e);
        }

        // Fallback to SQLite connect_profiles if offline
        if (!success) {
          const rows = db.getAllSync<any>(
            'SELECT * FROM connect_profiles WHERE (username LIKE ? OR bio LIKE ?) AND user_id != ? LIMIT 20',
            [`%${searchQuery.trim()}%`, `%${searchQuery.trim()}%`, currentUserId]
          );
          profilesList = rows
            .filter(p => !blockedSet.has(p.user_id) && !blockedBySet.has(p.user_id))
            .map(p => ({
              user_id: p.user_id,
              username: p.username || 'User',
              avatar_url: p.avatar_url || null,
              xp: p.xp || 0,
              level: p.level || 1,
            }));
        }

        setSearchResults(enrichUsers(profilesList, stateMap));
      } catch (e) {
        console.error('[useFriends] search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, enrichUsers]);

  // --- ACTIONS ---

  // 1. Send Friend Request (with Anti-spam protection)
  const sendFriendRequest = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === 'guest' || targetUserId === currentUserId) return false;

    // Spam Protection: 3-second cooldown between requests
    const nowMs = Date.now();
    if (nowMs - lastRequestTime.current < 3000) {
      return false;
    }
    lastRequestTime.current = nowMs;

    // Limit check: Prevent more than 50 pending sent requests
    const pendingSentCount = db.getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM connect_friend_requests WHERE sender_id = ? AND status = \'pending\'',
      [currentUserId]
    )?.c || 0;
    if (pendingSentCount >= 50) {
      return false;
    }

    // Check if they already sent us a request. If so, automatically accept it!
    const checkIncoming = db.getFirstSync<{ id: string }>(
      'SELECT id FROM connect_friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = \'pending\'',
      [targetUserId, currentUserId]
    );
    if (checkIncoming) {
      await acceptFriendRequest(checkIncoming.id);
      return true;
    }

    // Query Supabase directly as a backup check to prevent mutual duplicate pending requests
    try {
      const { data: cloudIncoming } = await supabase
        .from('connect_friend_requests')
        .select('id')
        .eq('sender_id', targetUserId)
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();

      if (cloudIncoming) {
        await acceptFriendRequest(cloudIncoming.id);
        return true;
      }
    } catch (err) {
      console.warn('[sendFriendRequest] cloud check incoming catch:', err);
    }

    // Check if blocked or already friends or request already exists
    const checkExists = db.getFirstSync<{ id: string }>(
      'SELECT id FROM connect_friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = \'pending\'',
      [currentUserId, targetUserId]
    );
    if (checkExists) return false;

    const checkFriends = db.getFirstSync<{ id: string }>(
      'SELECT id FROM connect_friendships WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)',
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );
    if (checkFriends) return false;

    const requestId = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();

    // Optimistic UI update
    setSearchResults(prev => prev.map(u => u.user_id === targetUserId ? { ...u, connectionState: 'sent', requestId } : u));
    setSentRequests(prev => {
      const existing = prev.find(u => u.user_id === targetUserId);
      if (existing) return prev;
      const targetUser = searchResults.find(r => r.user_id === targetUserId) || {
        user_id: targetUserId,
        username: 'User',
        avatar_url: null,
        level: 1,
        levelTitle: 'Beginner',
        xp: 0,
        connectionState: 'sent',
      };
      return [...prev, { ...targetUser, connectionState: 'sent', requestId } as FriendUser];
    });

    try {
      db.runSync(
        'INSERT INTO connect_friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, "pending", ?)',
        [requestId, currentUserId, targetUserId, now]
      );
      await supabase.from('connect_friend_requests').insert({
        id: requestId,
        sender_id: currentUserId,
        receiver_id: targetUserId,
        status: 'pending',
        created_at: now,
      });
      return true;
    } catch (e) {
      console.error('[sendFriendRequest] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 2. Accept Friend Request
  const acceptFriendRequest = async (reqId: string) => {
    if (!currentUserId || currentUserId === 'guest') return false;

    // Retrieve request details
    const request = db.getFirstSync<{ sender_id: string; receiver_id: string }>(
      'SELECT sender_id, receiver_id FROM connect_friend_requests WHERE id = ?',
      [reqId]
    );
    if (!request) return false;

    const senderId = request.sender_id;
    const now = new Date().toISOString();
    const friendshipId = Math.random().toString(36).substring(7);

    // Arrange user IDs deterministically
    const user1 = currentUserId < senderId ? currentUserId : senderId;
    const user2 = currentUserId < senderId ? senderId : currentUserId;

    // Optimistic UI update
    setIncomingRequests(prev => prev.filter(u => u.requestId !== reqId));
    setFriends(prev => {
      const existing = prev.find(u => u.user_id === senderId);
      if (existing) return prev;
      const incomingUser = incomingRequests.find(r => r.user_id === senderId) || {
        user_id: senderId,
        username: 'User',
        avatar_url: null,
        level: 1,
        levelTitle: 'Beginner',
        xp: 0,
        connectionState: 'friends',
      };
      return [...prev, { ...incomingUser, connectionState: 'friends' } as FriendUser];
    });

    try {
      // Delete the request and insert the friendship locally
      db.runSync('DELETE FROM connect_friend_requests WHERE id = ?', [reqId]);
      // Delete any duplicate requests in the opposite direction
      db.runSync('DELETE FROM connect_friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [currentUserId, senderId, senderId, currentUserId]);
      
      db.runSync(
        'INSERT INTO connect_friendships (id, user_id1, user_id2, created_at) VALUES (?, ?, ?, ?)',
        [friendshipId, user1, user2, now]
      );

      // Perform Supabase actions
      await supabase.from('connect_friend_requests').delete().eq('id', reqId);
      await supabase.from('connect_friend_requests').delete().or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${senderId}),and(sender_id.eq.${senderId},receiver_id.eq.${currentUserId})`);
      
      await supabase.from('connect_friendships').insert({
        id: friendshipId,
        user_id1: user1,
        user_id2: user2,
        created_at: now,
      });

      // Award small XP (5 XP for accepted friendship)
      await addXP(currentUserId, 5, 'Friendship accepted');

      // Refresh to ensure achievements are checked and triggered
      checkAchievements(currentUserId);

      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[acceptFriendRequest] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 3. Decline Friend Request
  const declineFriendRequest = async (reqId: string) => {
    if (!currentUserId || currentUserId === 'guest') return false;

    setIncomingRequests(prev => prev.filter(u => u.requestId !== reqId));

    try {
      db.runSync('DELETE FROM connect_friend_requests WHERE id = ?', [reqId]);
      await supabase.from('connect_friend_requests').delete().eq('id', reqId);
      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[declineFriendRequest] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 4. Cancel Friend Request
  const cancelFriendRequest = async (reqId: string) => {
    if (!currentUserId || currentUserId === 'guest') return false;

    setSentRequests(prev => prev.filter(u => u.requestId !== reqId));
    setSearchResults(prev => prev.map(u => u.requestId === reqId ? { ...u, connectionState: 'none', requestId: undefined } : u));

    try {
      db.runSync('DELETE FROM connect_friend_requests WHERE id = ?', [reqId]);
      await supabase.from('connect_friend_requests').delete().eq('id', reqId);
      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[cancelFriendRequest] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 5. Remove Friend
  const removeFriend = async (friendUserId: string) => {
    if (!currentUserId || currentUserId === 'guest') return false;

    setFriends(prev => prev.filter(u => u.user_id !== friendUserId));

    try {
      db.runSync(
        'DELETE FROM connect_friendships WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)',
        [currentUserId, friendUserId, friendUserId, currentUserId]
      );
      await supabase.from('connect_friendships')
        .delete()
        .or(`and(user_id1.eq.${currentUserId},user_id2.eq.${friendUserId}),and(user_id1.eq.${friendUserId},user_id2.eq.${currentUserId})`);
      
      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[removeFriend] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 6. Block User
  const blockUser = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === 'guest' || targetUserId === currentUserId) return false;

    const blockId = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();

    // Clean up friendships and requests with this user immediately
    setFriends(prev => prev.filter(u => u.user_id !== targetUserId));
    setIncomingRequests(prev => prev.filter(u => u.user_id !== targetUserId));
    setSentRequests(prev => prev.filter(u => u.user_id !== targetUserId));
    setSearchResults(prev => prev.filter(u => u.user_id !== targetUserId));

    try {
      // 1. Remove friendship if any
      db.runSync(
        'DELETE FROM connect_friendships WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)',
        [currentUserId, targetUserId, targetUserId, currentUserId]
      );
      await supabase.from('connect_friendships')
        .delete()
        .or(`and(user_id1.eq.${currentUserId},user_id2.eq.${targetUserId}),and(user_id1.eq.${targetUserId},user_id2.eq.${currentUserId})`);

      // 2. Remove friend requests if any
      db.runSync(
        'DELETE FROM connect_friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
        [currentUserId, targetUserId, targetUserId, currentUserId]
      );
      await supabase.from('connect_friend_requests')
        .delete()
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

      // 3. Create block record
      db.runSync(
        'INSERT INTO connect_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)',
        [blockId, currentUserId, targetUserId, now]
      );
      await supabase.from('connect_blocks').insert({
        id: blockId,
        blocker_id: currentUserId,
        blocked_id: targetUserId,
        created_at: now,
      });

      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[blockUser] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  // 7. Unblock User
  const unblockUser = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === 'guest') return false;

    try {
      db.runSync('DELETE FROM connect_blocks WHERE blocker_id = ? AND blocked_id = ?', [currentUserId, targetUserId]);
      await supabase.from('connect_blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetUserId);
      fetchFriendsData();
      return true;
    } catch (e) {
      console.error('[unblockUser] error:', e);
      fetchFriendsData();
      return false;
    }
  };

  return {
    friends,
    incomingRequests,
    sentRequests,
    blockedUsers,
    searchResults,
    searchQuery,
    setSearchQuery,
    isSearching,
    loading,
    refresh: fetchFriendsData,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
  };
};
