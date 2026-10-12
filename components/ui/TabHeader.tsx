import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { ChevronLeft, LayoutGrid, AlignJustify as ListIcon, MoreHorizontal } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

interface TabHeaderProps {
  title: string;
  subtitle?: string;
  onMorePress?: () => void;
  showBack?: boolean;
  onLayoutToggle?: () => void;
  isGrid?: boolean;
}

export function TabHeader({ title, subtitle, onMorePress, showBack = true, onLayoutToggle, isGrid = false }: TabHeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: 20 }}>
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: -8, paddingVertical: 4, paddingHorizontal: 8 }}
        >
          <ChevronLeft size={22} color={theme.accent} />
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.accent, marginLeft: 2 }}>Back</Text>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            style={{ fontSize: 26, lineHeight: 32, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5, color: theme.primaryText, marginBottom: 4 }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText, marginBottom: 4 }}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {onLayoutToggle && (
            <Pressable 
              onPress={onLayoutToggle}
              accessibilityRole="button"
              accessibilityLabel={isGrid ? "Switch to list view" : "Switch to grid view"}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.accentLight, alignItems: 'center', justifyContent: 'center' }}
            >
              {isGrid ? (
                <ListIcon size={18} color={theme.accent} />
              ) : (
                <LayoutGrid size={18} color={theme.accent} />
              )}
            </Pressable>
          )}

          {onMorePress && (
            <Pressable 
              onPress={onMorePress}
              accessibilityRole="button"
              accessibilityLabel="More options"
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.accentLight, alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreHorizontal size={18} color={theme.accent} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
