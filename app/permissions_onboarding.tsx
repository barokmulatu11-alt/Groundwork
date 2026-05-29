import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient as BG } from '@/components/BackgroundGradient';
import { Camera, Mic, Image as ImageIcon, Folder, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { requestCameraPermission, requestMediaPermission, requestMicrophonePermission } from '@/lib/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    SlideInRight,
    SlideOutLeft,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    id: 'mic',
    icon: Mic,
    title: 'Microphone Access',
    description: 'We use your microphone to let you record voice notes and attach audio to your habits and daily entries. Your recordings stay on your device.',
    action: requestMicrophonePermission },
  {
    id: 'media',
    icon: ImageIcon,
    title: 'Photo Library Access',
    description: 'groundwork. can pull images from your gallery to attach to notes, habits or your profile. We only access photos you choose to share with us.',
    action: requestMediaPermission },
  {
    id: 'files',
    icon: Folder,
    title: 'File Access',
    description: 'File access lets you attach PDFs, documents and other files to your notes and download course materials for offline use. Your files are never shared.',
    action: async () => true, // On Android, implicit for picker
  }
];

export default function PermissionsOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const progress = useSharedValue(0);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${((currentStep + 1) / STEPS.length) * 100}%` }));

  const handleNext = async (request = false) => {
    if (request && typeof STEPS[currentStep].action === 'function') {
      await STEPS[currentStep].action();
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('permissions_onboarding_done', 'true');
    const { useAuthStore } = require('@/store/useAuthStore');
    useAuthStore.getState().setOnboardingDone(true);
    router.replace('/');
  };

  if (isFinished) {
    return (
      <BG>
        <Animated.View entering={FadeIn} style={styles.content}>
          <View style={[styles.emojiCircle, { backgroundColor: theme.card }]}>
            <CheckCircle size={40} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.primaryText }]}>You're all set!</Text>
          <Text style={[styles.description, { color: theme.secondaryText }]}>groundwork. is ready to help you stay focused and productive</Text>
          
          <TouchableOpacity onPress={finishOnboarding} style={[styles.primaryButton, { backgroundColor: theme.accent, }]}>
            <Text style={styles.primaryButtonText}>Let's Go</Text>
          </TouchableOpacity>
        </Animated.View>
      </BG>
    );
  }

  const step = STEPS[currentStep];

  return (
    <BG>
      <View style={[styles.progressHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle, { backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.stepIndicator, { color: theme.secondaryText }]}>{currentStep + 1} of {STEPS.length}</Text>
      </View>

      <Animated.View 
        key={currentStep}
        entering={SlideInRight}
        exiting={SlideOutLeft}
        style={styles.content}
      >
          <View style={[styles.emojiCircle, { backgroundColor: theme.card }]}>
            {React.createElement(step.icon, { size: 40, color: theme.accent })}
          </View>
          
        <Text style={[styles.title, { color: theme.primaryText }]}>{step.title}</Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>{step.description}</Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleNext(true)} style={[styles.primaryButton, { backgroundColor: theme.accent, }]}>
            <Text style={styles.primaryButtonText}>Allow Access</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => handleNext(false)} style={styles.secondaryLink}>
            <Text style={[styles.secondaryLinkText, { color: theme.secondaryText }]}>Not Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: theme.secondaryText }]}>You can always change this later in your phone settings</Text>
      </Animated.View>
    </BG>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressHeader: { paddingHorizontal: 40, alignItems: 'center' },
  progressBarBg: { width: '100%', height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  stepIndicator: { marginTop: 8, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emojiCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 30,      },
  emojiText: { fontSize: 40, fontFamily: 'System' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 15, textAlign: 'center', fontFamily: 'System' },
  description: { fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center', marginBottom: 40, fontFamily: 'System' },
  actions: { width: '100%', alignItems: 'center' },
  primaryButton: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',     },
  primaryButtonText: { color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' },
  secondaryLink: { marginTop: 20, padding: 10 },
  secondaryLinkText: { fontSize: 14, fontWeight: '600', fontFamily: 'System' },
  note: { position: 'absolute', bottom: 40, fontSize: 12, textAlign: 'center', fontFamily: 'System' }
});
