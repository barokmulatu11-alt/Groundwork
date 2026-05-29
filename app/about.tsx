import { AppText as Text } from '@/components/ui/AppText';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Heart } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const { theme, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <BackgroundGradient>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>About groundwork.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandingContainer}>
          <BrandLogo fontSize={32} />
          <Text style={[styles.tagline, { color: theme.secondaryText, marginTop: 8 }]}>Your daily focus companion.</Text>
          <Text style={[styles.version, { color: theme.tertiaryText }]}>v1.2.1</Text>
        </View>

        <Text style={[styles.paragraph, { color: theme.secondaryText }]}>
          groundwork. is designed to help you stay focused, organized, and productive. 
          By combining habits, tasks, notes, and a powerful pomodoro timer, 
          it provides everything you need to build a better routine.
        </Text>

        <View style={styles.legalSection}>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderTopColor: theme.cardBorder }]}
            onPress={() => Linking.openURL('https://v0-barok-labs.vercel.app/privacy')}
          >
            <Text style={[styles.legalText, { color: theme.primaryText }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderTopColor: theme.cardBorder }]}
            onPress={() => Linking.openURL('https://v0-barok-labs.vercel.app/terms')}
          >
            <Text style={[styles.legalText, { color: theme.primaryText }]}>Terms and Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: theme.cardBorder, borderBottomColor: theme.cardBorder }]}
            onPress={() => showAlert({
              title: "Acknowledgements",
              message: "I would like to express my sincere gratitude to God for the guidance, strength, and opportunities throughout this journey. I am deeply thankful to my family for their continuous support, encouragement, and belief in me at every stage of the process. I also extend my appreciation to my friends Oliyad Shiferaw, Abel Abraha, and Yosef Tesfaye for their valuable support, ideas, and contributions in helping me shape and improve this app. Their feedback, discussions, and motivation played an important role in preparing and refining the project.",
            })}
          >
            <Text style={[styles.legalText, { color: theme.primaryText }]}>Acknowledgements</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.acknowledgement, { color: theme.tertiaryText }]}>
          Special thanks to the open-source community and all the contributors who make tools like groundwork. possible.
        </Text>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: -4, marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  title: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
  content: { padding: 20 },
  brandingContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  logoG: { fontSize: 40, fontFamily: 'Inter_800ExtraBold' },
  logoFull: { flexDirection: 'row', alignItems: 'baseline' },
  logoGSmall: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  logoText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  version: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4 },
  paragraph: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 24, textAlign: 'center', marginTop: 20, marginBottom: 40 },
  legalSection: { marginTop: 20, width: '100%' },
  legalItem: { paddingVertical: 16, paddingHorizontal: 12 },
  legalText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  acknowledgement: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 40, lineHeight: 20, opacity: 0.8 }
});
