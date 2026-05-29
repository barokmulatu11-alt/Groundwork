import { db } from '../db';
import { supabase } from './connectSupabase';
import { emitConnectEvent, XP_VALUES, addXP } from './xpSystem';

export interface UserStats {
  totalTasksCompleted: number;
  longestStreak: number;
  totalFocusSessions: number;
  totalFocusMinutes: number;
  hadPerfectDay: boolean;
  level: number;
  followersCount: number;
  followingCount: number;
  hasBio: boolean;
  hasSocialLink: boolean;
  hasAvatar: boolean;
  xp: number;
  isPro: boolean;

  // Extended Note Metrics
  totalNotesCreated: number;
  notesWithDrawings: number;
  notesWithAudio: number;
  notesWithImages: number;
  notesWithFlashcards: number;
  notesWithFormulas: number;
  uniqueFoldersCount: number;
  uniqueTagsCount: number;
  totalStudyHours: number;
  totalFlashcardsCount: number;
  totalFormulasCount: number;

  // Extended Revision Metrics
  highestRevisionScore: number;
  averageRevisionScore: number;
  highRevisionScoreCount: number; // score >= 90
  mediumRevisionScoreCount: number; // score >= 50
  activeRecallNotesCount: number; // contains bracketed recall [[]]

  // Time-based Metrics
  recentLateNightSession: boolean; // activity between 12 AM and 4 AM
  recentEarlyBirdSession: boolean; // activity between 5 AM and 9 AM
  recentThreeAmSurvivor: boolean; // activity between 3 AM and 4 AM

  // Habit/Social Counts
  habitCheckinsCount: number;
  friendshipsCount: number;
}

export interface AchievementConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  category: 'social' | 'productivity' | 'consistency' | 'leaderboard' | 'profile' | 'special' | 'pro' | 'notes' | 'study';
  secret?: boolean;
  check: (stats: UserStats) => boolean;
}

const scaleReward = (original: number): number => {
  if (original <= 30) return 15;
  if (original <= 40) return 20;
  if (original <= 50) return 25;
  if (original <= 75) return 30;
  if (original <= 100) return 35;
  if (original <= 150) return 40;
  if (original <= 250) return 45;
  return 50;
};

