import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import AchievementsScreen from '@/components/connect/screens/AchievementsScreen';

export default function AppAchievementsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <BackgroundGradient>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable 
          onPress={() => router.back()} 
          style={[styles.iconBoxStandard, { backgroundColor: theme.accentLight }]}
        >
          <ChevronLeft size={20} color={theme.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Achievements</Text>
      </View>

      <View style={styles.content}>
        <AchievementsScreen />
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginRight: 40,
  },
  iconBoxStandard: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
