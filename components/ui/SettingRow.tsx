import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export interface SettingRowProps {
  icon?: any;
  title: string;
  subtitle?: string;
  theme?: any;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
  badge?: string;
}

export function SettingRow({
  icon: Icon,
  title,
  subtitle,
  theme: customTheme,
  onPress,
  destructive = false,
  rightElement,
  children,
  testID,
  badge,
}: SettingRowProps) {
  const { theme: contextTheme } = useTheme();
  const theme = customTheme || contextTheme;

  const defaultTestId =
    testID || `settings-row-${String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  const content = (
    <View style={styles.rowContent}>
      {Icon && (
        <View style={styles.iconBox}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
      )}
      <View style={styles.infoBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.rowTitle,
              { color: destructive ? theme.danger : theme.primaryText },
            ]}
          >
            {title}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.badgeText, { color: theme.accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children || rightElement || (
        <ChevronRight size={18} color={theme.tertiaryText} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={defaultTestId}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.rowWrapper}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={defaultTestId} style={styles.rowWrapper}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrapper: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBox: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
