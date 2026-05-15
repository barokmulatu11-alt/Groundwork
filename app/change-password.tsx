import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;
  
  const getStrengthColor = () => {
    if (newPassword.length === 0) return theme.cardBorder;
    if (strengthScore <= 1) return '#FF3B30'; // Weak
    if (strengthScore <= 3) return '#FFCC00'; // Fair
    return '#34C759'; // Strong
  };

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return '';
    if (strengthScore <= 1) return 'Weak';
    if (strengthScore <= 3) return 'Fair';
    return 'Strong';
  };

  const validate = () => {
    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.current = 'Current password is required';
      isValid = false;
    }

    if (strengthScore < 4) {
      newErrors.new = 'Password does not meet all requirements';
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    if (!session?.user?.email) {
      showAlert({
        title: "Error",
        message: "No active user session found.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ current: 'Incorrect current password' });
        setIsLoading(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // 3. Send security notification (simulated local notification since Supabase email is handled server-side if configured)
      // Notifications.scheduleNotificationAsync({ ... }) would go here.
      
      showAlert({
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        primaryButton: { 
          text: "Done", 
          onPress: () => router.back() 
        }
      });
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: "Update Failed",
        message: e.message || "An error occurred while changing your password.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <View style={styles.reqItem}>
      {met ? (
        <CheckCircle2 size={16} color="#34C759" />
      ) : (
        <View style={[styles.reqDot, { backgroundColor: theme.cardBorder }]} />
      )}
      <Text style={[styles.reqText, { color: met ? theme.primaryText : theme.tertiaryText }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>Settings</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Change Password</Text>
          <View style={{ width: 80 }} /> {/* Spacer */}
        </View>

        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.iconContainer}>
            <View style={[styles.shieldBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Lock size={32} color={theme.primaryText} />
            </View>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Create a strong password to keep your account secure.
            </Text>
          </View>

          {/* Current Password */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Current Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.current ? '#FF3B30' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (errors.current) setErrors(prev => ({ ...prev, current: '' }));
                }}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor={theme.tertiaryText}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                {showCurrent ? <EyeOff size={20} color={theme.tertiaryText} /> : <Eye size={20} color={theme.tertiaryText} />}
              </TouchableOpacity>
            </View>
            {errors.current && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.current}</Text>
              </View>
            )}
          </View>

          {/* New Password */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>New Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.new ? '#FF3B30' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.new) setErrors(prev => ({ ...prev, new: '' }));
                }}
                secureTextEntry={!showNew}
                placeholder="Enter new password"
                placeholderTextColor={theme.tertiaryText}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                {showNew ? <EyeOff size={20} color={theme.tertiaryText} /> : <Eye size={20} color={theme.tertiaryText} />}
              </TouchableOpacity>
            </View>
            {errors.new && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.new}</Text>
              </View>
            )}
            
            {/* Strength Indicator */}
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View 
                    key={level} 
                    style={[
                      styles.strengthBar, 
                      { backgroundColor: newPassword.length > 0 && strengthScore >= level ? getStrengthColor() : theme.cardBorder }
                    ]} 
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
                {getStrengthLabel()}
              </Text>
            </View>

            <View style={styles.requirementsContainer}>
              <RequirementItem met={hasMinLength} text="At least 8 characters" />
              <RequirementItem met={hasUppercase} text="At least one uppercase letter" />
              <RequirementItem met={hasLowercase} text="At least one lowercase letter" />
              <RequirementItem met={hasNumber} text="At least one number" />
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.confirm ? '#FF3B30' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirm) setErrors(prev => ({ ...prev, confirm: '' }));
                }}
                secureTextEntry={!showConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={theme.tertiaryText}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={20} color={theme.tertiaryText} /> : <Eye size={20} color={theme.tertiaryText} />}
              </TouchableOpacity>
            </View>
            {errors.confirm && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.confirm}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword} 
            style={[
              styles.saveBtnLarge, 
              { 
                backgroundColor: theme.accent,
                opacity: (!currentPassword || !newPassword || !confirmPassword) ? 0.5 : 1
              }
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    height: '100%',
  },
  eyeBtn: {
    padding: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  strengthContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
  },
  requirementsContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reqDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  reqText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  saveBtnLarge: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
