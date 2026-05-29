import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { SocialLink } from '@/hooks/connect/useProfile';
import { getPlatformPillStyle } from '@/lib/socialPlatforms';
import { FontAwesome5 } from '@expo/vector-icons';

interface Props {
  link: SocialLink;
  onDelete?: () => void;
}

export const SocialLinkButton: React.FC<Props> = ({ link, onDelete }) => {
  const { isDark, showAlert } = useTheme();
  const { def, iconColor, labelColor, backgroundColor, borderColor } = getPlatformPillStyle(
    link.platform,
    isDark
  );

  const openLink = async () => {
    const { Linking } = await import('react-native');
    try {
      let u = link.url.trim();
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'https://' + u;
      }
      const canOpen = await Linking.canOpenURL(u);
      if (canOpen) {
        await Linking.openURL(u);
      } else {
        showAlert({
          title: 'Cannot open URL',
          message: `Failed to open ${link.url}`,
          primaryButton: { text: 'OK', onPress: () => {} },
        });
      }
    } catch {
      showAlert({
        title: 'Error',
        message: `Could not open ${link.url}`,
        primaryButton: { text: 'OK', onPress: () => {} },
      });
    }
  };

  const confirmDelete = () => {
    showAlert({
      title: 'Delete link',
      message: `Remove your ${def.label} link?`,
      primaryButton: {
        text: 'Delete',
        destructive: true,
        onPress: () => onDelete?.(),
      },
      secondaryButton: { text: 'Cancel', onPress: () => {} },
    });
  };

  const handlePress = () => {
    if (onDelete) {
      showAlert({
        title: def.label,
        message: 'Open this link or remove it from your profile.',
        primaryButton: { text: 'Open', onPress: openLink },
        secondaryButton: { text: 'Delete', onPress: confirmDelete },
      });
    } else {
      openLink();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor, borderColor }]}
      activeOpacity={0.75}
      onPress={handlePress}
      onLongPress={onDelete ? confirmDelete : undefined}
    >
      <FontAwesome5 name={def.icon} size={15} color={iconColor} brand />
      <Text style={[styles.platformText, { color: labelColor }]}>{def.label}</Text>
      {onDelete ? (
        <FontAwesome5 name="times-circle" size={14} color={iconColor} style={{ opacity: 0.85 }} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
    gap: 8,
  },
  platformText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