const RAW_ACHIEVEMENTS: AchievementConfig[] = [
  // ── 1. NOTES CORE ACHIEVEMENTS (13) ──
  {
    key: 'first_note',
    name: 'First Note',
    description: 'Create your first note',
    icon: 'PenTool',
    color: '#007AFF',
    xpReward: 30,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 1,
  },
  {
    key: 'note_taker',
    name: 'Note Taker',
    description: 'Create 5 notes in Groundwork',
    icon: 'FileText',
    color: '#34C759',
    xpReward: 40,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 5,
  },
  {
    key: 'notes_10',
    name: 'Organized Mind',
    description: 'Create 10 study notes',
    icon: 'BookOpen',
    color: '#5856D6',
    xpReward: 50,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 10,
  },
  {
    key: 'notes_50',
    name: 'Note Scholar',
    description: 'Build a library of 50 notes',
    icon: 'ClipboardList',
    color: '#AF52DE',
    xpReward: 100,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 50,
  },
  {
    key: 'notes_100',
    name: 'Academic Archivist',
    description: 'Create 100 detailed notes',
    icon: 'GraduationCap',
    color: '#FF9500',
    xpReward: 200,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 100,
  },
  {
    key: 'notes_500',
    name: 'Grandmaster Scribe',
    description: 'Sustain academic writing to 500 notes',
    icon: 'Trophy',
    color: '#FFD700',
    xpReward: 500,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 500,
  },
  {
    key: 'organized_mind',
    name: 'Subject Organizer',
    description: 'Organize notes in 3 subject spaces',
    icon: 'FolderPlus',
    color: '#5AC8FA',
    xpReward: 40,
    category: 'notes',
    check: (stats) => stats.uniqueFoldersCount >= 3,
  },
  {
    key: 'clean_starter',
    name: 'Clean Starter',
    description: 'Structure notes using lists or headers',
    icon: 'AlignLeft',
    color: '#34C759',
    xpReward: 30,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 1,
  },
  {
    key: 'speed_writer',
    name: 'Speed Scribe',
    description: 'Quickly save a quick thought in under 2 minutes',
    icon: 'Zap',
    color: '#FFCC00',
    xpReward: 30,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 1,
  },
  {
    key: 'multi_note_day',
    name: 'Multi-Note Day',
    description: 'Produce 3+ notes in a single day',
    icon: 'Layers',
    color: '#007AFF',
    xpReward: 50,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 3,
  },
  {
    key: 'idea_capture',
    name: 'Idea Capture Master',
    description: 'Capture active ideas using quick capture',
    icon: 'Sparkles',
    color: '#E040FB',
    xpReward: 40,
    category: 'notes',
    check: (stats) => stats.totalNotesCreated >= 1,
  },
  {
    key: 'lecture_converter',
    name: 'Lecture Converter',
    description: 'Add a voice recording to convert lecture insights',
    icon: 'Mic',
    color: '#34C759',
    xpReward: 50,
    category: 'notes',
    check: (stats) => stats.notesWithAudio >= 1,
  },
  {
    key: 'file_importer',
    name: 'File Importer',
    description: 'Add an external drawing or media canvas',
    icon: 'Image',
    color: '#5AC8FA',
    xpReward: 40,
    category: 'notes',
    check: (stats) => stats.notesWithImages >= 1 || stats.notesWithDrawings >= 1,
  },

  // ── 2. STUDY & REVISION ACHIEVEMENTS (13) ──
  {
    key: 'revision_beginner',
    name: 'Revision Beginner',
    description: 'Reach a revision mastery score >= 50%',
    icon: 'Brain',
    color: '#AF52DE',
    xpReward: 30,
    category: 'study',
    check: (stats) => stats.mediumRevisionScoreCount >= 1,
  },
  {
    key: 'revision_expert',
    name: 'Revision Expert',
    description: 'Earn a flawless 90%+ score on a note',
    icon: 'Award',
    color: '#FF2D55',
    xpReward: 100,
    category: 'study',
    check: (stats) => stats.highRevisionScoreCount >= 1,
  },
  {
    key: 'revision_master',
    name: 'Revision Master',
    description: 'Earn 90%+ revision scores across 5 notes',
    icon: 'Crown',
    color: '#FFD700',
    xpReward: 250,
    category: 'study',
    check: (stats) => stats.highRevisionScoreCount >= 5,
  },
  {
    key: 'first_revision',
    name: 'First Revision',
    description: 'Complete your first active recall session',
    icon: 'RefreshCw',
    color: '#007AFF',
    xpReward: 30,
    category: 'study',
    check: (stats) => stats.highestRevisionScore > 0,
  },
  {
    key: 'revision_5',
    name: 'Active Learner',
    description: 'Complete revision mode on 5 notes',
    icon: 'CheckSquare',
    color: '#34C759',
    xpReward: 50,
    category: 'study',
    check: (stats) => stats.mediumRevisionScoreCount >= 5,
  },
  {
    key: 'revision_20',
    name: 'Exam Ready',
    description: 'Complete revision mode on 20 notes',
    icon: 'Star',
    color: '#FFCC00',
    xpReward: 150,
    category: 'study',
    check: (stats) => stats.mediumRevisionScoreCount >= 20,
  },
  {
    key: 'active_recall',
    name: 'Active Recall User',
    description: 'Add bracketed recall cues [[like this]] to a note',
    icon: 'HelpCircle',
    color: '#5AC8FA',
    xpReward: 40,
    category: 'study',
    check: (stats) => stats.activeRecallNotesCount >= 1,
  },
  {
    key: 'memory_builder',
    name: 'Memory Builder',
    description: 'Maintain study notes with 50%+ average revision score',
    icon: 'Layers',
    color: '#AF52DE',
    xpReward: 75,
    category: 'study',
    check: (stats) => stats.averageRevisionScore >= 50 && stats.totalNotesCreated >= 5,
  },
  {
    key: 'spaced_rep_starter',
    name: 'Spaced Repetition Starter',
    description: 'Initiate scheduled spaced repetition reviews',
    icon: 'Calendar',
    color: '#007AFF',
    xpReward: 45,
    category: 'study',
    check: (stats) => stats.highestRevisionScore > 0,
  },
  {
    key: 'spaced_rep_master',
    name: 'Spaced Repetition Master',
    description: 'Review 3 notes consistently in spaced repetition',
    icon: 'Shield',
    color: '#34C759',
    xpReward: 150,
    category: 'study',
    check: (stats) => stats.highRevisionScoreCount >= 3,
  },
  {
    key: 'focus_session_done',
    name: 'Focus Session Completed',
    description: 'Finish a study focus block',
    icon: 'Hourglass',
    color: '#AF52DE',
    xpReward: 30,
    category: 'study',
    check: (stats) => stats.totalFocusSessions >= 1,
  },
  {
    key: 'study_marathon',
    name: 'Study Marathon',
    description: 'Accumulate 2+ focus hours studying',
    icon: 'Timer',
    color: '#FF9500',
    xpReward: 150,
    category: 'study',
    check: (stats) => stats.totalFocusMinutes >= 120,
  },
  {
    key: 'deep_work_init',
    name: 'Deep Work Initiated',
    description: 'Maintain high study focus for 45+ minutes',
    icon: 'Zap',
    color: '#FF2D55',
    xpReward: 80,
    category: 'study',
    check: (stats) => stats.totalFocusMinutes >= 45,
  },

  // ── 3. CONSISTENCY & HABIT ACHIEVEMENTS (11) ──
  {
    key: 'streak_1',
    name: 'One Day Streak',
    description: 'Start your study streak journey',
    icon: 'Flame',
    color: '#FF9500',
    xpReward: 20,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 1,
  },
  {
    key: 'streak_7',
    name: 'One Week Streak',
    description: 'Maintain study consistency for 7 days',
    icon: 'Flame',
    color: '#FF3B30',
    xpReward: 50,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 7,
  },
  {
    key: 'streak_30',
    name: 'One Month Streak',
    description: 'Maintain study consistency for 30 days',
    icon: 'Award',
    color: '#FFCC00',
    xpReward: 250,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 30,
  },
  {
    key: 'consistency_builder',
    name: 'Consistency Builder',
    description: 'Reach a 5-day habit streak',
    icon: 'TrendingUp',
    color: '#007AFF',
    xpReward: 40,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 5,
  },
  {
    key: 'habit_formed',
    name: 'Habit Formed',
    description: 'Complete 10 consecutive days of activity',
    icon: 'CheckCircle',
    color: '#34C759',
    xpReward: 80,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 10,
  },
  {
    key: 'discipline_engine',
    name: 'Discipline Engine',
    description: 'Log progress 15 days in a row',
    icon: 'Compass',
    color: '#AF52DE',
    xpReward: 120,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 15,
  },
  {
    key: 'daily_checkin',
    name: 'Daily Check-In',
    description: 'Perform a successful active session check-in',
    icon: 'Check',
    color: '#34C759',
    xpReward: 15,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 1,
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Establish study actions early (5:00 AM - 9:00 AM)',
    icon: 'Sun',
    color: '#FFCC00',
    xpReward: 30,
    category: 'consistency',
    check: (stats) => stats.recentEarlyBirdSession,
  },
  {
    key: 'midnight_worker',
    name: 'Midnight Scribe',
    description: 'Establish notes or study actions late (12:00 AM - 4:00 AM)',
    icon: 'Moon',
    color: '#5856D6',
    xpReward: 35,
    category: 'consistency',
    check: (stats) => stats.recentLateNightSession,
  },
  {
    key: 'no_missed_day',
    name: 'No Missed Day',
    description: 'Log consistent workspace habits for 30 days',
    icon: 'Shield',
    color: '#34C759',
    xpReward: 250,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 30,
  },
  {
    key: 'comeback_king',
    name: 'Comeback King',
    description: 'Resume active study streaks successfully',
    icon: 'Sparkles',
    color: '#5AC8FA',
    xpReward: 40,
    category: 'consistency',
    check: (stats) => stats.longestStreak >= 2,
  },

  // ── 4. PRODUCTIVITY & ORGANIZATION ACHIEVEMENTS (10) ──
  {
    key: 'prod_activated',
    name: 'Productivity Activated',
    description: 'Complete your first workspace task',
    icon: 'CheckSquare',
    color: '#007AFF',
    xpReward: 30,
    category: 'productivity',
    check: (stats) => stats.totalTasksCompleted >= 1,
  },
  {
    key: 'top_priorities',
    name: 'Top Priorities Set',
    description: 'Complete 3 tasks in your backlog',
    icon: 'AlertCircle',
    color: '#FF2D55',
    xpReward: 40,
    category: 'productivity',
    check: (stats) => stats.totalTasksCompleted >= 3,
  },
  {
    key: 'perfect_workspace',
    name: 'Perfect Workspace',
    description: 'Structure notes into 4 core folders',
    icon: 'LayoutGrid',
    color: '#FF9500',
    xpReward: 50,
    category: 'productivity',
    check: (stats) => stats.uniqueFoldersCount >= 4,
  },
  {
    key: 'color_coder',
    name: 'Color Coder',
    description: 'Use tags to classify 3 unique notes',
    icon: 'Tag',
    color: '#E040FB',
    xpReward: 40,
    category: 'productivity',
    check: (stats) => stats.uniqueTagsCount >= 3,
  },
  {
    key: 'smart_organizer',
    name: 'Smart Organizer',
    description: 'Organize workspace with 2 folders and 2 tags',
    icon: 'ClipboardList',
    color: '#AF52DE',
    xpReward: 60,
    category: 'productivity',
    check: (stats) => stats.uniqueFoldersCount >= 2 && stats.uniqueTagsCount >= 2,
  },
  {
    key: 'task_crusher',
    name: 'Task Crusher',
    description: 'Complete 5 high-priority tasks',
    icon: 'Zap',
    color: '#FFD700',
    xpReward: 50,
    category: 'productivity',
    check: (stats) => stats.totalTasksCompleted >= 5,
  },
  {
    key: 'deadline_manager',
    name: 'Deadline Manager',
    description: 'Complete 10 academic tasks',
    icon: 'Clock',
    color: '#34C759',
    xpReward: 100,
    category: 'productivity',
    check: (stats) => stats.totalTasksCompleted >= 10,
  },
  {
    key: 'assignment_done',
    name: 'Assignment Completed',
    description: 'Complete 20 tasks across study terms',
    icon: 'Check',
    color: '#5AC8FA',
    xpReward: 200,
    category: 'productivity',
    check: (stats) => stats.totalTasksCompleted >= 20,
  },
  {
    key: 'clean_dashboard',
    name: 'Clean Dashboard',
    description: 'Maintain zero pending tasks for a full day',
    icon: 'Sparkles',
    color: '#FFCC00',
    xpReward: 75,
    category: 'productivity',
    check: (stats) => stats.hadPerfectDay,
  },
  {
    key: 'focus_setup',
    name: 'Focus Setup',
    description: 'Initiate focus session widgets 3 times',
    icon: 'Settings',
    color: '#8E8E93',
    xpReward: 40,
    category: 'productivity',
    check: (stats) => stats.totalFocusSessions >= 3,
  },

  // ── 5. ACADEMIC MASTERY ACHIEVEMENTS (9) ──
  {
    key: 'formula_collector',
    name: 'Formula Collector',
    description: 'Save your first quick study formula card',
    icon: 'Calculator',
    color: '#007AFF',
    xpReward: 30,
    category: 'leaderboard',
    check: (stats) => stats.totalFormulasCount >= 1,
  },
  {
    key: 'formula_master',
    name: 'Formula Master',
    description: 'Save 5 STEM equation formula cards',
    icon: 'Atom',
    color: '#34C759',
    xpReward: 80,
    category: 'leaderboard',
    check: (stats) => stats.totalFormulasCount >= 5,
  },
  {
    key: 'subject_specialist',
    name: 'Subject Specialist',
    description: 'Organize study materials in 3 folders',
    icon: 'BookOpen',
    color: '#5856D6',
    xpReward: 50,
    category: 'leaderboard',
    check: (stats) => stats.uniqueFoldersCount >= 3,
  },
  {
    key: 'multi_subject',
    name: 'Multi-Subject Student',
    description: 'Manage study materials across 5 folders',
    icon: 'Layers',
    color: '#AF52DE',
    xpReward: 100,
    category: 'leaderboard',
    check: (stats) => stats.uniqueFoldersCount >= 5,
  },
  {
    key: 'chapter_finisher',
    name: 'Chapter Finisher',
    description: 'Build notes corpus of 15+ study notes',
    icon: 'Award',
    color: '#FF9500',
    xpReward: 80,
    category: 'leaderboard',
    check: (stats) => stats.totalNotesCreated >= 15,
  },
  {
    key: 'semester_survivor',
    name: 'Semester Survivor',
    description: 'Study focus timers log 24 hours of focus',
    icon: 'Shield',
    color: '#FF2D55',
    xpReward: 250,
    category: 'leaderboard',
    check: (stats) => stats.totalStudyHours >= 24,
  },
  {
    key: 'finals_warrior',
    name: 'Finals Warrior',
    description: 'Log 300+ minutes inside study focus mode',
    icon: 'Flame',
    color: '#FFD700',
    xpReward: 200,
    category: 'leaderboard',
    check: (stats) => stats.totalFocusMinutes >= 300,
  },
  {
    key: 'top_performer',
    name: 'Top Performer Mode',
    description: 'Sustain average active recall score >= 75%',
    icon: 'Crown',
    color: '#FF3B30',
    xpReward: 150,
    category: 'leaderboard',
    check: (stats) => stats.averageRevisionScore >= 75,
  },
  {
    key: 'excellence_achieved',
    name: 'Excellence Achieved',
    description: 'Reach 90% recall score on 3 active notes',
    icon: 'Trophy',
    color: '#FFD700',
    xpReward: 250,
    category: 'leaderboard',
    check: (stats) => stats.highRevisionScoreCount >= 3,
  },

  // ── 6. SOCIAL / CONNECT ACHIEVEMENTS (10) ──
  {
    key: 'first_connection',
    name: 'First Connection',
    description: 'Follow your first academic study connection',
    icon: 'UserPlus',
    color: '#007AFF',
    xpReward: 30,
    category: 'social',
    check: (stats) => stats.followingCount >= 1,
  },
  {
    key: 'community_member',
    name: 'Community Member',
    description: 'Reach study Level 2 and customize bio details',
    icon: 'Users',
    color: '#34C759',
    xpReward: 40,
    category: 'social',
    check: (stats) => stats.level >= 2 && stats.hasBio,
  },
  {
    key: 'profile_completed',
    name: 'Profile Completed',
    description: 'Complete custom bio and add avatar pictures',
    icon: 'UserCheck',
    color: '#AF52DE',
    xpReward: 50,
    category: 'social',
    check: (stats) => stats.hasAvatar && stats.hasBio,
  },
  {
    key: 'active_contributor',
    name: 'Active Contributor',
    description: 'Reach study Level 5 in Groundwork',
    icon: 'Edit3',
    color: '#FF9500',
    xpReward: 80,
    category: 'social',
    check: (stats) => stats.level >= 5,
  },
  {
    key: 'motivator',
    name: 'Motivator',
    description: 'Receive your first follower in the feed',
    icon: 'Heart',
    color: '#FF2D55',
    xpReward: 40,
    category: 'social',
    check: (stats) => stats.followersCount >= 1,
  },
  {
    key: 'inspiration_shared',
    name: 'Inspiration Shared',
    description: 'Update student bio statements to inspire',
    icon: 'MessageSquare',
    color: '#5AC8FA',
    xpReward: 30,
    category: 'social',
    check: (stats) => stats.hasBio,
  },
  {
    key: 'study_partner',
    name: 'Study Partner',
    description: 'Establish community friendships with peers',
    icon: 'Smile',
    color: '#FFCC00',
    xpReward: 50,
    category: 'social',
    check: (stats) => stats.friendshipsCount >= 1,
  },
  {
    key: 'group_learner',
    name: 'Group Learner',
    description: 'Establish friendships with 3 active peers',
    icon: 'Users',
    color: '#E040FB',
    xpReward: 100,
    category: 'social',
    check: (stats) => stats.friendshipsCount >= 3,
  },
  {
    key: 'collaborative_thinker',
    name: 'Collaborative Thinker',
    description: 'Follow 3 student profiles in the feed',
    icon: 'Activity',
    color: '#AF52DE',
    xpReward: 50,
    category: 'social',
    check: (stats) => stats.followingCount >= 3,
  },
  {
    key: 'knowledge_sharer',
    name: 'Knowledge Sharer',
    description: 'Link contact or social details to profiles',
    icon: 'Link',
    color: '#5AC8FA',
    xpReward: 40,
    category: 'social',
    check: (stats) => stats.hasSocialLink,
  },

  // ── 7. HIDDEN / SECRET ACHIEVEMENTS (10) ──
  {
    key: 'three_am_survivor',
    name: '3AM Survivor',
    description: 'Logged note-taking or study activity at 3:00 AM',
    icon: 'Ghost',
    color: '#5856D6',
    xpReward: 150,
    category: 'special',
    secret: true,
    check: (stats) => stats.recentThreeAmSurvivor,
  },
  {
    key: 'offline_warrior',
    name: 'Offline Scribe',
    description: 'Drafted 5 notes in local workspace',
    icon: 'Radio',
    color: '#8E8E93',
    xpReward: 100,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalNotesCreated >= 5,
  },
  {
    key: 'no_distractions',
    name: 'No Distractions Mode',
    description: 'Complete a long focus session without pause (>30 mins)',
    icon: 'EyeOff',
    color: '#1C1C1E',
    xpReward: 120,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalFocusMinutes >= 30,
  },
  {
    key: 'the_return',
    name: 'The Return',
    description: 'Resumed daily note streak successfully',
    icon: 'RefreshCw',
    color: '#34C759',
    xpReward: 80,
    category: 'special',
    secret: true,
    check: (stats) => stats.longestStreak >= 2,
  },
  {
    key: 'burnout_recovery_secret',
    name: 'Burnout Recovery',
    description: 'Log focus timers on 5 study entries',
    icon: 'Heart',
    color: '#FF2D55',
    xpReward: 100,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalFocusSessions >= 5,
  },
  {
    key: 'the_perfectionist',
    name: 'The Perfectionist',
    description: 'Master notes to flawless 100% active recall accuracy',
    icon: 'Crown',
    color: '#FFD700',
    xpReward: 150,
    category: 'special',
    secret: true,
    check: (stats) => stats.highestRevisionScore === 100,
  },
  {
    key: 'silent_grinder',
    name: 'Silent Grinder',
    description: 'Accumulate 10 study focus blocks in isolation',
    icon: 'Shield',
    color: '#1C1C1E',
    xpReward: 150,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalFocusSessions >= 10 && stats.followingCount === 0,
  },
  {
    key: 'touch_grass',
    name: 'Touch Grass',
    description: 'Complete 4+ study focus hours in a day',
    icon: 'TreeDeciduous',
    color: '#34C759',
    xpReward: 200,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalFocusMinutes >= 240,
  },
  {
    key: 'one_more_chapter',
    name: 'One More Chapter',
    description: 'Log active study changes past 11:00 PM',
    icon: 'BookOpen',
    color: '#5856D6',
    xpReward: 100,
    category: 'special',
    secret: true,
    check: (stats) => stats.recentLateNightSession,
  },
  {
    key: 'locked_in',
    name: 'Locked In Mode',
    description: 'Logged 60+ continuous minutes in a study focus session',
    icon: 'Lock',
    color: '#FF9500',
    xpReward: 150,
    category: 'special',
    secret: true,
    check: (stats) => stats.totalFocusMinutes >= 60,
  },
];

