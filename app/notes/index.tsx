import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NativeSheet } from '@/components/ui/NativeSheet';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import {
    ArrowDown, ArrowUp,
    ChevronRight,
    Folder,
    Image as ImageIcon,
    Lock,
    Mic, Pencil,
    Pin,
    Plus,
    Search, Trash2,
    X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOLDERS = ['All', 'General', 'School', 'Personal', 'Exams', 'Other'];

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

export default function NotesScreen() {
  const router = useRouter();
  const { tasks, habits, notes, focusSessions, draftNote, loadAllTasks, loadHabits, loadNotes, loadFocusSessions, deleteNote, setDraftNote } = useStore();
  const { session } = useAuthStore();
  const { theme, isDark } = useTheme();
  const { notesLayout, setNotesLayout } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(true);

  const isGrid = notesLayout === 'grid';

  const allTags = useMemo(() => 
    Array.from(new Set(notes.flatMap(n => n.tags || []))).sort(), 
    [notes]
  );

  const allFolders = useMemo(() => {
    const used = new Set(notes.map(n => n.folder || 'General'));
    let folders = FOLDERS.filter(f => f === 'All' || used.has(f));
    
    // Drafts should be visible if a draft exists OR if it's currently selected
    if (draftNote || selectedFolder === 'Drafts') {
      if (!folders.includes('Drafts')) folders.push('Drafts');
    }
    
    return folders;
  }, [notes, draftNote, selectedFolder]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const results = notes.filter(note => {
      const matchesSearch = !q
        || note.title.toLowerCase().includes(q)
        || note.content.toLowerCase().includes(q)
        || (note.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesFolder = selectedFolder === 'All' || (note.folder || 'General') === selectedFolder;
      const matchesTag = !selectedTag || (note.tags || []).includes(selectedTag);
      return matchesSearch && matchesFolder && matchesTag;
    });

    if (selectedFolder === 'Drafts' && draftNote) {
      const title = draftNote.title || '';
      const content = draftNote.content || '';
      const matchesSearch = !q
        || title.toLowerCase().includes(q)
        || content.toLowerCase().includes(q);
      if (matchesSearch) {
        // Mock a note object for the draft
        results.push({
          id: 'DRAFT',
          title: draftNote.title || 'Untitled Draft',
          content: draftNote.content,
          updated_at: new Date().toISOString(),
          folder: 'Drafts',
          is_pinned: false,
          is_locked: false,
          tags: [],
          image_uris: [],
          audio_uris: [],
          drawing_uris: []
        } as any);
      }
    }

    return results.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [notes, searchQuery, selectedFolder, selectedTag, sortOrder, draftNote]);

  const handleDeleteNote = (id: string, title: string) => {
    setNoteToDelete({ id, title });
    setDeleteDialogVisible(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      if (noteToDelete.id === 'DRAFT') {
        setDraftNote(null);
      } else if (noteToDelete.id === 'ALL') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to delete ALL notes',
            fallbackLabel: 'Use Passcode' });
          if (!result.success) {
            Alert.alert('Authentication Failed', 'You must authenticate to perform this action.');
            setDeleteDialogVisible(false);
            return;
          }
        }
        for (const note of notes) await deleteNote(note.id);
      } else {
        await deleteNote(noteToDelete.id);
      }
    } catch (e) {
      console.error("[Notes] Delete failed:", e);
      Alert.alert("Delete Failed", "Something went wrong while deleting the note.");
    } finally {
      setNoteToDelete(null);
      setDeleteDialogVisible(false);
    }
  };

  if (!session) {
    return (
      <BackgroundGradient>
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.iconBox, { width: 80, height: 80, borderRadius: 24, backgroundColor: theme.accentLight, marginBottom: 24 }]}>
            <Lock size={40} color={theme.accent} />
          </View>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 12, textAlign: 'center' }}>Login Required</Text>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_500Medium', color: theme.secondaryText, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
            Sign in to create and sync your personal notes.
          </Text>
          <AnimatedButton title="Sign In or Sign Up" onPress={() => router.push('/login' as any)} />
          <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: theme.accent }}>Go Back</Text>
          </Pressable>
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>

      
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ 
            paddingHorizontal: 24, 
            paddingBottom: 120,
            paddingTop: insets.top + 24
          }}
          keyboardShouldPersistTaps="handled"
        >
          <TabHeader 
            title="Notes"
            subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
            onLayoutToggle={() => setNotesLayout(isGrid ? 'list' : 'grid')}
            isGrid={isGrid}
            onMorePress={() => setOptionsVisible(true)}
          />
  
          {/* Drafts Banner */}
          {draftNote && showDraftBanner && (
            <AnimatedCard 
              onPress={() => router.push('/notes/new')} 
              style={{ marginBottom: 24, padding: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconBox, { backgroundColor: theme.accentLight, marginRight: 12 }]}>
                  <Pencil size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: theme.primaryText }}>Continue writing...</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }} numberOfLines={1}>
                    Draft: {draftNote.title || 'Untitled Note'}
                  </Text>
                </View>
                <Pressable onPress={(e) => { e.stopPropagation(); setShowDraftBanner(false); }} style={[styles.iconBox, { width: 32, height: 32, borderRadius: 10 }]}>
                  <X size={18} color={theme.secondaryText} />
                </Pressable>
              </View>
            </AnimatedCard>
          )}
  
          {/* Search Bar */}
          <View style={{ 
            flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, 
            borderRadius: 16, paddingHorizontal: 16, height: 48, marginBottom: 16
          }}>
            <Search size={18} color={theme.secondaryText} />
            <TextInput
              style={{ flex: 1, marginLeft: 10, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}
              placeholder="Search notes, tags..."
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
  
          {/* Folder Pills */}
          {allFolders.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
              {allFolders.map(folder => (
                <Pressable
                  key={folder}
                  onPress={() => setSelectedFolder(folder)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: selectedFolder === folder ? theme.primaryText : theme.card }}
                >
                  {folder !== 'All' && <Folder size={12} color={selectedFolder === folder ? theme.background : theme.secondaryText} />}
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: selectedFolder === folder ? theme.background : theme.primaryText }}>
                    {folder}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
  
          {/* Tag Pills */}
          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
              <Pressable
                onPress={() => setSelectedTag(null)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                  backgroundColor: selectedTag === null ? theme.card : theme.card }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: selectedTag === null ? theme.accent : theme.secondaryText }}>
                  All tags
                </Text>
              </Pressable>
              {allTags.map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                    backgroundColor: selectedTag === tag ? theme.card : theme.card }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: selectedTag === tag ? theme.accent : theme.secondaryText }}>
                    #{tag}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
  
          {/* Notes List */}
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, fontFamily: 'Inter_700Bold', marginBottom: 12 }}></Text>
              <Text style={{ fontSize: 17, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 6 }}>
                {searchQuery ? 'No results' : 'No notes yet'}
              </Text>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: theme.secondaryText, textAlign: 'center' }}>
                {searchQuery ? `No notes match "${searchQuery}"` : 'Tap the + button to create your first note.'}
              </Text>
            </View>
          ) : (
            <View style={isGrid ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : { gap: 12 }}>
              {filtered.map(note => (
                <AnimatedCard
                  key={note.id}
                  style={isGrid ? { width: '48%', padding: 0, marginBottom: 16 } : { padding: 0, marginBottom: 0 }}
                  onPress={() => router.push(`/notes/${note.id}`)}
                  onLongPress={() => handleDeleteNote(note.id, note.title)}
                >
                  <View style={{ padding: 18, height: isGrid ? 180 : 'auto', justifyContent: 'space-between' }}>
                    <View>
                      {/* Title row */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: theme.primaryText }} numberOfLines={isGrid ? 2 : 1}>
                            {note.title || 'Untitled Note'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          {note.is_pinned && <Pin size={14} color={theme.primaryText} />}
                          {note.is_locked && <Lock size={14} color={theme.secondaryText} />}
                          <Pressable 
                            onPress={(e) => { 
                              e.stopPropagation(); 
                              handleDeleteNote(note.id, note.title); 
                            }}
                            hitSlop={15}
                            style={{ padding: 8, marginLeft: 4 }}
                          >
                            <Trash2 size={20} color={theme.danger} />
                          </Pressable>
                        </View>
                      </View>
  
                      {/* Preview */}
                      {note.is_locked ? (
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText, fontStyle: 'italic' }}>
                          Locked note
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: theme.secondaryText, lineHeight: 20 }} numberOfLines={isGrid ? 3 : 2}>
                          {note.content.replace(/<[^>]+>/g, '').trim() || 'No content...'}
                        </Text>
                      )}
                    </View>
  
                    {/* Footer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }}>
                        {new Date(note.updated_at).toLocaleDateString()}
                      </Text>
                      {(note.image_uris?.length > 0 || note.audio_uris?.length > 0 || note.drawing_uris?.length > 0) && !isGrid && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {note.image_uris?.length > 0 && <ImageIcon size={12} color={theme.primaryText} />}
                          {note.audio_uris?.length > 0 && <Mic size={12} color={theme.primaryText} />}
                          {note.drawing_uris?.length > 0 && <Pencil size={12} color={theme.primaryText} />}
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          )}
        </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/notes/new')}
        style={[styles.fab, { backgroundColor: theme.accent, }]}
      >
        <Plus size={28} color="white" />
      </Pressable>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title={noteToDelete?.id === 'ALL' ? 'Delete All Notes' : 'Delete Note'}
        message={noteToDelete?.id === 'ALL'
          ? 'Are you sure you want to delete ALL notes? This cannot be undone.'
          : `Delete "${noteToDelete?.title || 'Untitled Note'}"?`}
        confirmText="Delete"
        confirmButtonColor={theme.danger}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDeleteNote}
      />

      {/* Options Sheet */}
      <NativeSheet visible={isOptionsVisible} onClose={() => setOptionsVisible(false)} height="40%">
        <View style={{ flex: 1, padding: 24, backgroundColor: theme.background }}>
          <Text style={{ fontSize: 20, fontFamily: 'System', fontWeight: '700', color: theme.primaryText, marginBottom: 20 }}>Options</Text>

          {[
            { label: `Sort: ${sortOrder === 'newest' ? 'Newest first' : sortOrder === 'oldest' ? 'Oldest first' : 'A → Z'}`, icon: sortOrder === 'oldest' ? ArrowUp : ArrowDown, onPress: () => { setSortOrder(s => s === 'newest' ? 'oldest' : s === 'oldest' ? 'az' : 'newest'); setOptionsVisible(false); } },
          ].map((item, i) => (
            <Pressable 
              key={i} 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}
              onPress={item.onPress}
            >
              <item.icon size={20} color={theme.primaryText} style={{ marginRight: 16 }} />
              <Text style={{ fontSize: 16, fontFamily: 'System', fontWeight: '600', color: theme.primaryText, flex: 1 }}>{item.label}</Text>
              <ChevronRight size={18} color={theme.secondaryText} />
            </Pressable>
          ))}

          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
            onPress={() => { setOptionsVisible(false); handleDeleteNote('ALL', 'ALL'); }}
          >
            <View style={[styles.iconBox, { backgroundColor: `${theme.danger}15`, marginRight: 16 }]}>
              <Trash2 size={20} color={theme.danger} />
            </View>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: theme.danger }}>Delete All Notes</Text>
          </Pressable>
        </View>
      </NativeSheet>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute', bottom: 100, right: 24,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
      
    
  }
});
