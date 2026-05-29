import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { SecurityUtils } from '@/lib/security';
import { Copy, ShieldCheck, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Dimensions, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  View,
  Alert
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

interface MFAEnrollmentProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MFAEnrollment = ({ onSuccess, onCancel }: MFAEnrollmentProps) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startEnrollment();
  }, []);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await SecurityUtils.enrollMFA();
      if (error) throw error;
      setEnrollmentData(data);
    } catch (e: any) {
      Alert.alert('Enrollment Error', e.message);
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      const challenge = await SecurityUtils.challengeMFA(enrollmentData.id);
      if (challenge.error) throw challenge.error;
      
      const verification = await SecurityUtils.verifyMFA(enrollmentData.id, challenge.data.id, code);
      if (verification.error) throw verification.error;
      
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async () => {
    if (enrollmentData?.totp?.secret) {
      await Clipboard.setStringAsync(enrollmentData.totp.secret);
      Alert.alert('Copied', 'Secret key copied to clipboard.');
    }
  };

  if (loading) {
    return (
      <BackgroundGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Initializing secure setup...</Text>
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
            <ShieldCheck size={32} color={theme.accent} />
          </View>
          
          <Text style={[styles.title, { color: theme.primaryText }]}>Enable 2FA</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Scan the QR code or enter the secret key below into your authenticator app (Google Authenticator, Authy, etc).
          </Text>

          <View style={[styles.secretBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.secretLabel, { color: theme.secondaryText }]}>SECRET KEY</Text>
            <View style={styles.secretRow}>
              <Text style={[styles.secretText, { color: theme.primaryText }]} numberOfLines={1}>
                {enrollmentData?.totp?.secret}
              </Text>
              <Pressable onPress={copyToClipboard} style={styles.copyBtn}>
                <Copy size={18} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>ENTER 6-DIGIT CODE</Text>
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
            />
            {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
          </View>

          <Pressable 
            style={[
              styles.verifyBtn, 
              { backgroundColor: theme.accent, opacity: code.length === 6 && !verifying ? 1 : 0.6 }
            ]}
            onPress={handleVerify}
            disabled={code.length < 6 || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Enable</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </BackgroundGradient>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontFamily: 'Inter_600SemiBold' },
  container: { padding: 24, paddingTop: 60, alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontFamily: 'Inter_800ExtraBold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', opacity: 0.8, lineHeight: 22, marginBottom: 32 },
  secretBox: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 32 },
  secretLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 8, letterSpacing: 1 },
  secretRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secretText: { flex: 1, fontSize: 16, fontFamily: 'Inter_600SemiBold', marginRight: 12 },
  copyBtn: { padding: 4 },
  inputSection: { width: '100%', marginBottom: 32 },
  inputLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 12, letterSpacing: 1, textAlign: 'center' },
  input: { width: '100%', height: 60, borderRadius: 16, borderWidth: 2, textAlign: 'center', fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: 4 },
  errorText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 8, textAlign: 'center' },
  verifyBtn: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  verifyBtnText: { color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' },
  cancelBtn: { paddingVertical: 8 },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' }
});