export const ACHIEVEMENTS: AchievementConfig[] = RAW_ACHIEVEMENTS.map(a => ({
  ...a,
  xpReward: scaleReward(a.xpReward)
}));

export const getUserStats = (userId: string): UserStats => {
  try {
    const tasksCount = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND deleted_at IS NULL', [userId])?.count || 0;
    
    const maxStreak = db.getFirstSync<{max: number}>('SELECT MAX(best_streak) as max FROM habits WHERE user_id = ? AND deleted_at IS NULL', [userId])?.max || 0;
    
    const focusStats = db.getFirstSync<{sessions: number, mins: number}>('SELECT COUNT(*) as sessions, SUM(duration_minutes) as mins FROM focus_sessions WHERE user_id = ?', [userId]);
    
    const profile = db.getFirstSync<{level: number, xp: number, bio: string, avatar_url: string}>('SELECT level, xp, bio, avatar_url FROM connect_profiles WHERE user_id = ?', [userId]);

    const perfectDayResult = db.getFirstSync<{date: string}>('SELECT date FROM tasks WHERE user_id = ? AND deleted_at IS NULL GROUP BY date HAVING SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) = 0 AND SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) > 0 LIMIT 1', [userId]);

    const friendsCount = db.getFirstSync<{c: number}>('SELECT COUNT(*) as c FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?', [userId, userId])?.c || 0;
    const followingCount = friendsCount;
    const followersCount = friendsCount;

    const hasSocialLink = (db.getFirstSync<{c: number}>('SELECT COUNT(*) as c FROM connect_social_links WHERE user_id = ?', [userId])?.c || 0) > 0;

    const { useAuthStore } = require('../../store/useAuthStore');
    const authProfile = useAuthStore.getState().profile;
    const isPro = authProfile?.pro_status || false;

    // --- Extended note & study fields ---
    const totalNotesCreated = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL', [userId])?.count || 0;
    const notesWithAudio = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND audio_uris IS NOT NULL AND audio_uris != \'[]\' AND deleted_at IS NULL', [userId])?.count || 0;
    const notesWithDrawings = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND drawing_uris IS NOT NULL AND drawing_uris != \'[]\' AND deleted_at IS NULL', [userId])?.count || 0;
    const notesWithImages = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND image_uris IS NOT NULL AND image_uris != \'[]\' AND deleted_at IS NULL', [userId])?.count || 0;
    const totalStudyHours = db.getFirstSync<{sum: number}>('SELECT SUM(study_hours) as sum FROM notes WHERE user_id = ? AND deleted_at IS NULL', [userId])?.sum || 0;
    const uniqueFoldersCount = db.getFirstSync<{count: number}>('SELECT COUNT(DISTINCT folder) as count FROM notes WHERE user_id = ? AND folder IS NOT NULL AND folder != \'\' AND deleted_at IS NULL', [userId])?.count || 0;
    const uniqueTagsCount = db.getFirstSync<{count: number}>('SELECT COUNT(DISTINCT tag) as count FROM note_tags WHERE user_id = ?', [userId])?.count || 0;
    const highestRevisionScore = db.getFirstSync<{max: number}>('SELECT MAX(revision_score) as max FROM notes WHERE user_id = ? AND deleted_at IS NULL', [userId])?.max || 0;
    const averageRevisionScore = db.getFirstSync<{avg: number}>('SELECT AVG(revision_score) as avg FROM notes WHERE user_id = ? AND deleted_at IS NULL', [userId])?.avg || 0;
    const highRevisionScoreCount = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND revision_score >= 90 AND deleted_at IS NULL', [userId])?.count || 0;
    const mediumRevisionScoreCount = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND revision_score >= 50 AND deleted_at IS NULL', [userId])?.count || 0;

    const habitCheckinsCount = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ?', [userId])?.count || 0;

    const notes = db.getAllSync<{ flashcards: string, formulas: string, content: string }>(
      'SELECT flashcards, formulas, content FROM notes WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    ) || [];

    let totalFlashcardsCount = 0;
    let totalFormulasCount = 0;
    let notesWithFlashcards = 0;
    let notesWithFormulas = 0;
    let activeRecallNotesCount = 0;

    notes.forEach(n => {
      try {
        const fc = JSON.parse(n.flashcards || '[]');
        if (fc && fc.length > 0) {
          totalFlashcardsCount += fc.length;
          notesWithFlashcards++;
        }
      } catch (_) {}

      try {
        const fm = JSON.parse(n.formulas || '[]');
        if (fm && fm.length > 0) {
          totalFormulasCount += fm.length;
          notesWithFormulas++;
        }
      } catch (_) {}

      if (n.content && n.content.includes('[[') && n.content.includes(']]')) {
        activeRecallNotesCount++;
      }
    });

    const recentActivityTimes = db.getAllSync<{ created_at: string }>(
      'SELECT created_at FROM notes WHERE user_id = ? UNION SELECT created_at FROM focus_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId, userId]
    );

    let recentLateNightSession = false;
    let recentEarlyBirdSession = false;
    let recentThreeAmSurvivor = false;

    recentActivityTimes.forEach(act => {
      if (!act.created_at) return;
      try {
        const hour = new Date(act.created_at).getHours();
        if (hour >= 0 && hour < 4) {
          recentLateNightSession = true;
        }
        if (hour >= 5 && hour < 9) {
          recentEarlyBirdSession = true;
        }
        if (hour >= 3 && hour < 4) {
          recentThreeAmSurvivor = true;
        }
      } catch (_) {}
    });

    return {
      totalTasksCompleted: tasksCount,
      longestStreak: maxStreak,
      totalFocusSessions: focusStats?.sessions || 0,
      totalFocusMinutes: focusStats?.mins || 0,
      hadPerfectDay: !!perfectDayResult,
      level: profile?.level || 1,
      followersCount,
      followingCount,
      hasBio: !!(profile?.bio && profile.bio !== 'On a mission to stay productive.' && profile.bio.trim().length > 0),
      hasSocialLink,
      hasAvatar: !!profile?.avatar_url,
      xp: profile?.xp || 0,
      isPro,

      // Extended note & study fields
      totalNotesCreated,
      notesWithDrawings,
      notesWithAudio,
      notesWithImages,
      notesWithFlashcards,
      notesWithFormulas,
      uniqueFoldersCount,
      uniqueTagsCount,
      totalStudyHours,
      totalFlashcardsCount,
      totalFormulasCount,
      highestRevisionScore,
      averageRevisionScore,
      highRevisionScoreCount,
      mediumRevisionScoreCount,
      activeRecallNotesCount,
      recentLateNightSession,
      recentEarlyBirdSession,
      recentThreeAmSurvivor,
      habitCheckinsCount,
      friendshipsCount: friendsCount
    };
  } catch (e) {
    console.error('[getUserStats] Error:', e);
    return {
      totalTasksCompleted: 0,
      longestStreak: 0,
      totalFocusSessions: 0,
      totalFocusMinutes: 0,
      hadPerfectDay: false,
      level: 1,
      followersCount: 0,
      followingCount: 0,
      hasBio: false,
      hasSocialLink: false,
      hasAvatar: false,
      xp: 0,
      isPro: false,

      // Extended note & study fields
      totalNotesCreated: 0,
      notesWithDrawings: 0,
      notesWithAudio: 0,
      notesWithImages: 0,
      notesWithFlashcards: 0,
      notesWithFormulas: 0,
      uniqueFoldersCount: 0,
      uniqueTagsCount: 0,
      totalStudyHours: 0,
      totalFlashcardsCount: 0,
      totalFormulasCount: 0,
      highestRevisionScore: 0,
      averageRevisionScore: 0,
      highRevisionScoreCount: 0,
      mediumRevisionScoreCount: 0,
      activeRecallNotesCount: 0,
      recentLateNightSession: false,
      recentEarlyBirdSession: false,
      recentThreeAmSurvivor: false,
      habitCheckinsCount: 0,
      friendshipsCount: 0
    };
  }
};

