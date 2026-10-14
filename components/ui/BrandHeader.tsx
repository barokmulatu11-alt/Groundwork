import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';

interface BrandHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  onRightPress?: () => void;
  showMoreMenu?: boolean;
  showAvatar?: boolean;
}

export function BrandHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  onRightPress,
  showMoreMenu = false,
  showAvatar = true,
}: BrandHeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { profile, session, isGuest } = useAuthStore();
  const isBackVisible = showBack || Boolean(onBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const avatarInitial = (
    profile?.full_name?.charAt(0) ||
    profile?.username?.charAt(0) ||
    session?.user?.email?.charAt(0) ||
    'G'
  ).toUpperCase();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {/* Left side: Back button or spacer */}
        <View style={styles.leftCol}>
          {isBackVisible ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={22} color={theme.accent} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}

          {/* Wordmark */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.replace('/')}
            accessibilityRole="link"
            accessibilityLabel="Groundwork home"
          >
            <Text style={[styles.wordmark, { color: theme.primaryText }]}>groundwork.</Text>
          </TouchableOpacity>
        </View>

        {/* Right side: Action icon or avatar */}
        <View style={styles.rightCol}>
          {rightAction ? (
            rightAction
          ) : showMoreMenu ? (
            <TouchableOpacity
              onPress={onRightPress || (() => router.push('/settings' as any))}
              style={[styles.circleBtn, { borderColor: theme.separator }]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreHorizontal size={17} color={theme.primaryText} strokeWidth={2.2} />
            </TouchableOpacity>
          ) : showAvatar ? (
            <TouchableOpacity
              onPress={onRightPress || (() => router.push('/settings' as any))}
              style={[styles.avatarCircle, { borderColor: theme.separator, backgroundColor: theme.cardSolid }]}
              accessibilityRole="button"
              accessibilityLabel="Account and settings"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.avatarText, { color: theme.primaryText }]}>
                {avatarInitial}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Signature electric blue separator line */}
      <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 19,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  accentLine: {
    width: '100%',
    height: 1.5,
  },
});
