import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';

import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, AlertCircle } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, setSession } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.user) {
      setName(session.user.user_metadata?.full_name || '');
      setUsername(session.user.user_metadata?.username || '');
      setBio(session.user.user_metadata?.bio || '');
      setEmail(session.user.email || '');
      setAvatarUri(session.user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Barok');
    }
  }, [session]);

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
    } else if (/\s/.test(username)) {
      newErrors.username = 'Username cannot contain spaces';
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

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: "Permission Denied",
        message: "We need access to your photos to change your profile picture.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
      return;
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
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsLoading(true);

    try {
      // In a real app we might upload the image to Supabase Storage here and get a public URL
      // For now we will just store the local URI or use the existing one if not changed
      
      const { data, error } = await supabase.auth.updateUser({
        email: email !== session?.user?.email ? email : undefined,
        data: {
          full_name: name,
          username: username,
          bio: bio,
          avatar_url: avatarUri,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // Force refresh session
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        
        showAlert({
          title: "Success",
          message: "Your profile has been updated.",
          primaryButton: { 
            text: "Done", 
            onPress: () => router.back() 
          }
        });
      }
    } catch (e: any) {
      console.error(e);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
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
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: errors.username ? '#FF3B30' : inputBorder }]}>
              <Text style={[styles.prefix, { color: theme.tertiaryText }]}>@</Text>
              <TextInput
                style={[styles.input, { color: theme.primaryText, paddingLeft: 0 }]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.toLowerCase());
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                }}
                placeholder="username"
                placeholderTextColor={theme.tertiaryText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.username && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{errors.username}</Text>
              </View>
            )}
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