const activeChecks = new Set<string>();
// Session-level cache: tracks keys already confirmed unlocked in this session.
// Acts as a secondary guard so we never re-emit an event for the same achievement
// twice in one app session, even if the DB returns stale/empty data.
const sessionUnlocked = new Map<string, Set<string>>(); // userId -> Set<achievementKey>

export const checkAchievements = async (userId: string) => {
  if (!userId) return;
  if (activeChecks.has(userId)) {
    console.log('[checkAchievements] Reentrancy blocked for user:', userId);
    return;
  }

  activeChecks.add(userId);

  // Ensure a per-user session set exists
  if (!sessionUnlocked.has(userId)) {
    sessionUnlocked.set(userId, new Set<string>());
  }
  const sessionKeys = sessionUnlocked.get(userId)!;

  try {
    const stats = getUserStats(userId);
    const unlockedRecords = db.getAllSync<{achievement_key: string}>('SELECT achievement_key FROM connect_achievements WHERE user_id = ?', [userId]);
    const unlockedKeys = new Set(unlockedRecords.map(r => r.achievement_key));

    // Merge DB results into session cache (DB is source of truth)
    unlockedRecords.forEach(r => sessionKeys.add(r.achievement_key));

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already in DB OR already seen this session (prevents re-emission on DB glitches)
      if (unlockedKeys.has(achievement.key) || sessionKeys.has(achievement.key)) {
        continue;
      }

      if (achievement.check(stats)) {
        const id = Math.random().toString(36).substring(7);
        const now = new Date().toISOString();

        db.runSync(
          'INSERT INTO connect_achievements (id, user_id, achievement_key, unlocked_at, progress) VALUES (?, ?, ?, ?, ?)',
          [id, userId, achievement.key, now, 100]
        );

        // Mark in session cache immediately so it can't fire again this session
        sessionKeys.add(achievement.key);

        emitConnectEvent({ type: 'ACHIEVEMENT_UNLOCKED', achievement });

        await addXP(userId, achievement.xpReward, 'Achievement Unlocked: ' + achievement.name);

        if (userId !== 'guest') {
          supabase.from('connect_achievements').insert({
            id,
            user_id: userId,
            achievement_key: achievement.key,
            unlocked_at: now,
            progress: 100
          }).then(({ data, error }) => {
            if (error) console.error('[checkAchievements] Supabase insert error:', error);
          });
        }
      }
    }
  } catch (e) {
    console.error('[checkAchievements] Error:', e);
  } finally {
    activeChecks.delete(userId);
  }
};
