import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AdminRole = 'user' | 'moderator' | 'admin' | 'owner';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  provider: string | null;
  avatar_url: string | null;
  role: AdminRole;
  pro_status: boolean;
  pro_until: string | null;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Report {
  id: string;
  user_id: string | null;
  type: 'bug' | 'suggestion' | 'problem';
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface RemoteConfig {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}
