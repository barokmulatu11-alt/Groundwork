import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ModalScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <BackgroundGradient>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Quick Action</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.closeBtn, { backgroundColor: theme.cardBorder }]}
            >
              <X size={18} color={theme.primaryText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.message, { color: theme.secondaryText }]}>
            Use Groundwork's bottom tabs and action menus to navigate your daily tasks, focus timer, and notebooks.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 20,
  },
  doneBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
