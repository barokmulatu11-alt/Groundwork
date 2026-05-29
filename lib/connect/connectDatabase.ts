import { db } from '../db';

export const initConnectDb = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS connect_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        productivity_category TEXT DEFAULT 'General',
        joined_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        tasks_completed_count INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        focus_hours INTEGER DEFAULT 0,
        privacy_level TEXT DEFAULT 'public',
        institution TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS connect_social_links (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connect_achievements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        achievement_key TEXT NOT NULL,
        unlocked_at TEXT NOT NULL,
        progress INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS connect_follows (
        id TEXT PRIMARY KEY,
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS connect_friendships (
        id TEXT PRIMARY KEY,
        user_id1 TEXT NOT NULL,
        user_id2 TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id1, user_id2)
      );

      CREATE TABLE IF NOT EXISTS connect_friend_requests (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        UNIQUE(sender_id, receiver_id)
      );

      CREATE TABLE IF NOT EXISTS connect_blocks (
        id TEXT PRIMARY KEY,
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS connect_xp_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON connect_profiles (user_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON connect_achievements (user_id);
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON connect_follows (follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON connect_follows (following_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON connect_friendships (user_id1);
      CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON connect_friendships (user_id2);
      CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON connect_friend_requests (sender_id);
      CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON connect_friend_requests (receiver_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON connect_blocks (blocker_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON connect_blocks (blocked_id);
      CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON connect_xp_log (user_id);
    `);
    
    // Safely add stats columns to existing sqlite tables to prevent startup failures
    try {
      db.execSync('ALTER TABLE connect_profiles ADD COLUMN tasks_completed_count INTEGER DEFAULT 0');
    } catch (_) {}
    try {
      db.execSync('ALTER TABLE connect_profiles ADD COLUMN longest_streak INTEGER DEFAULT 0');
    } catch (_) {}
    try {
      db.execSync('ALTER TABLE connect_profiles ADD COLUMN focus_hours INTEGER DEFAULT 0');
    } catch (_) {}
    try {
      db.execSync('ALTER TABLE connect_profiles ADD COLUMN privacy_level TEXT DEFAULT \'public\'');
    } catch (_) {}
    try {
      db.execSync('ALTER TABLE connect_profiles ADD COLUMN institution TEXT DEFAULT NULL');
    } catch (_) {}

    console.log('[ConnectDB] Tables initialized');
  } catch (e) {
    console.error('[ConnectDB] Error initializing tables:', e);
  }
};
