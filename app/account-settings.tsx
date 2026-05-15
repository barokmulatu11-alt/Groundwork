import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ActionRow } from '@/components/ui/ActionRow';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { NativeSheet } from '@/components/ui/NativeSheet';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Globe,
  Link2,
  Lock,
  LogOut,
  Mail,
  Trash2,
  User,
  Activity,
  Plus,
  Github,
  Instagram,
  Send
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [manualLinks, setManualLinks] = useState<{name: string, url: string, type?: string}[]>([]);
  const [isManualSheetVisible, setManualSheetVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedType, setSelectedType] = useState('website');

  useEffect(() => {
    if (session?.user?.user_metadata?.manual_links) {
      setManualLinks(session.user.user_metadata.manual_links);
    }
  }, [session]);

  const getProviderIdentity = (providerName: string) => {
    return session?.user?.identities?.find(id => id.provider === providerName);
  };

  const handleLink = async (provider: 'google' | 'github') => {
    try {
      setLinkingProvider(provider);
      const redirectUrl = 'groundwork://';
      
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          const parsed = Linking.parse(res.url);
          const { access_token, refresh_token } = (parsed.queryParams || {}) as any;
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            await useAuthStore.getState().initialize();
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      if (e) {
        const errMsg = (e.message || '').toLowerCase();
        if (errMsg.includes('manual linking') || errMsg.includes('identity linking')) {
          showAlert({ 
            title: "Identity Linking Restricted", 
            message: "Linking multiple login methods to a single account is currently disabled in your Supabase configuration. \n\nTo fix this:\n1. Go to Supabase Dashboard\n2. Authentication -> Settings\n3. Enable 'Allow manual linking'\n\nAlternatively, use 'Custom Social Links' below to add a link without OAuth.", 
            primaryButton: { text: "OK", onPress: () => {} } 
          });
          return;
        }
        showAlert({ 
          title: "Linking Failed", 
          message: e.message || `Failed to link ${provider} account.`, 
          primaryButton: { text: "OK", onPress: () => {} } 
        });
      }
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlink = async (identity: any) => {
    try {
      setLinkingProvider('unlinking');
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      await useAuthStore.getState().initialize();
    } catch (e: any) {
      console.error(e);
      showAlert({ 
        title: "Unlink Failed", 
        message: e.message || "Failed to unlink account.", 
        primaryButton: { text: "OK", onPress: () => {} } 
      });
    } finally {
      setLinkingProvider(null);
    }
  };

  const openManualLinkSheet = (type: string = 'website') => {
    setSelectedType(type);
    if (type !== 'website') {
      setNewName(type.charAt(0).toUpperCase() + type.slice(1));
    } else {
      setNewName('');
    }
    setNewUsername('');
    setNewUrl('');
    setManualSheetVisible(true);
  };

  const handleAddManualLink = async () => {
    if (!newName || !newUrl) return;
    
    try {
      const updatedLinks = [...manualLinks, { 
        name: newName, 
        url: newUrl, 
        type: selectedType,
        username: newUsername 
      }];
      const { error } = await supabase.auth.updateUser({
        data: { manual_links: updatedLinks }
      });
      
      if (error) throw error;
      
      setManualLinks(updatedLinks);
      setNewName('');
      setNewUsername('');
      setNewUrl('');
      setSelectedType('website');
      setManualSheetVisible(false);
      showAlert({ title: "Success", message: "Link added successfully.", primaryButton: { text: "OK", onPress: () => {} } });
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to add link.", primaryButton: { text: "OK", onPress: () => {} } });
    }
  };

  const handleRemoveManualLink = async (index: number) => {
    try {
      const updatedLinks = manualLinks.filter((_, i) => i !== index);
      const { error } = await supabase.auth.updateUser({
        data: { manual_links: updatedLinks }
      });
      
      if (error) throw error;
      setManualLinks(updatedLinks);
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to remove link.", primaryButton: { text: "OK", onPress: () => {} } });
    }
  };
  const { signOut } = useAuthStore();

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const handleSignOut = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out of groundwork.?",
      primaryButton: {
        text: "Sign Out",
        destructive: true,
        onPress: async () => {
          try {
            await signOut();
            router.replace('/welcome');
          } catch (error) {
            console.error(error);
          }
        }
      },
      secondaryButton: {
        text: "Cancel",
        onPress: () => {}
      }
    });
  };

  const handleDeletePress = () => {
    showAlert({
      title: "Delete Account?",
      message: "This will permanently delete your account and all associated data including tasks, habits, and notes. You cannot undo this action.",
      primaryButton: {
        text: "Delete Everything",
        destructive: true,
        onPress: async () => {
          try {
            // In a real app, call a delete account API
            await signOut();
            router.replace('/welcome');
          } catch (error) {
            console.error(error);
          }
        }
      },
      secondaryButton: {
        text: "Cancel",
        onPress: () => {}
      }
    });
  };

  return (
    <BackgroundGradient>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PERSONAL INFO */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>PERSONAL INFO</Text>
        <View style={styles.group}>
          <ActionRow
            Icon={User}
            title="Change Name"
            subtitle={session?.user?.user_metadata?.full_name || "Barok Mulatu"}
            onPress={() => router.push('/edit-profile' as any)}
          />
          <ActionRow
            Icon={User}
            title="Change Username"
            subtitle={`@${session?.user?.user_metadata?.username || session?.user?.email?.split('@')?.[0] || 'guest'}`}
            onPress={() => router.push('/edit-profile' as any)}
          />
          <ActionRow
            Icon={Mail}
            title="Change Email"
            subtitle={session?.user?.email || "barok@example.com"}
            onPress={() => router.push('/edit-profile' as any)}
          />
        </View>

        {/* SECURITY */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>SECURITY</Text>
        <View style={styles.group}>
          <ActionRow
            Icon={Lock}
            title="Change Password"
            onPress={() => router.push('/change-password' as any)}
          />
        </View>

        {/* SOCIAL LINKS */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>SOCIAL PROFILES</Text>
        <View style={styles.group}>
          <ActionRow
            Icon={Github}
            title="GitHub"
            subtitle={manualLinks.find(l => l.type === 'github')?.username ? `@${manualLinks.find(l => l.type === 'github')?.username}` : "Not connected"}
            onPress={() => openManualLinkSheet('github')}
            accentColor={manualLinks.find(l => l.type === 'github') ? '#34C759' : undefined}
          />
          <ActionRow
            Icon={Instagram}
            title="Instagram"
            subtitle={manualLinks.find(l => l.type === 'instagram')?.username ? `@${manualLinks.find(l => l.type === 'instagram')?.username}` : "Not connected"}
            onPress={() => openManualLinkSheet('instagram')}
            accentColor={manualLinks.find(l => l.type === 'instagram') ? '#34C759' : undefined}
          />
          <ActionRow
            Icon={Send}
            title="Telegram"
            subtitle={manualLinks.find(l => l.type === 'telegram')?.username ? `@${manualLinks.find(l => l.type === 'telegram')?.username}` : "Not connected"}
            onPress={() => openManualLinkSheet('telegram')}
            accentColor={manualLinks.find(l => l.type === 'telegram') ? '#34C759' : undefined}
          />
        </View>

        {/* CUSTOM LINKS */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>OTHER LINKS</Text>
        <View style={styles.group}>
          {manualLinks.filter(l => !['github', 'instagram', 'telegram'].includes(l.type || '')).length === 0 && (
            <Text style={[styles.emptyText, { color: theme.tertiaryText }]}>No other custom links added.</Text>
          )}
          {manualLinks.map((link, index) => {
            if (['github', 'instagram', 'telegram'].includes(link.type || '')) return null;
            return (
              <ActionRow
                key={index}
                Icon={Globe}
                title={link.name}
                subtitle={link.username ? `@${link.username}` : link.url}
                onPress={() => {
                  showAlert({
                    title: "Remove Link",
                    message: `Are you sure you want to remove ${link.name}?`,
                    primaryButton: { text: "Remove", destructive: true, onPress: () => handleRemoveManualLink(index) },
                    secondaryButton: { text: "Cancel", onPress: () => {} }
                  });
                }}
                accentColor="#34C759"
              />
            );
          })}

          <TouchableOpacity 
            style={[styles.addManualBtn, { borderColor: theme.cardBorder }]} 
            onPress={() => openManualLinkSheet('website')}
          >
            <Plus size={18} color={theme.accent} />
            <Text style={[styles.addManualText, { color: theme.accent }]}>Add Custom Social Link</Text>
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <Text style={[styles.sectionTitle, { color: '#FF3B30', marginTop: 32 }]}>DANGER ZONE</Text>
        <View style={styles.group}>
          <ActionRow
            Icon={Trash2}
            title="Delete Account"
            subtitle="Permanently delete all your data"
            onPress={handleDeletePress}
            accentColor="#FF3B30"
          />
        </View>

        {/* LOGOUT */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            style={[styles.logoutButton, {
              backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.06)'
            }]}
          >
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <NativeSheet visible={isManualSheetVisible} onClose={() => setManualSheetVisible(false)} height="auto">
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
          <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>
            {selectedType === 'website' ? 'Add Custom Link' : `Add ${newName}`}
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.secondaryText }]}>
            {selectedType === 'website' 
              ? 'Add a profile link with a custom name.' 
              : `Enter your ${newName} details to connect.`}
          </Text>
          
          {selectedType === 'website' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>SOCIAL MEDIA NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.primaryText, borderColor: theme.cardBorder }]}
                placeholder="e.g. Portfolio"
                placeholderTextColor={theme.tertiaryText}
                value={newName}
                onChangeText={setNewName}
              />
            </View>
          )}

          <View style={[styles.inputGroup, { marginTop: selectedType === 'website' ? 16 : 0 }]}>
            <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>USERNAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.primaryText, borderColor: theme.cardBorder }]}
              placeholder="@username"
              placeholderTextColor={theme.tertiaryText}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>DIRECT LINK (URL)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.primaryText, borderColor: theme.cardBorder }]}
              placeholder="https://..."
              placeholderTextColor={theme.tertiaryText}
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: theme.accent }]}
            onPress={handleAddManualLink}
          >
            <Text style={styles.saveBtnText}>Save Link</Text>
          </TouchableOpacity>
        </View>
      </NativeSheet>

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
  headerTitle: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  group: {
    marginBottom: 8,
  },
  logoutContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  sheetContent: {
    padding: 24,
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,59,48,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 12,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  addManualText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 12,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  saveBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    width: '100%',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
