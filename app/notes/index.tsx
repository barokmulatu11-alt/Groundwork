import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { KeyboardAwareSheet } from '@/components/ui/KeyboardAwareSheet';
import { NoteCard } from '@/components/notes/NoteCard';
import { useTheme } from '@/lib/ThemeContext';
import { getRandomGreeting } from '@/lib/GreetingUtils';
import { htmlToPlainText } from '@/lib/noteContent';
import { addXP, XP_VALUES } from '@/lib/connect/xpSystem';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  ArrowDown, ArrowUp, Atom, Binary, BookMarked, BookOpen, BrainCircuit,
  Calculator, Check, ChevronLeft, ChevronRight, FileText, FlaskConical,
  Folder, GraduationCap, LayoutGrid, List as ListIcon, Lock, Mic,
  PenLine, Plus, RotateCcw, Search, Sparkles, Star, X, Zap,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Home', 'Library', 'Study'] as const;
type TabType = (typeof TABS)[number];

const SPACE_META: Record<string, { icon: typeof FileText; color: string }> = {
  Physics: { icon: Atom, color: '#7C3AED' },
  Calculus: { icon: Calculator, color: '#EC4899' },
  Programming: { icon: Binary, color: '#059669' },
  Chemistry: { icon: FlaskConical, color: '#D97706' },
  General: { icon: FileText, color: '#3B82F6' },
  School: { icon: GraduationCap, color: '#6366F1' },
  Personal: { icon: Star, color: '#14B8A6' },
};

