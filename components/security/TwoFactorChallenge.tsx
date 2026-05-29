import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { SecurityUtils } from '@/lib/security';
import { ShieldCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable, 
  StyleSheet, 
  TextInput, 
  View 
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface TwoFactorChallengeProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorChallenge = ({ factorId, onSuccess, onCancel }: TwoFactorChallengeProps) => {
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length < 6) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const challenge = await SecurityUtils.challengeMFA(factorId);
      if (challenge.error) throw challenge.error;
      
      const verification = await SecurityUtils.verifyMFA(factorId, challenge.data.id, code);
      if (verification.error) throw verification.error;
      
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Invalid verification code');
      setLoading(false);
    }
  };

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
            <ShieldCheck size={32} color={theme.accent} />
          </View>
          
          <Text style={[styles.title, { color: theme.primaryText }]}>Two-Factor Authentication</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Enter the 6-digit code from your authenticator app to continue.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: theme.primaryText, 
                  borderColor: error ? theme.danger : theme.cardBorder,
                  backgroundColor: theme.card
                }
              ]}
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/[^0-9]/g, ''));
                if (error) setError(null);
              }}
              placeholder="000000"
              placeholderTextColor={theme.secondaryText}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
          </View>

          <Pressable 
            style={[
              styles.verifyBtn, 
              { backgroundColor: theme.accent, opacity: code.length === 6 && !loading ? 1 : 0.6 }
            ]}
            onPress={handleVerify}
            disabled={code.length < 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </BackgroundGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 32,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
    textAlign: 'center',
  },
  verifyBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  }
});
