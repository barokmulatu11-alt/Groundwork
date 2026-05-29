import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { checkPermissionStatus, openSettings } from '@/lib/permissions';
import {
  Camera,
  ChevronLeft,
  Circle,
  Clock,
  ExternalLink,
  Eye,
  FileJson,
  Fingerprint,
  Folder,
  Globe,
  Image as ImageIcon,
  Lock,
  LogOut,
  Mic,
  Shield,
  ShieldCheck,
  Smartphone
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockScreen } from '@/components/security/LockScreen';
import { MFAEnrollment } from '@/components/security/MFAEnrollment';
import { SecurityUtils } from '@/lib/security';
import { supabase } from '@/lib/supabase';

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

function PermissionBadge({ status, onPress }: { status: string; onPress: () => void }) {
  const isGranted = status === 'granted' || status === 'limited';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.permBadge, { backgroundColor: isGranted ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)' }]}>
      <Text style={[styles.permBadgeText, { color: isGranted ? '#34C759' : '#FF3B30' }]}>
        {isGranted ? (status === 'limited' ? 'Limited' : 'Granted') : 'Denied'}
      </Text>
    </TouchableOpacity>
  );
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
  const accentColor = theme.accent;

  const { faceIdEnabled, setFaceIdEnabled, appPin, setAppPin, autoLockTimeout, setAutoLockTimeout } = useSettingsStore();
  const { session } = useAuthStore();
  const { activeSessions, deviceId, revokeSession, revokeAllOtherSessions } = useSessionStore();

  const [biometricType, setBiometricType] = useState<string>('Face ID');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify' | 'change_step1' | 'change_step2' | 'change_step3'>('setup');
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [isMFAActive, setIsMFAActive] = useState(false);

  const [permissions, setPermissions] = useState({
    camera: 'undetermined',
    microphone: 'undetermined',
    media: 'undetermined',
    files: 'granted',
  });

  const loadPermissions = async () => {
    const cam = await checkPermissionStatus('camera');
    const mic = await checkPermissionStatus('microphone');
    const med = await checkPermissionStatus('media');
    setPermissions({
      camera: cam,
      microphone: mic,
      media: med,
      files: 'granted',
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPermissions();
    }, [])
  );

  const timeoutOptions = [
    { label: 'Immediately', value: 0 },
    { label: 'After 1 minute', value: 60 },
    { label: 'After 5 minutes', value: 300 },
    { label: 'After 15 minutes', value: 900 },
  ];

  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricType('Fingerprint/Face ID');
      
      const mfaStatus = await SecurityUtils.getMFAStatus();
      setIsMFAActive(mfaStatus.verified);
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

  const handlePinToggle = (value: boolean) => {
    if (value) {
      setPinMode('setup');
      setShowPinSetup(true);
    } else {
      setPinMode('verify'); // Require current PIN to disable
      setShowPinSetup(true);
    }
  };

  const handlePinSetupSuccess = async (pin?: string) => {
    if (pinMode === 'setup') {
      if (pin) {
        await SecurityUtils.savePin(pin);
        setAppPin('active');
        setShowPinSetup(false);
        showAlert({ title: 'PIN Set', message: 'Your app PIN has been successfully enabled.', primaryButton: { text: 'Great', onPress: () => {} }});
      }
    } else if (pinMode === 'verify') {
      // Disabling PIN
      await SecurityUtils.clearPin();
      setAppPin(null);
      setShowPinSetup(false);
      showAlert({ title: 'Security Disabled', message: 'App PIN lock has been turned off.', primaryButton: { text: 'OK', onPress: () => {} }});
    } else if (pinMode === 'change_step1') {
      // Current PIN verified, move to step 2
      setPinMode('change_step2');
    } else if (pinMode === 'change_step2') {
      // New PIN entered, move to step 3 (confirmation)
      setPinMode('change_step3');
    } else if (pinMode === 'change_step3') {
      // New PIN confirmed
      if (pin) {
        await SecurityUtils.savePin(pin);
        setAppPin('active');
        setShowPinSetup(false);
        showAlert({ title: 'PIN Changed', message: 'Your security PIN has been updated.', primaryButton: { text: 'Done', onPress: () => {} }});
      }
    }
  };

  const handleChangePin = () => {
    setPinMode('change_step1');
    setShowPinSetup(true);
  };

  const handle2FASetup = async () => {
    if (isMFAActive) {
      showAlert({
        title: 'Disable 2FA',
        message: 'Two-factor authentication is currently active. To disable it, please contact support or use your recovery codes.',
        primaryButton: { text: 'OK', onPress: () => { } }
      });
    } else {
      setShowMFAEnrollment(true);
    }
  };

  return (
    <BackgroundGradient>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        <TabHeader title="Privacy & Permissions" subtitle="Protect your focus and manage data access" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          {/* ── APP PERMISSIONS ────────────────────────── */}
          <SectionLabel label="APP PERMISSIONS" theme={theme} />
          <Card theme={theme}>
            <SettingRow
              icon={Camera}
              title="Camera"
              subtitle="Photos for your notes & profile"
              theme={theme}
              onPress={openSettings}
            >
              <PermissionBadge status={permissions.camera} onPress={openSettings} />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={Mic}
              title="Microphone"
              subtitle="Voice recordings & audio notes"
              theme={theme}
              onPress={openSettings}
            >
              <PermissionBadge status={permissions.microphone} onPress={openSettings} />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={ImageIcon}
              title="Photos & Media"
              subtitle="Pick images from your gallery"
              theme={theme}
              onPress={openSettings}
            >
              <PermissionBadge status={permissions.media} onPress={openSettings} />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={Folder}
              title="Files & Storage"
              subtitle="Attachments & downloaded files"
              theme={theme}
              onPress={openSettings}
            >
              <PermissionBadge status={permissions.files} onPress={openSettings} />
            </SettingRow>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* ── AUTHENTICATION ────────────────────────── */}
          <SectionLabel label="AUTHENTICATION" theme={theme} />
          <Card theme={theme}>
            <SettingRow
              icon={Fingerprint}
              title="Fingerprint/Face ID"
              subtitle="Use biometrics to unlock the app"
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
              title="App PIN Lock"
              subtitle="Protect your app with a secure PIN"
              theme={theme}
            >
              <Switch
                value={!!appPin}
                onValueChange={handlePinToggle}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>
          </Card>

          {appPin && (
            <Animated.View entering={FadeInDown.duration(400)}>
              {/* Main Visual PIN Card */}
              <View style={[styles.mainPinCard, { backgroundColor: theme.card }]}>
                <View style={styles.pinDotsContainer}>
                  {[...Array(4)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.visualDot, 
                        { borderColor: theme.cardBorder + '80', backgroundColor: accentColor } 
                      ]} 
                    />
                  ))}
                </View>
                <Text style={[styles.pinIndicatorLabel, { color: theme.secondaryText }]}>PIN Security Active</Text>
              </View>

              {/* Secondary Actions Card */}
              <Card theme={theme}>
                <SettingRow
                  icon={Shield}
                  title="Change PIN"
                  theme={theme}
                  onPress={handleChangePin}
                />
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow
                  icon={ShieldCheck}
                  title="Disable PIN"
                  theme={theme}
                  onPress={() => handlePinToggle(false)}
                />
              </Card>

              {/* Timeout Setting */}
              <View style={{ marginTop: 12 }}>
                <Card theme={theme}>
                  <SettingRow
                    icon={Clock}
                    title="Auto-Lock Timeout"
                    subtitle={timeoutOptions.find(o => o.value === autoLockTimeout)?.label || 'Immediately'}
                    theme={theme}
                    onPress={() => setShowTimeoutModal(true)}
                  />
                </Card>
              </View>
            </Animated.View>
          )}

          <View style={{ marginTop: 24 }}>
            <SectionLabel label="ACCOUNT SECURITY" theme={theme} />
            <Card theme={theme}>
              <SettingRow
                icon={ShieldCheck}
                title="Two-Factor Authentication"
                subtitle={isMFAActive ? '2FA is active' : 'Secure your account with 2FA'}
                theme={theme}
                onPress={handle2FASetup}
              />
            </Card>
          </View>
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
          <View style={[styles.modalBox, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder }]}>
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

      {/* PIN Flow Modal */}
      <Modal visible={showPinSetup} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
        <LockScreen 
          mode={pinMode} 
          onSuccess={handlePinSetupSuccess}
          onCancel={() => setShowPinSetup(false)}
        />
      </Modal>

      {/* MFA Enrollment Modal */}
      <Modal visible={showMFAEnrollment} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
        <MFAEnrollment 
          onSuccess={() => {
            setShowMFAEnrollment(false);
            setIsMFAActive(true);
            showAlert({ title: '2FA Enabled', message: 'Two-factor authentication is now active on your account.', primaryButton: { text: 'Done', onPress: () => {} }});
          }}
          onCancel={() => setShowMFAEnrollment(false)}
        />
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
    opacity: 0.1,
  },
  mainPinCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  visualDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  pinIndicatorLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
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
  },
  permBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  permBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  }
});
