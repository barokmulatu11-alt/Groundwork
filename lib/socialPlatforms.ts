import type { ComponentProps } from 'react';
import type { FontAwesome5 } from '@expo/vector-icons';

export type SocialPlatformId =
  | 'github'
  | 'x'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'discord'
  | 'telegram'
  | 'twitch'
  | 'reddit'
  | 'facebook'
  | 'website';

type Fa5Name = ComponentProps<typeof FontAwesome5>['name'];

export interface SocialPlatformDef {
  id: SocialPlatformId;
  label: string;
  icon: Fa5Name;
  brandColor: string;
  /** Icon color on dark backgrounds when brand is too dark */
  iconOnDark: string;
  placeholder: string;
  urlHint: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    brandColor: '#24292F',
    iconOnDark: '#F0F6FC',
    placeholder: 'github.com/username',
    urlHint: 'https://github.com/you',
  },
  {
    id: 'x',
    label: 'X',
    icon: 'twitter',
    brandColor: '#000000',
    iconOnDark: '#FFFFFF',
    placeholder: 'x.com/username',
    urlHint: 'https://x.com/you',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'linkedin',
    brandColor: '#0A66C2',
    iconOnDark: '#FFFFFF',
    placeholder: 'linkedin.com/in/you',
    urlHint: 'https://linkedin.com/in/you',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: 'instagram',
    brandColor: '#E4405F',
    iconOnDark: '#FFFFFF',
    placeholder: 'instagram.com/you',
    urlHint: 'https://instagram.com/you',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: 'youtube',
    brandColor: '#FF0000',
    iconOnDark: '#FFFFFF',
    placeholder: 'youtube.com/@channel',
    urlHint: 'https://youtube.com/@you',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: 'tiktok',
    brandColor: '#010101',
    iconOnDark: '#FFFFFF',
    placeholder: 'tiktok.com/@you',
    urlHint: 'https://tiktok.com/@you',
  },
  {
    id: 'discord',
    label: 'Discord',
    icon: 'discord',
    brandColor: '#5865F2',
    iconOnDark: '#FFFFFF',
    placeholder: 'discord.gg/invite',
    urlHint: 'https://discord.gg/your-server',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'telegram',
    brandColor: '#26A5E4',
    iconOnDark: '#FFFFFF',
    placeholder: 't.me/username',
    urlHint: 'https://t.me/you',
  },
  {
    id: 'twitch',
    label: 'Twitch',
    icon: 'twitch',
    brandColor: '#9146FF',
    iconOnDark: '#FFFFFF',
    placeholder: 'twitch.tv/you',
    urlHint: 'https://twitch.tv/you',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    icon: 'reddit',
    brandColor: '#FF4500',
    iconOnDark: '#FFFFFF',
    placeholder: 'reddit.com/u/you',
    urlHint: 'https://reddit.com/u/you',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: 'facebook',
    brandColor: '#1877F2',
    iconOnDark: '#FFFFFF',
    placeholder: 'facebook.com/you',
    urlHint: 'https://facebook.com/you',
  },
  {
    id: 'website',
    label: 'Website',
    icon: 'globe',
    brandColor: '#3B82F6',
    iconOnDark: '#FFFFFF',
    placeholder: 'yoursite.com',
    urlHint: 'https://yoursite.com',
  },
];

const PLATFORM_MAP = new Map(SOCIAL_PLATFORMS.map(p => [p.id, p]));

export function normalizePlatformId(platform: string): SocialPlatformId {
  const p = (platform || '').toLowerCase().trim();
  if (p.includes('git')) return 'github';
  if (p === 'twitter' || p === 'x') return 'x';
  if (p.includes('linked')) return 'linkedin';
  if (p.includes('insta')) return 'instagram';
  if (p.includes('youtu')) return 'youtube';
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('discord')) return 'discord';
  if (p.includes('tele')) return 'telegram';
  if (p.includes('twitch')) return 'twitch';
  if (p.includes('reddit')) return 'reddit';
  if (p.includes('face')) return 'facebook';
  if (p.includes('web') || p.includes('site') || p === 'link' || p === 'other') return 'website';
  const direct = PLATFORM_MAP.get(p as SocialPlatformId);
  if (direct) return direct.id;
  return 'website';
}

export function getPlatformDef(platform: string): SocialPlatformDef {
  return PLATFORM_MAP.get(normalizePlatformId(platform)) ?? PLATFORM_MAP.get('website')!;
}

export function detectPlatformFromUrl(url: string): SocialPlatformId {
  const u = url.toLowerCase();
  if (u.includes('github.com')) return 'github';
  if (u.includes('x.com') || u.includes('twitter.com')) return 'x';
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('discord.gg') || u.includes('discord.com')) return 'discord';
  if (u.includes('t.me') || u.includes('telegram.')) return 'telegram';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  return 'website';
}

export function normalizeSocialUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getPlatformPillStyle(platform: string, isDark: boolean) {
  const def = getPlatformDef(platform);
  const isDarkBrand = ['github', 'x', 'tiktok'].includes(def.id);
  const iconColor = isDark && isDarkBrand ? def.iconOnDark : def.brandColor;
  const bgAlpha = isDark ? '28' : '14';
  const borderAlpha = isDark ? '55' : '35';
  return {
    def,
    iconColor,
    labelColor: isDark ? '#FFFFFF' : def.brandColor,
    backgroundColor: def.brandColor + bgAlpha,
    borderColor: def.brandColor + borderAlpha,
  };
}

export function getAvailablePlatforms(
  existingPlatforms: string[],
  max = 5
): SocialPlatformDef[] {
  const used = new Set(existingPlatforms.map(normalizePlatformId));
  return SOCIAL_PLATFORMS.filter(p => !used.has(p.id)).slice(0, max === 5 ? SOCIAL_PLATFORMS.length : max);
}
