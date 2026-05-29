import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { DesignTokens } from '@/constants/designTokens';
import { Note } from '@/lib/db';
import * as Icons from 'lucide-react-native';

interface Props {
  notes: Note[];
  onNotePress: (noteId: string) => void;
}

export const NotesPortfolio: React.FC<Props> = ({ notes, onNotePress }) => {
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  // Filter notes into showcases
  const pinnedNotes = notes.filter(n => n.is_pinned).slice(0, 4);
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);
  
  // Best notes (based on study hours or high revision score)
  const bestNotes = notes
    .filter(n => n.revision_score >= 80 || n.study_hours >= 2.0)
    .slice(0, 2);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return 'Recent';
    }
  };

  const parseTags = (note: Note): string[] => {
    if (Array.isArray(note.tags)) return note.tags;
    try {
      return JSON.parse(note.tags as any) || [];
    } catch (_) {
      return [];
    }
  };

  const renderNoteCard = (note: Note, index: number) => {
    const tags = parseTags(note);
    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: cardBorder }]}
        onPress={() => onNotePress(note.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={[styles.noteTitle, { color: theme.primaryText }]} numberOfLines={1}>
            {note.title || 'Untitled Note'}
          </Text>
          {note.is_pinned && <Icons.Pin size={10} color={theme.accent} />}
        </View>
        
        <View style={styles.subjectRow}>
          <Icons.FolderOpen size={10} color={theme.secondaryText} style={{ marginRight: 4 }} />
          <Text style={[styles.subjectText, { color: theme.secondaryText }]} numberOfLines={1}>
            {note.folder || 'General'}
          </Text>
        </View>

        {tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 2).map((t, idx) => (
              <View key={idx} style={[styles.tagBadge, { backgroundColor: theme.accent + '10' }]}>
                <Text style={[styles.tagBadgeText, { color: theme.accent }]}>#{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: theme.secondaryText }]}>
            {formatDate(note.updated_at)}
          </Text>
          {note.revision_score > 0 ? (
            <View style={styles.scoreBadge}>
              <Icons.Award size={9} color="#34C759" style={{ marginRight: 2 }} />
              <Text style={styles.scoreText}>{note.revision_score}%</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Pinned Showcase Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icons.Pin size={15} color={theme.accent} />
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Pinned Notes Showcase</Text>
        </View>
        {pinnedNotes.length > 0 ? (
          <View style={styles.grid}>
            {pinnedNotes.map((note, index) => (
              <View key={note.id} style={styles.gridCol}>
                {renderNoteCard(note, index)}
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            No notes pinned to portfolio yet. Double-tap a note inside spaces to pin it.
          </Text>
        )}
      </View>

      {/* Best Work Section */}
      {bestNotes.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icons.Sparkles size={14} color="#FFD700" />
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Best Work Highlights</Text>
          </View>
          <View style={styles.bestContainer}>
            {bestNotes.map(note => {
              const tags = parseTags(note);
              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.bestRow, { borderColor: cardBorder }]}
                  onPress={() => onNotePress(note.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bestLeft}>
                    <View style={styles.trophyWrapper}>
                      <Icons.Trophy size={16} color="#FFD700" />
                    </View>
                    <View>
                      <Text style={[styles.bestNoteTitle, { color: theme.primaryText }]}>{note.title}</Text>
                      <Text style={[styles.bestNoteMeta, { color: theme.secondaryText }]}>
                        {note.folder} • {note.study_hours} hrs studied
                      </Text>
                    </View>
                  </View>
                  {note.revision_score > 0 ? (
                    <View style={[styles.bestScoreBadge, { backgroundColor: '#34C759' }]}>
                      <Text style={styles.bestScoreText}>{note.revision_score}% Mastery</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Recently Edited Notes List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icons.Clock size={14} color={theme.secondaryText} />
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recently Edited</Text>
        </View>
        {recentNotes.length > 0 ? (
          <View style={styles.recentList}>
            {recentNotes.map((note, idx) => (
              <TouchableOpacity
                key={note.id}
                style={[
                  styles.recentRow,
                  { borderBottomColor: idx === recentNotes.length - 1 ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={() => onNotePress(note.id)}
                activeOpacity={0.7}
              >
                <View style={styles.recentLeft}>
                  <Icons.FileText size={16} color={theme.secondaryText} style={{ marginRight: 10 }} />
                  <Text style={[styles.recentTitle, { color: theme.primaryText }]} numberOfLines={1}>
                    {note.title}
                  </Text>
                </View>
                <Text style={[styles.recentDate, { color: theme.secondaryText }]}>
                  {formatDate(note.updated_at)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            No notes created yet.
          </Text>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...DesignTokens.shadows.soft,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: DesignTokens.fonts.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridCol: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  noteCard: {
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    padding: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
    flex: 1,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectText: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.regular,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 8,
    fontFamily: DesignTokens.fonts.semiBold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.medium,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C7591A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  scoreText: {
    fontSize: 8,
    fontFamily: DesignTokens.fonts.bold,
    color: '#34C759',
  },
  emptyText: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.regular,
    textAlign: 'center',
    paddingVertical: 10,
    lineHeight: 16,
    opacity: 0.8,
  },
  bestContainer: {
    gap: 8,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 10,
  },
  bestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bestNoteTitle: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
  },
  bestNoteMeta: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
    marginTop: 1,
  },
  bestScoreBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestScoreText: {
    color: 'white',
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
  },
  recentList: {
    borderRadius: DesignTokens.borderRadius.md,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  recentTitle: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
    flex: 1,
  },
  recentDate: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
  },
});
