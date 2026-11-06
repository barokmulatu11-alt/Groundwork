import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter, Stack } from 'expo-router';
import { BrandHeader } from '@/components/ui/BrandHeader';
import ProfileScreen from '@/components/connect/screens/ProfileScreen';

export default function StandaloneProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <BrandHeader showBack onBack={() => router.back()} showAvatar={false} />

      <View style={styles.content}>
        <ProfileScreen
          onSwitchToAchievementsTab={() => router.push('/achievements')}
          onSwitchToFriendsTab={() => router.push('/(tabs)/connect')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 2,
  },
  spacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
});
