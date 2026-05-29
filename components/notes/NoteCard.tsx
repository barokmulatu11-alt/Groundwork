import { AppText as Text } from '@/components/ui/AppText';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useTheme } from '@/lib/ThemeContext';
import { htmlToPlainText } from '@/lib/noteContent';
import type { Note } from '@/lib/db';
import { Folder, Image as ImageIcon, Lock, Mic, Pin } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const FOLDER_COLORS: Record<string, string> = {
  Physics: '#7C3AED',
  Calculus: '#EC4899',
  Programming: '#059669',
  Chemistry: '#D97706',
  Biology: '#10B981',
  General: '#3B82F6',
  School: '#6366F1',
  Personal: '#14B8A6',
  Exams: '#EF4444',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function plainPreview(content: string): string {
  const raw = htmlToPlainText(content || '');
  return raw.replace(/\[\[([^\]]+)\]\]/g, '▢ $1').trim();
}

type Props = {
  note: Note;
  variant?: 'list' | 'grid';
  onPress: () => void;
  onLongPress?: () => void;
};

export function NoteCard({ note, variant = 'list', onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const accent = FOLDER_COLORS[note.folder || 'General'] || theme.accent;
  const preview = plainPreview(note.content);

  return (
    <AnimatedCard
      style={variant === 'grid' ? styles.gridCard : styles.listCard}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.primaryText }]} numberOfLines={variant === 'grid' ? 2 : 1}>
            {note.title || 'Untitled'}
          </Text>
          <View style={styles.badges}>
            {note.is_pinned ? <Pin size={13} color={theme.accent} /> : null}
            {note.is_locked ? <Lock size={13} color={theme.secondaryText} /> : null}
          </View>
        </View>

        {note.is_locked ? (
          <Text style={[styles.preview, { color: theme.secondaryText, fontStyle: 'italic' }]}>Locked note</Text>
        ) : (
          <Text style={[styles.preview, { color: theme.secondaryText }]} numberOfLines={variant === 'grid' ? 3 : 2}>
            {preview || 'Empty note — tap to write'}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={[styles.meta, { color: theme.tertiaryText }]}>{timeAgo(note.updated_at)}</Text>
          <View style={styles.footerRight}>
            {note.folder && note.folder !== 'General' ? (
              <View style={[styles.folderChip, { backgroundColor: `${accent}18` }]}>
                <Folder size={10} color={accent} />
                <Text style={[styles.folderText, { color: accent }]}>{note.folder}</Text>
              </View>
            ) : null}
            {(note.image_uris?.length ?? 0) > 0 ? <ImageIcon size={12} color={theme.tertiaryText} /> : null}
            {(note.audio_uris?.length ?? 0) > 0 ? <Mic size={12} color={theme.tertiaryText} /> : null}
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  listCard: { padding: 0, marginBottom: 10 },
  gridCard: { width: '48%', padding: 0, marginBottom: 12 },
  accentBar: { height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  body: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  title: { flex: 1, fontSize: 16, fontFamily: 'Inter_700Bold' },
  badges: { flexDirection: 'row', gap: 6, paddingTop: 2 },
  preview: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  meta: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  folderText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
});
