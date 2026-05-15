import { AppText as Text } from '@/components/ui/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  ChevronLeft, 
  Download, 
  FileText, 
  Trash2,
  FileQuestion
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface DownloadedItem {
  id: string;
  title: string;
  size: string;
  date: string;
  type: 'pdf' | 'doc' | 'other';
}

export default function DownloadsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Mock state for downloads
  const [downloads, setDownloads] = useState<DownloadedItem[]>([]);

  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeInUp.duration(600)} 
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
        <FileQuestion size={48} color={theme.tertiaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No Downloads Yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
        You haven't downloaded anything.
      </Text>
    </Animated.View>
  );

  const renderDownloadItem = ({ item, index }: { item: DownloadedItem; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100)}>
      <AnimatedCard style={[styles.downloadCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.fileIcon, { backgroundColor: theme.accentLight }]}>
          <FileText size={20} color={theme.accent} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: theme.primaryText }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.fileMeta, { color: theme.secondaryText }]}>
            {item.size} • {item.date}
          </Text>
        </View>
        <Pressable 
          style={styles.deleteBtn}
          onPress={() => setDownloads(prev => prev.filter(d => d.id !== item.id))}
        >
          <Trash2 size={18} color={theme.danger} />
        </Pressable>
      </AnimatedCard>
    </Animated.View>
  );

  return (
    <BackgroundGradient>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable 
          onPress={() => router.back()} 
          style={[styles.iconBoxStandard, { backgroundColor: theme.accentLight }]}
        >
          <ChevronLeft size={20} color={theme.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Downloads</Text>
      </View>

      <View style={styles.content}>
        {downloads.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={downloads}
            renderItem={renderDownloadItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    top: 28,
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginRight: 40,
  },
  iconBoxStandard: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  deleteBtn: {
    padding: 10,
  },
});
