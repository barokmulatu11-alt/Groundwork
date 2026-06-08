import { CelebrationModal } from '@/components/ui/CelebrationModal';
import { GlobalShareSheet } from '@/components/GlobalShareSheet';
import { useTheme } from '@/lib/ThemeContext';
import { hapticSuccess } from '@/lib/haptics';
import { Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';

interface AchievementUnlockSheetProps {
  visible: boolean;
  achievement: { name: string; description?: string; color?: string; xpReward?: number; icon?: string } | null;
  onClose: () => void;
}

export function AchievementUnlockSheet({ visible, achievement, onClose }: AchievementUnlockSheetProps) {
  const { theme } = useTheme();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (visible && achievement) hapticSuccess();
  }, [visible, achievement]);

  if (!achievement) return null;

  const accent = achievement.color || theme.accent;

  return (
    <>
      <CelebrationModal
        visible={visible}
        onClose={onClose}
        accentColor={accent}
        icon={<Trophy size={44} color={accent} strokeWidth={2} />}
        eyebrow="Achievement unlocked"
        title={achievement.name}
        description={achievement.description}
        badge={achievement.xpReward ? `+${achievement.xpReward} XP` : undefined}
        actionLabel="Awesome!"
        onShare={() => {
          onClose();
          setTimeout(() => setShareOpen(true), 350);
        }}
      />

      <GlobalShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType="achievement"
        contentData={achievement}
      />
    </>
  );
}
