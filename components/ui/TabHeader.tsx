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
    <View style={{ marginBottom: 24 }}>
      {showBack && (
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginLeft: -8 }}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: theme.accent, marginLeft: 4 }}>Back</Text>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 32, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 4 }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText, marginBottom: 8 }}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {onLayoutToggle && (
            <Pressable 
              onPress={onLayoutToggle}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentLight, alignItems: 'center', justifyContent: 'center' }}
            >
              {isGrid ? (
                <ListIcon size={20} color={theme.accent} />
              ) : (
                <LayoutGrid size={20} color={theme.accent} />
              )}
            </Pressable>
          )}

          {onMorePress && (
            <Pressable 
              onPress={onMorePress}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentLight, alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreHorizontal size={20} color={theme.accent} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