export default function NotesScreen() {
  const router = useRouter();
  const { notes, loadNotes, deleteNote, updateNote } = useStore();
  const { session } = useAuthStore();
  const { theme } = useTheme();
  const { notesLayout, setNotesLayout } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [notesLoading, setNotesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [fabOpen, setFabOpen] = useState(false);
  const [quickThoughtVisible, setQuickThoughtVisible] = useState(false);
  const [quickThoughtText, setQuickThoughtText] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string } | null>(null);
  const [revisionNoteId, setRevisionNoteId] = useState<string | null>(null);
  const [revealedSections, setRevealedSections] = useState<Set<number>>(new Set());

  const isGrid = notesLayout === 'grid';

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      setNotesLoading(true);
      loadNotes().finally(() => setNotesLoading(false));
    }, [session, loadNotes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, [loadNotes]);

  const allFolders = useMemo(() => {
    const used = new Set(notes.map(n => n.folder || 'General'));
    return ['All', ...Array.from(used).sort()];
  }, [notes]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notes
      .filter(n => {
        const matchQ = !q
          || n.title.toLowerCase().includes(q)
          || n.content.toLowerCase().includes(q)
          || (n.tags || []).some(t => t.toLowerCase().includes(q))
          || (n.folder || '').toLowerCase().includes(q);
        const matchFolder = selectedFolder === 'All' || (n.folder || 'General') === selectedFolder;
        return matchQ && matchFolder;
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [notes, searchQuery, selectedFolder, sortOrder]);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [notes]
  );

  const revisionQueue = useMemo(
    () => notes.filter(n => !n.is_locked && n.content.length > 40 && (n.revision_score ?? 0) < 85).slice(0, 5),
    [notes]
  );

  const spaces = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach(n => {
      const f = n.folder || 'General';
      map.set(f, (map.get(f) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const handleDeleteNote = (id: string, title: string) => {
    setNoteToDelete({ id, title });
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote(noteToDelete.id);
    } catch {
      Alert.alert('Delete failed', 'Could not delete this note.');
    } finally {
      setNoteToDelete(null);
      setDeleteDialogVisible(false);
    }
  };

  const handleQuickThought = async () => {
    if (!quickThoughtText.trim()) return;
    await useStore.getState().addNote({
      title: quickThoughtText.trim().slice(0, 48),
      content: quickThoughtText.trim(),
      folder: 'General',
      tags: ['quick'],
      priority: 'Low',
    });
    setQuickThoughtText('');
    setQuickThoughtVisible(false);
  };

  const handleRevisionAnswer = async (noteId: string, correct: boolean) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const delta = correct ? 10 : -5;
    const newScore = Math.max(0, Math.min(100, (note.revision_score || 0) + delta));
    await updateNote(noteId, {
      revision_score: newScore,
      last_reviewed_at: new Date().toISOString(),
    } as any);
    if (correct && session?.user?.id) {
      await addXP(session.user.id, XP_VALUES.REVISION_SESSION_COMPLETED, 'Revision session');
    }
    setRevisionNoteId(null);
    setRevealedSections(new Set());
  };

  if (!session) {
    return (
      <BackgroundGradient>
        <View style={[styles.centered, { paddingHorizontal: 24 }]}>
          <Lock size={40} color={theme.accent} style={{ marginBottom: 20 }} />
          <Text style={[styles.loginTitle, { color: theme.primaryText }]}>Sign in for Notes</Text>
          <Text style={[styles.loginSub, { color: theme.secondaryText }]}>
            Your notes sync securely when you are logged in.
          </Text>
          <AnimatedButton title="Sign In" onPress={() => router.push('/login' as any)} />
        </View>
      </BackgroundGradient>
    );
  }

  const revisionNote = revisionNoteId ? notes.find(n => n.id === revisionNoteId) : null;

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {TABS.map(tab => {
        const active = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => { setActiveTab(tab); if (tab !== 'Study') setRevisionNoteId(null); }}
            style={[styles.tab, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
          >
            <Text style={[styles.tabText, { color: active ? '#FFF' : theme.secondaryText }]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderHome = () => (
    <Animated.View entering={FadeIn.duration(250)}>
      <Text style={[styles.greeting, { color: theme.primaryText }]}>{getRandomGreeting()}</Text>
      <Text style={[styles.greetingSub, { color: theme.secondaryText }]}>
        {notes.length} notes · {spaces.length} spaces
      </Text>

      <View style={styles.captureRow}>
        {[
          { label: 'Write', icon: PenLine, color: theme.accent, onPress: () => router.push('/notes/new') },
          { label: 'Voice', icon: Mic, color: '#34C759', onPress: () => router.push('/notes/new?mode=voice' as any) },
          { label: 'Quick', icon: Zap, color: '#FF9500', onPress: () => setQuickThoughtVisible(true) },
        ].map(item => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={[styles.captureBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={[styles.captureIcon, { backgroundColor: `${item.color}18` }]}>
              <item.icon size={18} color={item.color} />
            </View>
            <Text style={[styles.captureLabel, { color: theme.primaryText }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {recentNotes.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.primaryText }]}>Pick up where you left off</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {recentNotes.map(note => {
              const meta = SPACE_META[note.folder || 'General'] || SPACE_META.General;
              const Icon = meta.icon;
              return (
                <Pressable
                  key={note.id}
                  onPress={() => router.push(`/notes/${note.id}`)}
                  style={[styles.recentCard, { backgroundColor: meta.color }]}
                >
                  <Icon size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.recentTitle} numberOfLines={2}>{note.title || 'Untitled'}</Text>
                  <Text style={styles.recentFolder}>{note.folder || 'General'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {revisionQueue.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.primaryText, marginTop: 20 }]}>Ready to review</Text>
          {revisionQueue.map(note => (
            <AnimatedCard
              key={note.id}
              style={{ padding: 14, marginBottom: 8 }}
              onPress={() => { setRevisionNoteId(note.id); setActiveTab('Study'); }}
            >
              <View style={styles.row}>
                <BrainCircuit size={18} color="#AF52DE" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]} numberOfLines={1}>{note.title || 'Untitled'}</Text>
                  <Text style={[styles.rowSub, { color: theme.secondaryText }]}>Score {note.revision_score ?? 0}%</Text>
                </View>
                <ChevronRight size={16} color={theme.secondaryText} />
              </View>
            </AnimatedCard>
          ))}
        </>
      )}

      {spaces.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.primaryText, marginTop: 20 }]}>Your spaces</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {spaces.map(([name, count]) => {
              const meta = SPACE_META[name] || SPACE_META.General;
              const Icon = meta.icon;
              return (
                <Pressable
                  key={name}
                  onPress={() => { setSelectedFolder(name); setActiveTab('Library'); }}
                  style={[styles.spaceChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={[styles.spaceIcon, { backgroundColor: `${meta.color}20` }]}>
                    <Icon size={16} color={meta.color} />
                  </View>
                  <Text style={[styles.spaceName, { color: theme.primaryText }]}>{name}</Text>
                  <Text style={[styles.spaceCount, { color: theme.secondaryText }]}>{count}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </Animated.View>
  );

  const renderLibrary = () => (
    <Animated.View entering={FadeIn.duration(250)}>
      <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Search size={18} color={theme.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: theme.primaryText }]}
          placeholder="Search notes, tags, spaces…"
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={18} color={theme.secondaryText} />
          </Pressable>
        )}
      </View>

      <View style={styles.libraryToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flex: 1 }}>
          {allFolders.map(folder => (
            <Pressable
              key={folder}
              onPress={() => setSelectedFolder(folder)}
              style={[
                styles.folderChip,
                {
                  backgroundColor: selectedFolder === folder ? theme.accent : theme.card,
                  borderColor: selectedFolder === folder ? theme.accent : theme.cardBorder,
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: selectedFolder === folder ? '#FFF' : theme.primaryText }}>
                {folder}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={() => setNotesLayout(isGrid ? 'list' : 'grid')} style={[styles.toolBtn, { backgroundColor: theme.card }]}>
          {isGrid ? <ListIcon size={16} color={theme.primaryText} /> : <LayoutGrid size={16} color={theme.primaryText} />}
        </Pressable>
        <Pressable
          onPress={() => setSortOrder(s => (s === 'newest' ? 'oldest' : s === 'oldest' ? 'az' : 'newest'))}
          style={[styles.toolBtn, { backgroundColor: theme.card }]}
        >
          {sortOrder === 'oldest' ? <ArrowUp size={16} color={theme.primaryText} /> : <ArrowDown size={16} color={theme.primaryText} />}
        </Pressable>
      </View>

      {notesLoading && notes.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ marginTop: 10, color: theme.secondaryText, fontFamily: 'Inter_500Medium' }}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No matches' : 'No notes yet'}
          subtitle={searchQuery ? 'Try another search or folder.' : 'Capture a lecture, idea, or revision sheet.'}
          actionLabel={searchQuery ? undefined : 'Create note'}
          onAction={searchQuery ? undefined : () => router.push('/notes/new')}
        />
      ) : (
        <View style={isGrid ? styles.gridWrap : undefined}>
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              variant={isGrid ? 'grid' : 'list'}
              onPress={() => router.push(`/notes/${note.id}`)}
              onLongPress={() => handleDeleteNote(note.id, note.title)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderStudy = () => {
    if (revisionNote) {
      const raw = htmlToPlainText(revisionNote.content || '');
      const parts = raw.split(/(\[\[[^\]]+\]\])/g);
      return (
        <Animated.View entering={FadeIn.duration(250)}>
          <Pressable
            onPress={() => { setRevisionNoteId(null); setRevealedSections(new Set()); }}
            style={[styles.backStudy, { backgroundColor: theme.card }]}
          >
            <ChevronLeft size={18} color={theme.primaryText} />
            <Text style={{ marginLeft: 6, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}>Back</Text>
          </Pressable>
          <Text style={[styles.studyTitle, { color: theme.primaryText }]}>{revisionNote.title || 'Untitled'}</Text>
          <View style={[styles.studyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={{ fontSize: 15, lineHeight: 26, fontFamily: 'Inter_500Medium', color: theme.primaryText }}>
              {parts.map((part, idx) => {
                const match = part.match(/^\[\[(.+)\]\]$/);
                if (!match) return <Text key={idx}>{part}</Text>;
                const revealed = revealedSections.has(idx);
                return (
                  <Text
                    key={idx}
                    onPress={() => {
                      const next = new Set(revealedSections);
                      if (revealed) next.delete(idx);
                      else next.add(idx);
                      setRevealedSections(next);
                    }}
                    style={{
                      backgroundColor: revealed ? theme.successLight : theme.accentLight,
                      color: revealed ? theme.success : theme.accent,
                      fontFamily: 'Inter_700Bold',
                    }}
                  >
                    {revealed ? match[1] : '  tap to reveal  '}
                  </Text>
                );
              })}
            </Text>
          </View>
          <View style={styles.revisionActions}>
            <Pressable onPress={() => handleRevisionAnswer(revisionNote.id, false)} style={[styles.revisionBtn, { backgroundColor: theme.dangerLight }]}>
              <RotateCcw size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontFamily: 'Inter_700Bold', marginLeft: 8 }}>Forgot</Text>
            </Pressable>
            <Pressable onPress={() => handleRevisionAnswer(revisionNote.id, true)} style={[styles.revisionBtn, { backgroundColor: theme.successLight }]}>
              <Check size={18} color={theme.success} />
              <Text style={{ color: theme.success, fontFamily: 'Inter_700Bold', marginLeft: 8 }}>Got it</Text>
            </Pressable>
          </View>
        </Animated.View>
      );
    }

    const studyNotes = notes.filter(n => !n.is_locked && n.content.length > 30);
    return (
      <Animated.View entering={FadeIn.duration(250)}>
        <View style={styles.studyHero}>
          <BrainCircuit size={28} color="#AF52DE" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.studyHeading, { color: theme.primaryText }]}>Active recall</Text>
            <Text style={[styles.studyHint, { color: theme.secondaryText }]}>
              Wrap key terms in [[double brackets]] while writing. They hide until you tap to reveal.
            </Text>
          </View>
        </View>
        {studyNotes.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nothing to study yet" subtitle="Add [[hidden terms]] inside a note to start." />
        ) : (
          studyNotes.map(note => (
            <AnimatedCard
              key={note.id}
              style={{ padding: 14, marginBottom: 8 }}
              onPress={() => { setRevisionNoteId(note.id); setRevealedSections(new Set()); }}
            >
              <View style={styles.row}>
                <BookMarked size={18} color={theme.accent} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]} numberOfLines={1}>{note.title || 'Untitled'}</Text>
                  <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{note.folder || 'General'} · {note.revision_score ?? 0}%</Text>
                </View>
                <ChevronRight size={16} color={theme.secondaryText} />
              </View>
            </AnimatedCard>
          ))
        )}
      </Animated.View>
    );
  };

  const fabActions = [
    { label: 'New note', icon: PenLine, color: theme.accent, onPress: () => { setFabOpen(false); router.push('/notes/new'); } },
    { label: 'Voice note', icon: Mic, color: '#34C759', onPress: () => { setFabOpen(false); router.push('/notes/new?mode=voice' as any); } },
    { label: 'Quick capture', icon: Zap, color: '#FF9500', onPress: () => { setFabOpen(false); setQuickThoughtVisible(true); } },
  ];

  return (
    <BackgroundGradient>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <ChevronLeft size={22} color={theme.accent} />
          <Text style={{ color: theme.accent, fontFamily: 'Inter_600SemiBold', marginLeft: 2 }}>Back</Text>
        </Pressable>

        <Text style={[styles.pageTitle, { color: theme.primaryText }]}>Notes</Text>
        {renderTabs()}

        {activeTab === 'Home' && renderHome()}
        {activeTab === 'Library' && renderLibrary()}
        {activeTab === 'Study' && renderStudy()}
      </ScrollView>

      <Pressable onPress={() => setFabOpen(true)} style={[styles.fab, { backgroundColor: theme.accent }]}>
        <Plus size={26} color="#FFF" />
      </Pressable>

      <Modal visible={fabOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setFabOpen(false)}>
          <View style={[styles.fabMenu, { bottom: insets.bottom + 100 }]}>
            {fabActions.map((action, i) => (
              <Animated.View key={action.label} entering={FadeInDown.delay(i * 50)}>
                <Pressable
                  onPress={action.onPress}
                  style={[styles.fabItem, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder }]}
                >
                  <action.icon size={18} color={action.color} />
                  <Text style={{ marginLeft: 10, fontFamily: 'Inter_700Bold', color: theme.primaryText }}>{action.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Pressable>
      </Modal>

      <KeyboardAwareSheet
        visible={quickThoughtVisible}
        onClose={() => setQuickThoughtVisible(false)}
        title="Quick capture"
      >
        <TextInput
          style={[styles.quickInput, { color: theme.primaryText, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          placeholder="Jot it down…"
          placeholderTextColor={theme.secondaryText}
          value={quickThoughtText}
          onChangeText={setQuickThoughtText}
          multiline
          autoFocus
        />
        <View style={styles.quickActions}>
          <Pressable onPress={() => setQuickThoughtVisible(false)} style={[styles.quickBtn, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_700Bold' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleQuickThought} style={[styles.quickBtn, { backgroundColor: theme.accent }]}>
            <Text style={{ color: '#FFF', fontFamily: 'Inter_700Bold' }}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAwareSheet>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete note"
        message={`Delete "${noteToDelete?.title || 'Untitled'}"?`}
        confirmText="Delete"
        confirmButtonColor={theme.danger}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginTitle: { fontSize: 26, fontFamily: 'Inter_800ExtraBold', marginBottom: 10, textAlign: 'center' },
  loginSub: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: -4 },
  pageTitle: { fontSize: 32, fontFamily: 'Inter_800ExtraBold', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(128,128,128,0.12)' },
  tabText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  greeting: { fontSize: 24, fontFamily: 'Inter_800ExtraBold', marginBottom: 4 },
  greetingSub: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 18 },
  captureRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  captureBtn: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  captureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  captureLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  recentCard: { width: 140, borderRadius: 18, padding: 14, minHeight: 110 },
  recentTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF', marginTop: 10, marginBottom: 4 },
  recentFolder: { fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.75)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  spaceChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 8 },
  spaceIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  spaceName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  spaceCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  libraryToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  folderChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  toolBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  studyHero: { flexDirection: 'row', marginBottom: 20 },
  studyHeading: { fontSize: 20, fontFamily: 'Inter_800ExtraBold' },
  studyHint: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20, marginTop: 4 },
  backStudy: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 14 },
  studyTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', marginBottom: 14 },
  studyCard: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 16 },
  revisionActions: { flexDirection: 'row', gap: 12 },
  revisionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  fab: { position: 'absolute', right: 20, bottom: 96, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  fabMenu: { position: 'absolute', right: 20, gap: 10 },
  fabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  quickModal: { marginHorizontal: 24, marginBottom: 120, borderRadius: 22, padding: 20, borderWidth: 1 },
  quickTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginBottom: 12 },
  quickInput: { minHeight: 100, borderRadius: 14, borderWidth: 1, padding: 14, textAlignVertical: 'top', fontSize: 15, fontFamily: 'Inter_500Medium' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
