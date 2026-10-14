import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { ActionRow } from '@/components/ui/ActionRow';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Lock,
  LogOut,
  Mail,
  User,
  ShieldAlert,
  Check,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, isGuest, signOut, isSigningOut, setProfile, setSession } = useAuthStore();

  // Change Name Modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Change Email Modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const currentFullName = profile?.full_name || session?.user?.user_metadata?.full_name || (isGuest ? 'Guest User' : '');
  const currentUsername = profile?.username || session?.user?.user_metadata?.username || (isGuest ? 'guest' : 'user');
  const currentEmail = session?.user?.email || (isGuest ? 'No account connected (Guest)' : 'Not set');

  const handleOpenChangeName = () => {
    if (isGuest || !session) {
      showAlert({
        title: 'Guest Account',
        message: 'You are currently using Groundwork in guest mode. Create a free account or sign in to personalize your profile across devices.',
        primaryButton: {
          text: 'Sign In / Register',
          onPress: () => router.push('/login' as any),
        },
        secondaryButton: { text: 'Dismiss', onPress: () => {} },
      });
      return;
    }
    setNewName(currentFullName);
    setNameError(null);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }

    setIsUpdatingName(true);
    setNameError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) throw error;

      // Update local profile store
      if (profile) {
        setProfile({ ...profile, full_name: trimmed });
      }
      if (session?.user) {
        setSession({
          ...session,
          user: {
            ...session.user,
            user_metadata: {
              ...(session.user.user_metadata || {}),
              full_name: trimmed,
            },
          },
        });
      }

      // Sync to profiles table if present
      try {
        await supabase.from('profiles').update({ full_name: trimmed }).eq('id', session!.user.id);
      } catch (_) {}

      setShowNameModal(false);
      showAlert({
        title: 'Name Updated',
        message: 'Your display name has been successfully updated.',
        primaryButton: { text: 'Done', onPress: () => {} },
      });
    } catch (err: any) {
      setNameError(err?.message || 'Failed to update name. Please try again.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleOpenChangeEmail = () => {
    if (isGuest || !session) {
      showAlert({
        title: 'Guest Account',
        message: 'You are currently using Groundwork in guest mode. Create a free account to register an email address and backup your data.',
        primaryButton: {
          text: 'Sign In / Register',
          onPress: () => router.push('/login' as any),
        },
        secondaryButton: { text: 'Dismiss', onPress: () => {} },
      });
      return;
    }
    setNewEmail('');
    setEmailError(null);
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (trimmed === session?.user?.email?.toLowerCase()) {
      setEmailError('The new email must be different from your current email.');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailError(null);
    try {
      const { data, error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      if (!data) throw new Error('Email update request could not be processed by the server.');

      setShowEmailModal(false);
      showAlert({
        title: 'Verification Link Sent',
        message: `A confirmation link has been sent to ${trimmed}. Please check your inbox and verify the email to complete the change.`,
        primaryButton: { text: 'Got it', onPress: () => {} },
      });
    } catch (err: any) {
      setEmailError(err?.message || 'Failed to update email. Please try again.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSignOut = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of groundwork.?',
      primaryButton: {
        text: 'Sign Out',
        destructive: true,
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login' as any);
          } catch (e) {
            console.error('Sign out error:', e);
            router.replace('/login' as any);
          }
        },
      },
      secondaryButton: { text: 'Cancel', onPress: () => {} },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -1 }}>
            Account.
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Profile and sign-in.
          </Text>
        </View>

        {/* Guest Mode Honest Identifier Banner */}
        {(isGuest || !session) && (
          <View style={[styles.guestBanner, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
            <View style={styles.guestBannerTop}>
              <View style={[styles.guestBadge, { backgroundColor: theme.accent + '20' }]}>
                <Sparkles size={16} color={theme.accent} />
                <Text style={[styles.guestBadgeText, { color: theme.accent }]}>Guest Mode</Text>
              </View>
            </View>
            <Text style={[styles.guestTitle, { color: theme.text }]}>
              Local Device Account
            </Text>
            <Text style={[styles.guestDescription, { color: theme.textSecondary }]}>
              You are exploring Groundwork without a signed-in cloud account. All tasks, habits, and focus sessions are saved locally on this device.
            </Text>
            <TouchableOpacity
              style={[styles.createAccountBtn, { backgroundColor: theme.accent }]}
              activeOpacity={0.8}
              onPress={() => router.push('/login' as any)}
            >
              <UserCheck size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.createAccountBtnText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERSONAL INFO</Text>
        <View style={[styles.group, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
          <ActionRow
            Icon={User}
            title="Change Name"
            subtitle={currentFullName || (isGuest ? 'Guest User' : 'Not set')}
            onPress={handleOpenChangeName}
          />
          <ActionRow
            Icon={User}
            title="Change Username"
            subtitle={`@${currentUsername}`}
            onPress={() => {
              if (isGuest || !session) {
                showAlert({
                  title: 'Guest Account',
                  message: 'Sign in or create an account to customize your unique username.',
                  primaryButton: { text: 'Sign In', onPress: () => router.push('/login' as any) },
                  secondaryButton: { text: 'Cancel', onPress: () => {} },
                });
              } else {
                router.push('/edit-profile');
              }
            }}
          />
          <ActionRow
            Icon={Mail}
            title="Change Email"
            subtitle={currentEmail}
            onPress={handleOpenChangeEmail}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 24 }]}>SECURITY</Text>
        <View style={[styles.group, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
          <ActionRow
            Icon={Lock}
            title="Change Password"
            subtitle={isGuest ? 'Available for cloud accounts' : 'Update your account password'}
            onPress={() => {
              if (isGuest || !session) {
                showAlert({
                  title: 'Guest Account',
                  message: 'Password management requires a registered cloud account.',
                  primaryButton: { text: 'Sign In', onPress: () => router.push('/login' as any) },
                  secondaryButton: { text: 'Cancel', onPress: () => {} },
                });
              } else {
                router.push('/change-password' as any);
              }
            }}
          />
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.06)',
                opacity: isSigningOut ? 0.7 : 1,
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <LogOut size={20} color="#FF3B30" />
            )}
            <Text style={styles.logoutText}>{isSigningOut ? 'Signing out...' : isGuest ? 'Exit Guest Mode' : 'Sign Out'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdatingName && setShowNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Change Name</Text>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                disabled={isUpdatingName}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
              Enter your preferred full name as you would like it displayed in Groundwork.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.primaryText,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: nameError ? theme.danger : theme.cardBorder,
                },
              ]}
              value={newName}
              onChangeText={(t) => {
                setNewName(t);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Alex Morgan"
              placeholderTextColor={theme.tertiaryText}
              autoFocus
              editable={!isUpdatingName}
            />

            {nameError && (
              <View style={styles.errorRow}>
                <ShieldAlert size={14} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{nameError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: theme.separator }]}
                onPress={() => setShowNameModal(false)}
                disabled={isUpdatingName}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: theme.accent }]}
                onPress={handleSaveName}
                disabled={isUpdatingName}
              >
                {isUpdatingName ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdatingEmail && setShowEmailModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Change Email</Text>
              <TouchableOpacity
                onPress={() => setShowEmailModal(false)}
                disabled={isUpdatingEmail}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
              Enter your new email address. A confirmation message will be sent to confirm ownership.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.primaryText,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: emailError ? theme.danger : theme.cardBorder,
                },
              ]}
              value={newEmail}
              onChangeText={(t) => {
                setNewEmail(t);
                if (emailError) setEmailError(null);
              }}
              placeholder="e.g. name@example.com"
              placeholderTextColor={theme.tertiaryText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!isUpdatingEmail}
            />

            {emailError && (
              <View style={styles.errorRow}>
                <ShieldAlert size={14} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{emailError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: theme.separator }]}
                onPress={() => setShowEmailModal(false)}
                disabled={isUpdatingEmail}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: theme.accent }]}
                onPress={handleSaveEmail}
                disabled={isUpdatingEmail}
              >
                {isUpdatingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Update Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: -4, marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  headerTitle: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
  group: { marginBottom: 8 },
  logoutContainer: { marginTop: 40, marginBottom: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, gap: 10, width: '100%', justifyContent: 'center' },
  logoutText: { color: '#FF3B30', fontSize: 16, fontFamily: 'Inter_700Bold' },

  // Guest banner
  guestBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  guestBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  guestBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  guestDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 14,
  },
  createAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginBottom: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBtnSave: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
