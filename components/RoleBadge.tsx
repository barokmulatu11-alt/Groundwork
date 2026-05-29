import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppText as Text } from './ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { Crown, Shield, Star, Info } from 'lucide-react-native';


interface RoleBadgeProps {
  role?: string;
  isPro?: boolean;
}

const ROLE_CONFIG: Record<string, any> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: '#FFCC00',
    description: 'You are the absolute owner of this Groundwork instance. You have full access to all data, management tools, and system settings.',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: '#007AFF',
    description: 'Administrator privileges enabled. You can manage users, moderate content, and control feature flags.',
  },
  moderator: {
    label: 'Moderator',
    icon: Shield,
    color: '#AF52DE',
    description: 'Moderator access enabled. You can review reports and manage user statuses to keep the community safe.',
  },
  pro: {
    label: 'Pro',
    icon: Star,
    color: '#34C759',
    description: 'Premium subscription active. You have access to all high-performance tools, themes, and unlimited syncing.',
  },
};

export function RoleBadge({ role = 'user', isPro = false }: RoleBadgeProps) {
  const { theme, showAlert } = useTheme();

  // If user is a special role, show that. Otherwise show Pro if they have it.
  const configKey = role !== 'user' ? role.toLowerCase() : isPro ? 'pro' : null;
  
  if (!configKey || !ROLE_CONFIG[configKey]) return null;
  
  const config = ROLE_CONFIG[configKey];
  const Icon = config.icon;

  const handlePress = () => {
    showAlert({
      title: config.label + ' Status',
      message: config.description,
      primaryButton: { text: 'Got it', onPress: () => {} }
    });
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      activeOpacity={0.7}
      style={[
        styles.badge, 
        { 
          backgroundColor: config.color + '15', 
          borderColor: config.color + '30' 
        }
      ]}
    >
      <Icon size={10} color={config.color} strokeWidth={3} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
