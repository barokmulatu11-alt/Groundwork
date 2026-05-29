import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { X } from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 400);

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  accentColor?: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  actionLabel?: string;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}

/** Centered celebration / unlock dialog with consistent layout and full-width CTA. */
export function CelebrationModal({
  visible,
  onClose,
  accentColor,
  icon,
  eyebrow,
  title,
  description,
  badge,
  actionLabel = 'Continue',
  children,
  contentStyle,
}: CelebrationModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = accentColor || theme.accent;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />

        <Animated.View
          entering={ZoomIn.duration(300).springify()}
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              backgroundColor: isDark ? 'rgba(24,24,28,0.98)' : theme.cardSolid,
              borderColor: accent + '35',
            },
            contentStyle,
          ]}
        >
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <View style={[styles.closeCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={18} color={theme.secondaryText} />
            </View>
          </Pressable>

          <Animated.View entering={FadeIn.delay(80)} style={styles.body}>
            <View style={[styles.iconRing, { backgroundColor: accent + '18', borderColor: accent + '45' }]}>
              {icon}
            </View>

            <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
            <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>

            {description ? (
              <Text style={[styles.description, { color: theme.secondaryText }]}>{description}</Text>
            ) : null}

            {badge ? (
              <View style={[styles.badge, { backgroundColor: accent + '18' }]}>
                <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
              </View>
            ) : null}

            {children}

            <Pressable
              style={[styles.actionBtn, { backgroundColor: accent }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>{actionLabel}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
  },
  iconRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
    paddingHorizontal: 4,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
  },
  actionBtn: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
