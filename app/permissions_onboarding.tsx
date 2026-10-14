import { BackgroundGradient as BG } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { requestCameraPermission, requestMediaPermission, requestMicrophonePermission } from '@/lib/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle, Folder, Image as ImageIcon, Mic } from 'lucide-react-native';
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
    id: 'camera',
    icon: Camera,
    title: 'Camera Access',
    description: 'groundwork. uses your camera to let you capture avatars and profile photos directly. Photos are only taken when you choose to.',
    action: requestCameraPermission,
  },
  {
    id: 'mic',
    icon: Mic,
    title: 'Microphone Access',
    description: 'We use your microphone to let you record audio check-ins and attach sound to habits. Your recordings stay on your device.',
    action: requestMicrophonePermission,
  },
  {
    id: 'media',
    icon: ImageIcon,
    title: 'Photo Library Access',
    description: 'groundwork. can pull images from your gallery for your habits or profile avatar. We only access photos you choose to share with us.',
    action: requestMediaPermission,
  },
  {
    id: 'files',
    icon: Folder,
    title: 'File Access',
    description: 'File access lets you export backups, reports, and data for offline storage. Your files are never shared.',
    action: async () => true,
  },
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
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Animated.View entering={FadeIn} style={styles.content}>
          <View style={[styles.emojiCircle, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
            <CheckCircle size={40} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>You're all set!</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>groundwork. is ready to help you stay focused and productive</Text>
          
          <TouchableOpacity onPress={finishOnboarding} style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
            <Text style={styles.primaryButtonText}>Let's Go</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const step = STEPS[currentStep];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.progressHeader, { paddingTop: insets.top + 20 }]}>
        <View style={[styles.progressBarBg, { backgroundColor: theme.separator }]}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle, { backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.stepIndicator, { color: theme.textSecondary }]}>{currentStep + 1} of {STEPS.length}</Text>
      </View>

      <Animated.View 
        key={currentStep}
        entering={SlideInRight}
        exiting={SlideOutLeft}
        style={styles.content}
      >
        <View style={[styles.emojiCircle, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
          {React.createElement(step.icon, { size: 40, color: theme.accent })}
        </View>
          
        <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{step.description}</Text>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleNext(true)} style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
            <Text style={styles.primaryButtonText}>Allow Access</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => handleNext(false)} style={styles.secondaryLink}>
            <Text style={[styles.secondaryLinkText, { color: theme.textSecondary }]}>Not Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: theme.textSecondary }]}>You can always change this later in your phone settings</Text>
      </Animated.View>
    </View>
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
