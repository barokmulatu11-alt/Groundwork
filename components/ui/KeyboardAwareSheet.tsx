import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { X } from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Use slide-up sheet anchored to bottom (default) or centered card */
  variant?: 'sheet' | 'center';
};

export function KeyboardAwareSheet({ visible, onClose, title, children, variant = 'sheet' }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View
          style={[
            variant === 'sheet' ? styles.sheet : styles.centerCard,
            {
              backgroundColor: theme.cardSolid,
              borderColor: theme.cardBorder,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {title ? (
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <X size={20} color={theme.secondaryText} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '88%',
  },
  centerCard: {
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '80%',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', flex: 1 },
  closeBtn: { padding: 4 },
  scrollContent: { paddingBottom: 8 },
});
