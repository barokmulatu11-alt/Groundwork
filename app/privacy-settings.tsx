import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { MFAEnrollment } from '@/components/security/MFAEnrollment';
import { SecurityUtils } from '@/lib/security';

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
    <View style={[styles.card, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
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
  let label = 'Not Requested';
  let badgeColor = '#8E8E93';
  let bg = 'rgba(142,142,147,0.12)';

  if (status === 'granted') {
    label = 'Granted';
    badgeColor = '#34C759';
    bg = 'rgba(52,199,89,0.12)';
  } else if (status === 'limited') {
    label = 'Limited';
    badgeColor = '#FF9500';
    bg = 'rgba(255,149,0,0.12)';
  } else if (status === 'denied') {
    label = 'Denied';
    badgeColor = '#FF3B30';
    bg = 'rgba(255,59,48,0.12)';
  } else if (status === 'on_demand') {
    label = 'On Demand';
    badgeColor = '#007AFF';
    bg = 'rgba(0,122,255,0.12)';
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.permBadge, { backgroundColor: bg }]}>
      <Text style={[styles.permBadgeText, { color: badgeColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PrivacySettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;

  const { faceIdEnabled, setFaceIdEnabled, appPin, setAppPin, autoLockTimeout, setAutoLockTimeout } = useSettingsStore();
  const { session } = useAuthStore();
  const { activeSessions, deviceId, revokeSession, revokeAllOtherSessions } = useSessionStore();

  const [biometricType, setBiometricType] = useState<string>('Fingerprint/Face ID');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [isMFAActive, setIsMFAActive] = useState(false);
  const [isMFASupported, setIsMFASupported] = useState(false);

  // Automatically clear any legacy app PIN if set
  useEffect(() => {
    if (appPin) {
      setAppPin(null);
      SecurityUtils.clearPin().catch(() => {});
    }
  }, [appPin, setAppPin]);

  const [permissions, setPermissions] = useState({
    camera: 'undetermined',
    microphone: 'undetermined',
    media: 'undetermined',
    files: Platform.OS === 'web' ? 'on_demand' : 'undetermined',
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
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType('Fingerprint/Face ID');
        
        const mfaStatus = await SecurityUtils.getMFAStatus();
        setIsMFASupported(mfaStatus.supported);
        setIsMFAActive(mfaStatus.verified);
      } catch (_) {}
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
    if (faceIdEnabled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
      });
      if (!result.success) return; // User canceled or failed
    }

    // Proceed if successful or no security enabled
    action();
  };

  const handle2FASetup = async () => {
    if (!isMFASupported) {
      showAlert({
        title: '2FA Not Available',
        message: 'Two-factor authentication (TOTP) is currently not supported by the active authentication provider.',
        primaryButton: { text: 'OK', onPress: () => { } }
      });
      return;
    }
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -0.5 }}>
            Privacy.
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            App lock, sessions and permissions.
          </Text>
        </View>

        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          {/* ── APP PERMISSIONS ────────────────────────── */}
          <SectionLabel label="APP PERMISSIONS" theme={theme} />
          <Card theme={theme}>
            <SettingRow
              icon={Camera}
              title="Camera"
              subtitle="Photos for profile and avatars"
              theme={theme}
              onPress={openSettings}
            >
              <PermissionBadge status={permissions.camera} onPress={openSettings} />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow
              icon={Mic}
              title="Microphone"
              subtitle="Voice recordings & audio input"
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

          </Card>

          {faceIdEnabled && (
            <Animated.View entering={FadeInDown.duration(400)}>
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
                subtitle={isMFAActive ? '2FA is active' : (isMFASupported ? 'Secure your account with 2FA' : 'Unavailable on this auth provider')}
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
          {/* ── SECURITY HISTORY ────────────────────────── */}
          <SectionLabel label="SECURITY HISTORY" theme={theme} />
          <Card theme={theme}>
            <View style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={28} color={theme.tertiaryText} style={{ marginBottom: 8, opacity: 0.6 }} />
              <Text style={{ color: theme.primaryText, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 4 }}>
                Security History Unavailable
              </Text>
              <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 }}>
                Remote security audit logging is not supported by the active authentication provider. Active sessions and local security controls can be managed directly on this screen.
              </Text>
            </View>
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
              onPress={() => Linking.openURL('https://barok-labs.pro.et/privacy')}
              rightIcon={ExternalLink}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow
              icon={FileJson}
              title="Terms of Service"
              theme={theme}
              onPress={() => Linking.openURL('https://barok-labs.pro.et/terms')}
              rightIcon={ExternalLink}
            />
          </Card>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.tertiaryText }]}>
            Network requests use secure HTTPS connections and local data is isolated to your device storage.
          </Text>
          <View style={[styles.encryptionBadge, { backgroundColor: theme.cardBorder + '30' }]}>
            <Lock size={12} color={theme.accent} />
            <Text style={[styles.encryptionText, { color: theme.accent }]}>Secure HTTPS Connection</Text>
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

    </View>
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
