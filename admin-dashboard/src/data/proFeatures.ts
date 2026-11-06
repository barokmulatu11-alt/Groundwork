import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Cloud,
  Crown,
  Flame,
  Headphones,
  LayoutGrid,
  Link2,
  Lock,
  Moon,
  Palette,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  Activity,
  Award,
} from "lucide-react";

export type ProFeatureItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type ProFeatureSection = {
  title: string;
  features: ProFeatureItem[];
};

/** Groundwork Pro perks — core productivity is 100% free; Pro elevates aesthetics, deep insights, and prestige. */
export const PRO_FEATURE_SECTIONS: ProFeatureSection[] = [
  {
    title: "Deep Analytics & Insights",
    features: [
      {
        icon: BarChart3,
        title: "Advanced Focus Velocity",
        desc: "Detailed hour-by-hour focus heatmaps, category splits, and weekly distribution charts",
      },
      {
        icon: TrendingUp,
        title: "Habit Compounding Metrics",
        desc: "Long-term consistency curves and streak velocity to visualize your compounding momentum",
      },
      {
        icon: Activity,
        title: "Weekly Productivity Recaps",
        desc: "Automated end-of-week breakdown comparing your task completions, focus time, and habit retention",
      },
      {
        icon: Target,
        title: "Custom Focus Presets",
        desc: "Unlimited customized timer intervals, break cycles, and task-linked deep work sprints",
      },
      {
        icon: Headphones,
        title: "Focus Soundscapes",
        desc: "Curated ambient audio and background frequencies designed for deep cognitive flow",
      },
      {
        icon: Tag,
        title: "Smart Task Categorization",
        desc: "Multi-tag filtering, custom prioritization matrices, and high-impact project labels",
      },
    ],
  },
  {
    title: "Appearance & Logo Center",
    features: [
      {
        icon: Palette,
        title: "Exclusive Custom App Icons",
        desc: "Unlock the full Logo Center with 9+ crafted launcher icons like OLED Black, Obsidian, and Gold",
      },
      {
        icon: Moon,
        title: "Architectural OLED Themes",
        desc: "Handcrafted dark and light color systems tailored for battery efficiency and high visual clarity",
      },
      {
        icon: LayoutGrid,
        title: "Interactive Home Widgets",
        desc: "Quick-glance Android home screen widgets for your top priority tasks and active habit streaks",
      },
      {
        icon: Sparkles,
        title: "Custom Accent Glows",
        desc: "Fine-tune interface highlights, ambient backdrops, and active streak luminescence",
      },
      {
        icon: Cloud,
        title: "Priority Cloud Backup",
        desc: "Dual-cloud instant synchronization across Supabase and Neon with offline-first persistence",
      },
      {
        icon: Lock,
        title: "Biometric App Shield",
        desc: "Secure your workspace with instant fingerprint, face unlock, or custom security PIN",
      },
    ],
  },
  {
    title: "Connect & Squad Prestige",
    features: [
      {
        icon: Crown,
        title: "Golden Pro Profile Flair",
        desc: "Distinctive Crown badge, glowing avatar ring, and highlighted placement on leaderboards",
      },
      {
        icon: Trophy,
        title: "Pro XP Multipliers",
        desc: "Accelerate your level progression with bonus XP boosts on completed deep work sessions",
      },
      {
        icon: Award,
        title: "Exclusive Pro Achievements",
        desc: "Access an elite achievement lane with rare badges reserved for top consistent performers",
      },
      {
        icon: Users,
        title: "Squad Leaderboard Highlights",
        desc: "Stand out in your community squads and celebrate milestone accomplishments with friends",
      },
      {
        icon: Link2,
        title: "Expanded Connect Portfolio",
        desc: "Showcase your GitHub, LinkedIn, portfolio, and social channels directly on your profile",
      },
      {
        icon: Zap,
        title: "Early Access Releases",
        desc: "Test experimental features, beta modules, and new workflow tools before public launch",
      },
    ],
  },
];

export type MilestoneRoadmapItem = {
  milestone: string;
  requirement: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  category: string;
  badge: string;
};

/**
 * Verifiable milestone rewards — users do NOT pay for Pro with money.
 * They earn Pro features permanently by hitting productivity milestones.
 */
export const MILESTONE_ROADMAP: MilestoneRoadmapItem[] = [
  {
    milestone: "Milestone 1",
    requirement: "5 Focus Sessions",
    title: "Custom Focus Presets",
    desc: "Configure custom Pomodoro intervals, rest cycles, and deep work sprint lengths.",
    icon: Target,
    category: "Focus",
    badge: "100% Free Unlock",
  },
  {
    milestone: "Milestone 2",
    requirement: "5 Habit Check-in Days",
    title: "Habit Consistency Heatmaps",
    desc: "90-day GitHub-style visual consistency heatmaps to track your compounding streaks.",
    icon: Flame,
    category: "Habits",
    badge: "Streak Momentum",
  },
  {
    milestone: "Milestone 3",
    requirement: "10 Completed Tasks",
    title: "Biometric App Shield",
    desc: "Lock down your daily workflow with fingerprint, Face ID, or a custom security PIN.",
    icon: Lock,
    category: "Security",
    badge: "Zero-Knowledge",
  },
  {
    milestone: "Milestone 4",
    requirement: "10 Focus Sessions + 10 Habit Days",
    title: "Deep Velocity Analytics",
    desc: "Weekly productivity forecasts, habit retention rates, and hour-by-hour focus heatmaps.",
    icon: BarChart3,
    category: "Analytics",
    badge: "Power Insights",
  },
  {
    milestone: "Milestone 5",
    requirement: "30 Tasks + 15 Focus Sessions",
    title: "Logo Center & OLED Themes",
    desc: "Unlock 9+ crafted launcher app icons (OLED Black, Obsidian, Gold) and architectural surfaces.",
    icon: Palette,
    category: "Appearance",
    badge: "Aesthetic Prestige",
  },
  {
    milestone: "Milestone 6",
    requirement: "40 Tasks + 14 Habit Days",
    title: "Cloud Vault & Priority Sync",
    desc: "Instant automated background snapshots across Supabase and Neon with offline-first durability.",
    icon: Cloud,
    category: "Sync",
    badge: "Permanent Sync",
  },
];

export const PRO_PLAN_LABEL = "Earned permanently through consistency milestones — 100% free with no paywalls";
