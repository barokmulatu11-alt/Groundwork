import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { Edit2, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { AnimatedCard } from './AnimatedCard';

interface ProfileHeaderProps {
  name: string;
  username: string;
  email: string;
  avatarUri?: string;
  isPro?: boolean;
  isAdmin?: boolean;
  onEditPress?: () => void;
}

export function ProfileHeader({ 
  name, 
  username, 
  email, 
  avatarUri,
  isPro = false,
  isAdmin = false,
  onEditPress 
}: ProfileHeaderProps) {
  const { theme, isDark, showAlert } = useTheme();
  
  const handleTagPress = (type: 'admin' | 'pro' | 'member') => {
    let title = "";
    let message = "";
    
    if (type === 'admin') {
      title = "Admin Account";
      message = "You are an administrator of groundwork. You have access to platform settings and early developer features.";
    } else if (type === 'pro') {
      title = "Groundwork Pro";
      message = "You are a Pro member! You have unlocked all premium productivity tools, custom themes, and unlimited sync.";
    } else {
      title = "Groundwork Member";
      message = "You are a valued member of the groundwork. community. Enjoy our core productivity features!";
    }

    showAlert({
      title,
      message,
      primaryButton: { text: "Cool", onPress: () => {} }
    });
  };

  return (
    <AnimatedCard style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { borderColor: theme.cardBorder }]}>
            {avatarUri ? (
              <Image 
                source={{ uri: avatarUri }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.cardBorder }]}>
                <Text style={{ color: theme.secondaryText, fontSize: 24, fontFamily: 'Inter_700Bold' }}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.details}>
            <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={2}>{name}</Text>
            <Text style={[styles.username, { color: theme.secondaryText }]} numberOfLines={1}>{username}</Text>
            <Text style={[styles.email, { color: theme.tertiaryText }]} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={onEditPress}
          activeOpacity={0.7}
          style={[styles.editIconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
        >
          <Edit2 size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
      
      <View style={styles.statContainer}>
        {isAdmin && (
          <TouchableOpacity 
            onPress={() => handleTagPress('admin')}
            style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)' }]}
          >
            <CheckCircle2 size={12} color="#34C759" />
            <Text style={[styles.statText, { color: '#34C759' }]}>Admin</Text>
          </TouchableOpacity>
        )}

        {isPro && !isAdmin && (
          <TouchableOpacity 
            onPress={() => handleTagPress('pro')}
            style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)' }]}
          >
            <CheckCircle2 size={12} color="#34C759" />
            <Text style={[styles.statText, { color: '#34C759' }]}>Pro Member</Text>
          </TouchableOpacity>
        )}

        {!isAdmin && !isPro && (
          <TouchableOpacity 
            onPress={() => handleTagPress('member')}
            style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)' }]}
          >
            <CheckCircle2 size={12} color={theme.accent} />
            <Text style={[styles.statText, { color: theme.accent }]}>Member</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    marginBottom: 24,
    borderRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    padding: 3,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  username: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.8,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    opacity: 0.6,
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.3,
    marginVertical: 20,
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
