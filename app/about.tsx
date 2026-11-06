import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Renders the About screen — shows branding, app description, and legal links (privacy, terms, acknowledgements)
export default function AboutScreen() {
  const { theme, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -0.5 }}>
            About.
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Version, credits and legal.
          </Text>
        </View>

        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          groundwork. is designed to help you stay focused, organized, and productive. 
          By combining habits, tasks, and a powerful pomodoro timer, 
          it provides everything you need to build a better routine.
        </Text>

        <View style={styles.legalSection}>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderTopColor: theme.separator }]}
            onPress={() => Linking.openURL('https://barok-labs.pro.et/privacy')}
          >
            <Text style={[styles.legalText, { color: theme.text }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderTopColor: theme.separator }]}
            onPress={() => Linking.openURL('https://barok-labs.pro.et/terms')}
          >
            <Text style={[styles.legalText, { color: theme.text }]}>Terms and Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legalItem, { borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: theme.separator, borderBottomColor: theme.separator }]}
            onPress={() => showAlert({
              title: "Acknowledgements",
              message: "I would like to express my sincere gratitude to God for the guidance, strength, and opportunities throughout this journey. I am deeply thankful to my family for their continuous support, encouragement, and belief in me at every stage of the process. I also extend my appreciation to my friends Oliyad Shiferaw, Abel Abraha, and Yosef Tesfaye for their valuable support, ideas, and contributions in helping me shape and improve this app. Their feedback, discussions, and motivation played an important role in preparing and refining the project.",
            })}
          >
            <Text style={[styles.legalText, { color: theme.text }]}>Acknowledgements</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.acknowledgement, { color: theme.textMuted }]}>
          Special thanks to the open-source community and all the contributors who make tools like groundwork. possible.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  paragraph: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 24, textAlign: 'center', marginTop: 20, marginBottom: 40 },
  legalSection: { marginTop: 20, width: '100%' },
  legalItem: { paddingVertical: 16, paddingHorizontal: 12 },
  legalText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  acknowledgement: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 40, lineHeight: 20, opacity: 0.8 }
});
