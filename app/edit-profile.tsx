import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';

import { useTheme } from '@/lib/ThemeContext';
import { supabase as connectSupabase } from '@/lib/connect/connectSupabase';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, AlertCircle } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoleBadge } from '@/components/RoleBadge';
import * as ImagePicker from 'expo-image-picker';
import { requestIntelligentPermission, openSettings } from '@/lib/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/lib/db';

const isOnline = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://yevrsmlwmegovfwdxpjw.supabase.co', { method: 'HEAD' });
    return response.status >= 200 && response.status < 500;
  } catch (e) {
    return false;
  }
};

export default function EditProfileScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, setSession, profile } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load from profile store first (most up-to-date), fall back to session metadata
    if (profile || session?.user) {
      setName(profile?.full_name || session?.user?.user_metadata?.full_name || '');
      setUsername(profile?.username || session?.user?.user_metadata?.username || '');
      setBio(profile?.bio || session?.user?.user_metadata?.bio || '');
      setEmail(session?.user?.email || '');
      setAvatarUri(
        profile?.avatar_url ||
        session?.user?.user_metadata?.avatar_url ||
        `https://api.dicebear.com/7.x/avataaars/png?seed=${session?.user?.email || 'user'}`
      );

      // Load institution from connect_profiles
      if (session?.user?.id) {
        try {
          const row = db.getFirstSync<{ institution: string | null }>(
            'SELECT institution FROM connect_profiles WHERE user_id = ?',
            [session.user.id]
          );
          if (row?.institution) {
            setInstitution(row.institution);
          }
        } catch (e) {
          console.warn('[EditProfile] Failed to load institution:', e);
        }
      }
    }
  }, [session, profile]);

  // Check if username is already taken by another user (stable ref via useCallback)
  const checkUsernameAvailable = useCallback(async (uname: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', uname)
      .neq('id', session?.user?.id || '')
      .maybeSingle();
    if (error) {
      console.warn('[EditProfile] Username check error:', error);
      return true;
    }
    return !data;
  }, [session?.user?.id]);

  // Debounced real-time username availability check
  useEffect(() => {
    const currentUsername = profile?.username || session?.user?.user_metadata?.username || '';
    if (!username || username === currentUsername) {
      setUsernameStatus('idle');
      return;
    }
    if (/\s/.test(username) || !/^[a-zA-Z0-9._]+$/.test(username)) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(username.trim());
      setUsernameStatus(available ? 'available' : 'taken');
      if (!available) {
        setErrors(prev => ({ ...prev, username: 'This username is already taken.' }));
      } else {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailable]);


  const validate = () => {
    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (usernameStatus === 'taken') {
      newErrors.username = 'This username is already taken. Please choose another.';
      isValid = false;
    } else if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      newErrors.username = 'Only letters, numbers, dots, and underscores allowed';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Valid email is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Upload image to Supabase Storage and return the public URL
  const uploadAvatar = async (localUri: string): Promise<string> => {
    const userId = session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const contentType = mimeTypes[ext] || 'image/jpeg';
    const path = `${userId}/avatar.${ext}`;

    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, uint8Array, { contentType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Bust cache by appending timestamp
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handlePickImage = async () => {
    try {
      const { granted, status } = await requestIntelligentPermission('media');
      if (!granted) {
        // Fail-safe: Try requesting directly via ImagePicker
        const directReq = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!directReq.granted) {
          if (status === 'denied' || directReq.status === 'denied') {
            showAlert({
              title: "Permission Denied",
              message: "Photo access is currently denied in your device settings. Please allow access to change your profile photo.",
              primaryButton: { text: "Open Settings", onPress: openSettings },
              secondaryButton: { text: "Cancel", onPress: () => {} }
            });
          } else {
            showAlert({
              title: "Access Needed",
              message: "We need access to your photos to change your profile picture.",
              primaryButton: { text: "OK", onPress: () => {} }
            });
          }
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // compression
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[EditProfile] handlePickImage failed, trying direct launch fail-safe:', err);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (innerErr) {
        console.error('[EditProfile] Direct launch fail-safe failed:', innerErr);
        Alert.alert('Error', 'Could not open image library.');
      }
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    const online = await isOnline();

    try {
      if (!session?.user?.id) {
        // GUEST SAVE BRANCH
        const updatedProfile = {
          id: 'guest',
          username: username.trim(),
          full_name: name,
          bio: bio,
          avatar_url: avatarUri,
          role: 'member',
          pro_status: false,
        };

        // Save to Zustand
        useAuthStore.setState({ profile: updatedProfile as any });

        // Save to AsyncStorage
        await AsyncStorage.setItem('profile_guest', JSON.stringify(updatedProfile));

        // Save to SQLite
        try {
          db.runSync(
            'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)',
            ['guest', 'guest', username.trim(), bio, avatarUri, 'General', new Date().toISOString(), new Date().toISOString()]
          );
        } catch (dbErr) {
          console.warn('[EditProfile] Guest SQLite profile update error:', dbErr);
        }

        showAlert({
          title: "Profile Updated",
          message: "Your guest profile changes have been saved locally.",
          primaryButton: { 
            text: "Done", 
            onPress: () => router.back() 
          }
        });
        setIsLoading(false);
        return;
      }

      // Check offline mode or connectivity
      if (!online) {
        // OFFLINE SAVE BRANCH (AUTHENTICATED USER)
        const cachedProfile = {
          ...(profile || {}),
          full_name: name,
          username: username.trim(),
          bio: bio,
          avatar_url: avatarUri,
          updated_at: new Date().toISOString()
        };

        // Save updated profile to state
        useAuthStore.setState({ profile: cachedProfile as any });
        // Save to local cache
        await AsyncStorage.setItem(`profile_${session.user.id}`, JSON.stringify(cachedProfile));

        // Update local SQLite
        try {
          const now = new Date().toISOString();
          db.runSync(
            'INSERT OR REPLACE INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
            [session.user.id, session.user.id, username.trim(), bio, avatarUri, 0, 'General', new Date().toISOString(), now]
          );
        } catch (dbErr) {
          console.warn('[EditProfile] SQLite local updates failure:', dbErr);
        }

        showAlert({
          title: "Saved Offline",
          message: "You are offline. Your profile changes have been saved locally and will sync when you go online.",
          primaryButton: { 
            text: "Done", 
            onPress: () => router.back() 
          }
        });
        setIsLoading(false);
        return;
      }

      // 1. Check if username is already taken
      const usernameChanged = username.toLowerCase() !== (profile?.username || '').toLowerCase();
      if (usernameChanged && username.trim()) {
        const available = await checkUsernameAvailable(username.trim());
        if (!available) {
          setErrors(prev => ({ ...prev, username: 'This username is already taken. Please choose another.' }));
          setIsLoading(false);
          return;
        }
      }

      // 2. Upload avatar to Supabase Storage if it's a local URI (starts with file:// or content://)
      let finalAvatarUrl = avatarUri;
      const isLocalUri = avatarUri && (avatarUri.startsWith('file://') || avatarUri.startsWith('content://'));
      if (isLocalUri) {
        try {
          finalAvatarUrl = await uploadAvatar(avatarUri!);
        } catch (uploadErr: any) {
          console.warn('[EditProfile] Avatar upload failed, using local URI fallback:', uploadErr.message);
          // Don't discard their selected avatar! Let them use it locally.
          finalAvatarUrl = avatarUri;
        }
      }

      // 3. Update auth.users metadata
      const { data, error } = await supabase.auth.updateUser({
        email: email !== session?.user?.email ? email : undefined,
        data: {
          full_name: name,
          username: username.trim(),
          bio: bio,
          avatar_url: finalAvatarUrl,
        }
      });

      if (error) throw error;

      if (data?.user) {
        // 4. Direct update to profiles table (authoritative source)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: name,
            username: username.trim(),
            bio: bio,
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', session!.user.id);

        if (profileError) {
          throw new Error(`Failed to update primary profile: ${profileError.message}`);
        }

        // 4.5. Direct update to connect_profiles table (SQLite & Supabase connect)
        try {
          const now = new Date().toISOString();
          db.runSync(
            'UPDATE connect_profiles SET username = ?, bio = ?, avatar_url = ?, institution = ?, updated_at = ? WHERE user_id = ?',
            [username.trim(), bio, finalAvatarUrl, institution.trim() || null, now, session!.user.id]
          );
          const { error: connectError } = await connectSupabase.from('connect_profiles')
            .update({
              username: username.trim(),
              bio,
              avatar_url: finalAvatarUrl,
              institution: institution.trim() || null,
              updated_at: now,
            })
            .eq('user_id', session!.user.id);

          if (connectError) {
            throw new Error(`Failed to update connect profile: ${connectError.message}`);
          }
        } catch (dbErr: any) {
          throw new Error(`Profile sync failed: ${dbErr.message}`);
        }

        // 5. Update Zustand store immediately for instant UI refresh
        useAuthStore.setState({
          profile: {
            ...useAuthStore.getState().profile,
            full_name: name,
            username: username.trim(),
            bio: bio,
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString()
          } as any
        });

        // 6. Refresh session
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        
        showAlert({
          title: "Profile Updated",
          message: "Your changes have been saved.",
          primaryButton: { 
            text: "Done", 
            onPress: () => router.back() 
          }
        });
      }
    } catch (e: any) {
      console.error('[EditProfile] Save error:', e);
      showAlert({
        title: "Update Failed",
        message: e.message || "Something went wrong updating your profile.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading} style={styles.saveBtn}>
            {isLoading ? (
              <ActivityIndicator color={theme.accent} size="small" />
            ) : (
              <Text style={[styles.saveText, { color: theme.accent }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          // Updated content container padding for extra bottom space
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 64 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer}>
              <Image 
                source={{ uri: avatarUri || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Barok' }} 
                style={[styles.avatar, { borderColor: theme.cardBorder }]} 
              />
              <View style={[styles.cameraBadge, { backgroundColor: theme.accent }]}>
                <Camera size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhotoText, { color: theme.accent }]} onPress={handlePickImage}>
              Change Profile Photo
            </Text>
            {profile && (
              <View style={{ marginTop: 12 }}>
                <RoleBadge role={profile.role} isPro={profile.pro_status} />
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.name ? '#FF3B30' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="Your full name"
                placeholderTextColor={theme.tertiaryText}
              />
            </View>
            {errors.name && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.name}</Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Username</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: inputBg, 
              borderColor: errors.username ? '#FF3B30' 
                : usernameStatus === 'available' ? '#34C759' 
                : inputBorder 
            }]}>
              <Text style={[styles.prefix, { color: theme.tertiaryText }]}>@</Text>
              <TextInput
                style={[styles.input, { color: theme.primaryText, paddingLeft: 0, flex: 1 }]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.toLowerCase().replace(/[^a-zA-Z0-9._]/g, ''));
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                }}
                placeholder="username"
                placeholderTextColor={theme.tertiaryText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameStatus === 'checking' && (
                <ActivityIndicator size="small" color={theme.tertiaryText} style={{ marginRight: 8 }} />
              )}
              {usernameStatus === 'available' && (
                <Text style={{ color: '#34C759', fontSize: 18, marginRight: 8 }}>✓</Text>
              )}
              {usernameStatus === 'taken' && (
                <Text style={{ color: '#FF3B30', fontSize: 18, marginRight: 8 }}>✗</Text>
              )}
            </View>
            {errors.username ? (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.username}</Text>
              </View>
            ) : usernameStatus === 'available' ? (
              <Text style={[styles.helperText, { color: '#34C759' }]}>Username is available!</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.email ? '#FF3B30' : inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="your@email.com"
                placeholderTextColor={theme.tertiaryText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}
            <Text style={[styles.helperText, { color: theme.tertiaryText }]}>
              Changing your email will require verification.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Bio</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder, height: 100 }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.primaryText }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a little about yourself"
                placeholderTextColor={theme.tertiaryText}
                multiline
                maxLength={160}
                textAlignVertical="top"
              />
            </View>
            <Text style={[styles.charCount, { color: theme.tertiaryText }]}>
              {bio.length}/160
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Academic Institution</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g. MIT, Stanford, Oxford"
                placeholderTextColor={theme.tertiaryText}
                maxLength={100}
              />
            </View>
            <Text style={[styles.helperText, { color: theme.tertiaryText }]}>
              Shown on your profile to help peers find you.
            </Text>
          </View>

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
    width: 80,
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
  saveBtn: {
    width: 80,
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  changePhotoText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
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
    paddingHorizontal: 16,
    height: 56,
  },
  prefix: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    height: '100%',
  },
  textArea: {
    paddingTop: 16,
    paddingBottom: 16,
    height: 100,
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
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'right',
    marginTop: 8,
  },
});
