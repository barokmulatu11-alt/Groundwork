import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  Cloud,
  Crown,
  FileOutput,
  Flame,
  Headphones,
  LayoutGrid,
  Link2,
  Lock,
  Mic,
  Moon,
  Palette,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

export type ProFeatureItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type ProFeatureSection = {
  title: string;
  features: ProFeatureItem[];
};

/** Planned Groundwork Pro perks — all marked "Soon" until release. */
export const PRO_FEATURE_SECTIONS: ProFeatureSection[] = [
  {
    title: 'Productivity',
    features: [
      { icon: CheckCircle2, title: 'Unlimited Tasks', desc: 'No cap on active tasks or projects' },
      { icon: Flame, title: 'Unlimited Habits', desc: 'Track every routine that matters' },
      { icon: Tag, title: 'Categories & Labels', desc: 'Custom tags for tasks and notes' },
      { icon: Bell, title: 'Advanced Reminders', desc: 'Custom sounds, snooze, and repeats' },
      { icon: BarChart3, title: 'Deep Productivity Stats', desc: 'Weekly insights, trends, and recap exports' },
      { icon: Target, title: 'Custom Focus Presets', desc: 'Beyond pomodoro — your timer rules' },
    ],
  },
  {
    title: 'Notes & study',
    features: [
      { icon: BookOpen, title: 'Unlimited Study Spaces', desc: 'More folders and subjects' },
      { icon: Mic, title: 'Longer Voice Notes', desc: 'Extended recording limits' },
      { icon: Lock, title: 'Bulk Note Security', desc: 'Lock notes and folders with biometrics' },
      { icon: FileOutput, title: 'Export to PDF & Markdown', desc: 'Share notes outside the app' },
      { icon: TrendingUp, title: 'Revision Analytics', desc: 'Weak topics and review schedules' },
    ],
  },
  {
    title: 'Connect & social',
    features: [
      { icon: Users, title: 'Extra Social Links', desc: 'More platforms on your profile' },
      { icon: Trophy, title: 'Pro XP Boost', desc: 'Earn more XP from daily actions' },
      { icon: Crown, title: 'Pro Profile Flair', desc: 'Badge, ring, and leaderboard highlight' },
      { icon: Sparkles, title: 'Pro Achievements', desc: 'Exclusive premium badge lane' },
      { icon: Link2, title: 'Referral Rewards', desc: 'Invite friends for Pro perks' },
    ],
  },
  {
    title: 'Appearance & platform',
    features: [
      { icon: Moon, title: 'AMOLED Dark Theme', desc: 'True black for OLED screens' },
      { icon: Palette, title: 'Custom App Icons', desc: 'Personalize your home screen' },
      { icon: Cloud, title: 'Backup & Restore', desc: 'Scheduled export and cloud safety' },
      { icon: LayoutGrid, title: 'Home Screen Widgets', desc: 'Tasks and habits at a glance' },
      { icon: Headphones, title: 'Focus Soundscapes', desc: 'Ambient audio while you work' },
      { icon: Zap, title: 'Early Access', desc: 'Try new features before everyone else' },
    ],
  },
];

export const PRO_PLAN_LABEL = '1 year subscription';
