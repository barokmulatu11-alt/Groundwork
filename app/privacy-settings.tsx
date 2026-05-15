import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Circle,
  Clock,
  ExternalLink,
  Eye,
  FileJson,
  Fingerprint,
  Globe,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  Smartphone
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {children}
    </View>
  );
}

interface SettingRowProps {
  icon: any;
  title: string;
  subtitle?: string;
  theme: any;
  children?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  rightIcon?: any;
}

function SettingRow({ icon: Icon, title, subtitle, theme, children, onPress, destructive, rightIcon: RightIcon }: SettingRowProps) {
  const content = (
    <View style={styles.settingRowContainer}>
      <View style={styles.settingHeader}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: destructive ? theme.danger : theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {children}
        {!children && onPress && (
          <View style={styles.rightIconBox}>
            {RightIcon ? <RightIcon size={16} color={theme.tertiaryText} /> : <ChevronLeft size={18} color={theme.tertiaryText} style={{ transform: [{ rotate: '180deg' }] }} />}
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  { id: '1', event: 'Password Changed', date: 'Oct 10, 2023', time: '14:32', type: 'security' },
  { id: '2', event: 'Successful Login', date: 'Oct 08, 2023', time: '09:15', type: 'login' },
  { id: '3', event: 'New Device Linked', date: 'Oct 05, 2023', time: '11:20', type: 'security' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PrivacySettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = '#007AFF';

  const { faceIdEnabled, setFaceIdEnabled, appPin, setAppPin, autoLockTimeout, setAutoLockTimeout } = useSettingsStore();
  const { session } = useAuthStore();
  const { activeSessions, deviceId, revokeSession, revokeAllOtherSessions } = useSessionStore();

  const [biometricType, setBiometricType] = useState<string>('Face ID');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const timeoutOptions = [
    { label: 'Immediately', value: 0 },
    { label: 'After 1 minute', value: 60 },
    { label: 'After 5 minutes', value: 300 },
    { label: 'After 15 minutes', value: 900 },
  ];

  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      } else {
        setBiometricType('Biometrics');
      }
    })();
  }, []);

  const handleFaceIdToggle = async (value: boolean) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        showAlert({
          title: "Not Supported",
          message: "Your device does not support biometric authentication.",
          primaryButton: { text: "OK", onPress: () => { } }
        });
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        showAlert({
          title: "Not Enrolled",
          message: `Please set up ${biometricType} in your device settings first.`,
          primaryButton: { text: "OK", onPress: () => { } }
        });
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType}`,
        fallbackLabel: 'Enter Passcode',
      });

      if (result.success) {
        setFaceIdEnabled(true);
      }
    } else {
      setFaceIdEnabled(false);
    }
  };

  const handleRevokeSession = async (action: () => void, promptMessage: string) => {
    // Check if security is enabled
    if (faceIdEnabled || appPin) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use PIN',
      });
      if (!result.success) return; // User canceled or failed
    }

    // Proceed if successful or no security enabled
    action();
  };

  const handlePinSetup = () => {
    if (appPin) {
      showAlert({
        title: 'Reset PIN',
        message: 'Do you want to clear your current PIN?',
        primaryButton: { text: 'Cancel', onPress: () => { } },
        secondaryButton: { text: 'Clear PIN', onPress: () => setAppPin(null) },
      });
    } else {
      showAlert({
        title: 'PIN Setup',
        message: 'This feature is coming soon in the next security update.',
        primaryButton: { text: 'OK', onPress: () => { } }
      });
    }
  };

  return (
    <BackgroundGradient>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        <TabHeader title="Privacy & Security" subtitle="Protect your focus and data" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* ── AUTHENTICATION ────────────────────────── */}
          <SectionLabel label="AUTHENTICATION" theme={theme} />
          <Card theme={theme}>
            <SettingRow
              icon={biometricType === 'Face ID' ? Eye : Fingerprint}
              title={`${biometricType} Lock`}
              subtitle={`Require ${biometricType} to open the app`}
              theme={theme}
            >
              <Switch
                value={faceIdEnabled}
                onValueChange={handleFaceIdToggle}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={Lock}
              title="App PIN"
              subtitle={appPin ? 'PIN is active' : 'Set a unique PIN for groundwork.'}
              theme={theme}
              onPress={handlePinSetup}
            />

            {(faceIdEnabled || appPin) && (
              <>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow
                  icon={Clock}
                  title="Auto-Lock Timeout"
                  subtitle={timeoutOptions.find(o => o.value === autoLockTimeout)?.label || 'Immediately'}
                  theme={theme}
                  onPress={() => setShowTimeoutModal(true)}
                />
              </>
            )}

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={ShieldCheck}
              title="Two-Factor Authentication"
              subtitle="Secure your account with 2FA"
              theme={theme}
              onPress={() => showAlert({
                title: 'Two-Factor Auth',
                message: 'Two-factor authentication can be managed via your account dashboard.',
                primaryButton: { text: 'OK', onPress: () => { } }
              })}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          {/* ── SESSIONS ─────────────────────────────── */}
          <SectionLabel label="ACTIVE SESSIONS" theme={theme} />
          <Card theme={theme}>
            {activeSessions.length > 1 && (
              <TouchableOpacity
                style={{ paddingBottom: 16, alignItems: 'center' }}
                onPress={() => showAlert({
                  title: 'Sign Out All Other Devices',
                  message: 'This will instantly revoke access from all other devices logged into this account.',
                  primaryButton: { text: 'Sign Out All', destructive: true, onPress: () => handleRevokeSession(() => revokeAllOtherSessions(), 'Authenticate to revoke all other sessions') },
                  secondaryButton: { text: 'Cancel', onPress: () => { } }
                })}
              >
                <Text style={{ color: theme.danger, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Revoke All Other Sessions</Text>
              </TouchableOpacity>
            )}

            {activeSessions.map((s, index) => {
              const isCurrent = s.id === deviceId;
              const isMobile = s.os?.toLowerCase().includes('ios') || s.os?.toLowerCase().includes('android');
              const Icon = isMobile ? Smartphone : Globe;

              return (
                <React.Fragment key={s.id}>
                  <View style={styles.sessionRow}>
                    <View style={[styles.sessionIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <Icon size={18} color={isCurrent ? accentColor : (s.suspicious ? theme.danger : theme.secondaryText)} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionTitle, { color: theme.primaryText }]}>
                        {s.device} {isCurrent ? '(This Device)' : ''}
                      </Text>
                      <Text style={[styles.sessionSubtitle, { color: s.suspicious ? theme.danger : theme.secondaryText }]}>
                        {s.location} • {isCurrent ? 'Current Session' : `Active: ${new Date(s.last_active).toLocaleDateString()}`}
                        {s.suspicious && ' • Suspicious'}
                      </Text>
                    </View>
                    {!isCurrent && (
                      <TouchableOpacity onPress={() => showAlert({
                        title: 'Sign Out',
                        message: `Sign out from ${s.device}?`,
                        primaryButton: { text: 'Sign Out', destructive: true, onPress: () => handleRevokeSession(() => revokeSession(s.id), `Authenticate to revoke ${s.device}`) },
                        secondaryButton: { text: 'Cancel', onPress: () => { } }
                      })}>
                        <LogOut size={16} color={theme.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {index < activeSessions.length - 1 && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
                </React.Fragment>
              );
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {/* ── LOGIN HISTORY ────────────────────────── */}
          <SectionLabel label="SECURITY HISTORY" theme={theme} />
          <Card theme={theme}>
            {MOCK_HISTORY.map((item, index) => (
              <React.Fragment key={item.id}>
                <View style={styles.historyRow}>
                  <View style={styles.timeline}>
                    <View style={[styles.dot, { backgroundColor: item.type === 'security' ? '#FF9500' : accentColor }]} />
                    {index < MOCK_HISTORY.length - 1 && <View style={[styles.line, { backgroundColor: theme.separator }]} />}
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyEvent, { color: theme.primaryText }]}>{item.event}</Text>
                    <Text style={[styles.historyMeta, { color: theme.secondaryText }]}>{item.date} at {item.time}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          {/* ── LEGAL ────────────────────────── */}
          <SectionLabel label="LEGAL" theme={theme} />
          <Card theme={theme}>
            <SettingRow
              icon={Shield}
              title="Privacy Policy"
              theme={theme}
              onPress={() => Linking.openURL('https://v0-barok-labs.vercel.app/privacy')}
              rightIcon={ExternalLink}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow
              icon={FileJson}
              title="Terms of Service"
              theme={theme}
              onPress={() => Linking.openURL('https://v0-barok-labs.vercel.app/terms')}
              rightIcon={ExternalLink}
            />
          </Card>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.tertiaryText }]}>
            groundwork. uses industry-standard encryption to protect your data.
          </Text>
          <View style={styles.encryptionBadge}>
            <Lock size={12} color={theme.success} />
            <Text style={[styles.encryptionText, { color: theme.success }]}>AES-256 Bit Encryption Active</Text>
          </View>
        </View>

      </ScrollView>

      {/* Auto-Lock Picker Modal */}
      <Modal transparent visible={showTimeoutModal} animationType="fade" onRequestClose={() => setShowTimeoutModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimeoutModal(false)}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Auto-Lock Timeout</Text>
            {timeoutOptions.map((opt, index) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalOption, index < timeoutOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.separator }]}
                onPress={() => {
                  setAutoLockTimeout(opt.value);
                  setShowTimeoutModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.primaryText }]}>{opt.label}</Text>
                {autoLockTimeout === opt.value && <Circle size={20} color={accentColor} fill={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    
    
    
    
    
  },
  settingRowContainer: {
    paddingVertical: 8,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
    marginTop: 2,
  },
  rightIconBox: {
    marginLeft: 8,
  },
  separator: {
    height: 1,
    marginVertical: 12,
    opacity: 0.05,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  sessionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  historyInfo: {
    flex: 1,
  },
  historyEvent: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  historyMeta: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  encryptionText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    
    
    
    
    
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  }
});
