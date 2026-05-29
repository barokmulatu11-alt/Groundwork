import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { ImageViewer } from '@/components/ImageViewer';
import { AlertType, CustomAlert } from '@/components/ui/CustomAlert';
import { KeyboardAwareSheet } from '@/components/ui/KeyboardAwareSheet';
import { VoiceNoteItem } from '@/components/VoiceNoteItem';
import { VoiceRecordingUI } from '@/components/VoiceRecordingUI';
import { useTheme } from '@/lib/ThemeContext';
import { normalizeNoteContent } from '@/lib/noteContent';
import { useStore } from '@/store/useStore';
import { requestIntelligentPermission, openSettings } from '@/lib/permissions';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bold, Camera, ChevronLeft, Image as ImageIcon, Italic, Link, List, ListOrdered,
  Lock, Mic, MoreHorizontal, PenTool, Pin, Redo, Square, Strikethrough, Trash2,
  Underline, Undo, Unlock, X, Plus, Calculator,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#34C759',
  Medium: '#007AFF',
  High: '#FF9500',
  Critical: '#FF3B30',
};

const FOLDERS = ['General', 'School', 'Personal', 'Physics', 'Calculus', 'Programming'];

type DraftPayload = {
  title: string;
  content: string;
  is_locked: boolean;
  is_pinned: boolean;
  tags: string[];
  image_uris: string[];
  audio_uris: string[];
  drawing_uris: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  folder: string;
  flashcards: { question: string; answer: string }[];
  formulas: { name: string; latexOrText: string; description: string; isPinned?: boolean }[];
};

function draftSignature(d: DraftPayload | null): string {
  return JSON.stringify(d);
}

export default function NoteEditorScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const router = useRouter();
  const { notes, addNote, updateNote, deleteNote, setDraftNote } = useStore();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isNew = id === 'new';
  const existingNote = notes.find(n => n.id === id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [audioUris, setAudioUris] = useState<string[]>([]);
  const [drawingUris, setDrawingUris] = useState<string[]>([]);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [folder, setFolder] = useState('General');
  const [flashcards, setFlashcards] = useState<{ question: string; answer: string }[]>([]);
  const [formulas, setFormulas] = useState<{ name: string; latexOrText: string; description: string; isPinned?: boolean }[]>([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formulaModalVisible, setFormulaModalVisible] = useState(false);
  const [formulaName, setFormulaName] = useState('');
  const [formulaEq, setFormulaEq] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadedIdRef = useRef<string | null>(null);
  const lastDraftSigRef = useRef<string>('');
  const startTimeRef = useRef(Date.now());
  const autoStartRecorded = useRef(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string; message: string; type: AlertType;
    onConfirm?: () => void; onCancel?: () => void;
    showCancel?: boolean; cancelText?: string; confirmText?: string;
  }>({ title: '', message: '', type: 'info' });
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const hydrate = useCallback((data: Partial<DraftPayload>) => {
    setTitle(data.title || '');
    // Some older notes may have been saved as HTML (e.g. from a rich text editor).
    // We edit in a plain TextInput, so normalize to readable plain text.
    setContent(normalizeNoteContent(data.content || ''));
    setIsLocked(!!data.is_locked);
    setIsPinned(!!data.is_pinned);
    setTags(data.tags || []);
    setImageUris(data.image_uris || []);
    setAudioUris(data.audio_uris || []);
    setDrawingUris(data.drawing_uris || []);
    setPriority(data.priority || 'Medium');
    setFolder(data.folder || 'General');
    setFlashcards(data.flashcards || []);
    setFormulas(data.formulas || []);
  }, []);

  const authenticateToUnlock = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock note' });
      if (result.success) setIsAuthenticated(true);
      else router.back();
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    loadedIdRef.current = null;
  }, [id]);

  useEffect(() => {
    if (loadedIdRef.current === id) return;

    if (!isNew && existingNote) {
      if (existingNote.is_locked && !isAuthenticated) {
        authenticateToUnlock();
        return;
      }
      hydrate({
        title: existingNote.title,
        content: existingNote.content,
        is_locked: existingNote.is_locked,
        is_pinned: existingNote.is_pinned,
        tags: existingNote.tags,
        image_uris: existingNote.image_uris,
        audio_uris: existingNote.audio_uris,
        drawing_uris: existingNote.drawing_uris,
        priority: existingNote.priority,
        folder: existingNote.folder,
        flashcards: existingNote.flashcards,
        formulas: existingNote.formulas,
      });
      loadedIdRef.current = id as string;
      return;
    }

    if (isNew) {
      const draft = useStore.getState().draftNote;
      if (draft) hydrate(draft as DraftPayload);
      loadedIdRef.current = 'new';
      return;
    }

    if (!isNew && !existingNote) {
      router.back();
    }
  }, [id, isNew, existingNote, isAuthenticated, authenticateToUnlock, hydrate, router]);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => {
      const empty =
        !title.trim() && !content.trim()
        && imageUris.length === 0 && audioUris.length === 0
        && drawingUris.length === 0 && formulas.length === 0;
      const payload: DraftPayload | null = empty ? null : {
        title, content, is_locked: isLocked, is_pinned: isPinned, tags,
        image_uris: imageUris, audio_uris: audioUris, drawing_uris: drawingUris,
        priority, folder, flashcards, formulas,
      };
      const sig = draftSignature(payload);
      if (sig === lastDraftSigRef.current) return;
      lastDraftSigRef.current = sig;
      setDraftNote(payload);
    }, 350);
    return () => clearTimeout(timer);
  }, [title, content, isLocked, isPinned, tags, imageUris, audioUris, drawingUris, priority, folder, flashcards, formulas, isNew, setDraftNote]);

  const handlePickImage = async (useCamera = false) => {
    const { granted, status } = await requestIntelligentPermission(useCamera ? 'camera' : 'media');
    if (!granted) {
      setAlertConfig({
        title: useCamera ? 'Camera blocked' : 'Photos blocked',
        message: 'Enable access in settings to attach images.',
        type: 'warning',
        showCancel: true,
        confirmText: 'Settings',
        onConfirm: () => { openSettings(); setAlertVisible(false); },
        onCancel: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]) {
      setImageUris(prev => [...prev, result.assets[0].uri]);
    }
    setImagePickerVisible(false);
  };

  const startRecording = async () => {
    const { granted } = await requestIntelligentPermission('microphone');
    if (!granted) {
      setAlertConfig({ title: 'Microphone needed', message: 'Allow mic access to record voice notes.', type: 'warning' });
      setAlertVisible(true);
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
    } catch {
      setAlertConfig({ title: 'Recording error', message: 'Could not start the microphone.', type: 'error' });
      setAlertVisible(true);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) setAudioUris(prev => [...prev, uri]);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (isNew && mode === 'voice' && !autoStartRecorded.current) {
      autoStartRecorded.current = true;
      const timer = setTimeout(() => startRecording(), 500);
      return () => clearTimeout(timer);
    }
  }, [isNew, mode]);

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    const cleanedContent = normalizeNoteContent(content).trim();
    if (!title.trim() && !cleanedContent) {
      router.back();
      return;
    }
    const hoursSpent = (Date.now() - startTimeRef.current) / 3600000;
    const noteData = {
      title: title.trim(),
      content: cleanedContent,
      is_locked: isLocked,
      is_pinned: isPinned,
      tags,
      image_uris: imageUris,
      audio_uris: audioUris,
      drawing_uris: drawingUris,
      priority,
      folder,
      flashcards,
      formulas,
      study_hours: (existingNote?.study_hours || 0) + hoursSpent,
      revision_score: existingNote?.revision_score || 0,
      last_reviewed_at: existingNote?.last_reviewed_at || null,
      media_uri: imageUris[0] || audioUris[0] || null,
      media_type: imageUris.length > 0 ? 'image' : (audioUris.length > 0 ? 'audio' : null) as 'image' | 'audio' | null,
    };
    if (isNew) {
      await addNote(noteData);
      setDraftNote(null);
      lastDraftSigRef.current = '';
    } else {
      await updateNote(id as string, noteData);
    }
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNote(id as string); router.back(); } },
    ]);
  };

  if (!isNew && existingNote?.is_locked && !isAuthenticated) {
    return (
      <BackgroundGradient>
        <View style={styles.lockedCenter}>
          <Lock size={48} color={theme.secondaryText} />
          <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_600SemiBold', marginTop: 12 }}>Unlock to view</Text>
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={theme.accent} />
          </Pressable>
          <Text style={[styles.topTitle, { color: theme.primaryText }]} numberOfLines={1}>
            {isNew ? 'New note' : title || 'Edit note'}
          </Text>
          <Pressable onPress={() => setMenuOpen(true)} style={[styles.iconBtn, { backgroundColor: theme.card }]}>
            <MoreHorizontal size={20} color={theme.primaryText} />
          </Pressable>
          <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20 }}>
            <TextInput
              style={[styles.titleInput, { color: theme.primaryText }]}
              placeholder="Title"
              placeholderTextColor={theme.tertiaryText}
              value={title}
              onChangeText={setTitle}
              multiline
            />

            <Pressable onPress={() => setDetailsOpen(true)} style={[styles.metaChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>
                {folder} · {priority}{tags.length ? ` · ${tags.length} tag${tags.length > 1 ? 's' : ''}` : ''}
              </Text>
            </Pressable>

            <View style={styles.attachRow}>
              {[
                { label: 'Photo', icon: ImageIcon, onPress: () => setImagePickerVisible(true) },
                { label: isRecording ? 'Stop' : 'Voice', icon: isRecording ? Square : Mic, onPress: isRecording ? stopRecording : startRecording, danger: isRecording },
                { label: 'Sketch', icon: PenTool, onPress: () => setIsDrawing(true) },
                { label: 'Formula', icon: Calculator, onPress: () => setFormulaModalVisible(true) },
              ].map(btn => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  style={[
                    styles.attachBtn,
                    {
                      backgroundColor: btn.danger ? `${theme.danger}15` : theme.card,
                      borderColor: btn.danger ? theme.danger : theme.cardBorder,
                    },
                  ]}
                >
                  <btn.icon size={16} color={btn.danger ? theme.danger : theme.accent} />
                  <Text style={{ marginLeft: 6, fontSize: 12, fontFamily: 'Inter_600SemiBold', color: btn.danger ? theme.danger : theme.primaryText }}>
                    {btn.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isRecording && (
              <VoiceRecordingUI
                onStop={stopRecording}
                colors={{
                  background: theme.background,
                  cardBg: theme.card,
                  cardBorder: theme.cardBorder,
                  text: theme.primaryText,
                  textSecondary: theme.secondaryText,
                }}
                isDark={isDark}
              />
            )}

            {imageUris.map((uri, idx) => (
              <Pressable
                key={`img-${idx}`}
                onPress={() => { setSelectedImageUri(uri); setImageViewerVisible(true); }}
                style={[styles.imageWrap, { borderColor: theme.cardBorder }]}
              >
                <Image source={{ uri }} style={styles.image} />
              </Pressable>
            ))}

            {audioUris.map((uri, idx) => (
              <VoiceNoteItem
                key={`aud-${idx}`}
                uri={uri}
                index={idx}
                colors={{
                  background: theme.background,
                  cardBg: theme.card,
                  cardBorder: theme.cardBorder,
                  text: theme.primaryText,
                  textSecondary: theme.secondaryText,
                }}
                isDark={isDark}
                onDelete={() => setAudioUris(audioUris.filter((_, i) => i !== idx))}
              />
            ))}

            {drawingUris.map((drawingData, idx) => {
              let strokes: any = [];
              try {
                strokes = typeof drawingData === 'string' ? JSON.parse(drawingData) : drawingData;
                if (!Array.isArray(strokes)) {
                  strokes = [];
                }
              } catch (err) {
                console.warn("Failed to parse drawing strokes:", err);
              }
              const inkStrokes = strokes.filter((s: any) => s && typeof s === 'object' && s.d && !s.isEraser);
              const eraserStrokes = strokes.filter((s: any) => s && typeof s === 'object' && s.d && s.isEraser);
              const maskId = `mask-${idx}`;
              return (
                <View key={`draw-${idx}`} style={[styles.drawingWrap, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Svg style={StyleSheet.absoluteFill}>
                    <Defs>
                      <Mask id={maskId}>
                        <Rect width="100%" height="100%" fill="white" />
                        {eraserStrokes.map((s: { d: string; width: number }, sIdx: number) => (
                          <Path key={`e-${sIdx}`} d={s.d} stroke="black" strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                      </Mask>
                    </Defs>
                    <G mask={`url(#${maskId})`}>
                      {inkStrokes.map((s: { d: string; color: string; width: number }, sIdx: number) => (
                        <Path key={`i-${sIdx}`} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      ))}
                    </G>
                  </Svg>
                  <Pressable onPress={() => setDrawingUris(drawingUris.filter((_, i) => i !== idx))} style={styles.drawDelete}>
                    <Trash2 size={16} color={theme.primaryText} />
                  </Pressable>
                </View>
              );
            })}

            {formulas.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 10 }}>
                {formulas.map((f, idx) => (
                  <View key={idx} style={[styles.formulaCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: theme.primaryText }}>{f.name}</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 13, color: theme.accent, marginTop: 4 }}>{f.latexOrText}</Text>
                    <Pressable onPress={() => setFormulas(formulas.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: 8, right: 8 }}>
                      <X size={14} color={theme.secondaryText} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={{
                fontSize: 16,
                fontFamily: 'Inter_500Medium',
                lineHeight: 24,
                color: theme.primaryText,
                minHeight: 320,
                textAlignVertical: 'top',
                marginTop: 10,
              }}
              placeholder="Write here — use [[hidden text]] for active recall in Study tab"
              placeholderTextColor={theme.tertiaryText}
              value={content}
              onChangeText={setContent}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isDrawing && (
        <DrawingCanvas
          colors={{
            background: theme.background,
            cardBg: theme.card,
            cardBorder: theme.cardBorder,
            text: theme.primaryText,
            textSecondary: theme.secondaryText,
          }}
          onCancel={() => setIsDrawing(false)}
          onSave={(paths) => { setDrawingUris([...drawingUris, paths]); setIsDrawing(false); }}
        />
      )}

      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuSheet, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder, marginTop: insets.top + 56 }]}>
            {[
              { label: isPinned ? 'Unpin' : 'Pin', icon: Pin, onPress: () => setIsPinned(!isPinned) },
              { label: isLocked ? 'Unlock' : 'Lock', icon: isLocked ? Lock : Unlock, onPress: () => setIsLocked(!isLocked) },
              { label: 'Details', icon: Plus, onPress: () => { setMenuOpen(false); setDetailsOpen(true); } },
              ...(!isNew ? [{ label: 'Delete', icon: Trash2, onPress: handleDelete, danger: true }] : []),
            ].map(item => (
              <Pressable key={item.label} onPress={() => { item.onPress(); setMenuOpen(false); }} style={styles.menuRow}>
                <item.icon size={18} color={'danger' in item && item.danger ? theme.danger : theme.primaryText} />
                <Text style={{ marginLeft: 12, fontFamily: 'Inter_600SemiBold', color: 'danger' in item && item.danger ? theme.danger : theme.primaryText }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <KeyboardAwareSheet visible={detailsOpen} onClose={() => setDetailsOpen(false)} title="Note details">
        <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Space</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {FOLDERS.map(f => (
            <Pressable key={f} onPress={() => setFolder(f)} style={[styles.pill, { backgroundColor: folder === f ? theme.accent : theme.card, borderColor: folder === f ? theme.accent : theme.cardBorder }]}>
              <Text style={{ color: folder === f ? '#FFF' : theme.primaryText, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['Low', 'Medium', 'High', 'Critical'] as const).map(p => (
            <Pressable key={p} onPress={() => setPriority(p)} style={[styles.pill, { flex: 1, backgroundColor: priority === p ? PRIORITY_COLORS[p] : theme.card, borderColor: priority === p ? PRIORITY_COLORS[p] : theme.cardBorder }]}>
              <Text style={{ textAlign: 'center', color: priority === p ? '#FFF' : theme.primaryText, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Tags</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {tags.map(tag => (
            <Pressable key={tag} onPress={() => setTags(tags.filter(t => t !== tag))} style={[styles.tagPill, { backgroundColor: theme.card }]}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: theme.primaryText }}>#{tag} ×</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.tagInput, { color: theme.primaryText, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          placeholder="Add tag"
          placeholderTextColor={theme.tertiaryText}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
        <Pressable onPress={() => setDetailsOpen(false)} style={[styles.sheetDone, { backgroundColor: theme.accent }]}>
          <Text style={{ color: '#FFF', fontFamily: 'Inter_700Bold' }}>Done</Text>
        </Pressable>
      </KeyboardAwareSheet>

      <Modal visible={imagePickerVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.choiceBox, { backgroundColor: theme.cardSolid, borderColor: theme.cardBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Add photo</Text>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
              <Pressable onPress={() => handlePickImage(true)} style={styles.choiceItem}>
                <Camera size={28} color={theme.accent} />
                <Text style={{ marginTop: 8, color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }}>Camera</Text>
              </Pressable>
              <Pressable onPress={() => handlePickImage(false)} style={styles.choiceItem}>
                <ImageIcon size={28} color={theme.accent} />
                <Text style={{ marginTop: 8, color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }}>Gallery</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setImagePickerVisible(false)} style={{ marginTop: 20 }}>
              <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAwareSheet visible={formulaModalVisible} onClose={() => setFormulaModalVisible(false)} title="Add formula">
        <TextInput style={[styles.modalInput, { color: theme.primaryText, borderColor: theme.cardBorder, backgroundColor: theme.card }]} placeholder="Name" placeholderTextColor={theme.tertiaryText} value={formulaName} onChangeText={setFormulaName} />
        <TextInput style={[styles.modalInput, { color: theme.primaryText, borderColor: theme.cardBorder, backgroundColor: theme.card, fontFamily: 'monospace' }]} placeholder="Equation" placeholderTextColor={theme.tertiaryText} value={formulaEq} onChangeText={setFormulaEq} multiline />
        <Pressable
          onPress={() => {
            if (formulaName.trim() && formulaEq.trim()) {
              setFormulas([...formulas, { name: formulaName.trim(), latexOrText: formulaEq.trim(), description: '' }]);
              setFormulaName('');
              setFormulaEq('');
              setFormulaModalVisible(false);
            }
          }}
          style={[styles.sheetDone, { backgroundColor: theme.accent, marginTop: 8 }]}
        >
          <Text style={{ color: '#FFF', fontFamily: 'Inter_700Bold' }}>Add</Text>
        </Pressable>
      </KeyboardAwareSheet>

      <ImageViewer visible={imageViewerVisible} uri={selectedImageUri || ''} isDark={isDark} onClose={() => setImageViewerVisible(false)} onDelete={() => { setImageUris(imageUris.filter(u => u !== selectedImageUri)); setImageViewerVisible(false); }} />
      <CustomAlert visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onConfirm={alertConfig.onConfirm || (() => setAlertVisible(false))} onCancel={alertConfig.onCancel || (() => setAlertVisible(false))} showCancel={alertConfig.showCancel} cancelText={alertConfig.cancelText} confirmText={alertConfig.confirmText} />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  lockedCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 6 },
  topTitle: { flex: 1, fontSize: 17, fontFamily: 'Inter_700Bold' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 14 },
  titleInput: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', marginBottom: 10 },
  metaChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  imageWrap: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  image: { width: '100%', height: 200, resizeMode: 'cover' },
  drawingWrap: { height: 180, borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  drawDelete: { position: 'absolute', top: 10, right: 10, padding: 8, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.08)' },
  formulaCard: { padding: 12, borderRadius: 14, borderWidth: 1, minWidth: 160, paddingRight: 28 },
  toolbar: { backgroundColor: 'transparent', marginBottom: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  menuSheet: { alignSelf: 'flex-end', marginRight: 16, borderRadius: 16, borderWidth: 1, padding: 8, minWidth: 200 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  detailsSheet: { width: '100%', maxWidth: 400, borderRadius: 24, borderWidth: 1, padding: 22, marginTop: 'auto' },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginBottom: 16 },
  sheetLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Inter_500Medium', marginBottom: 16 },
  sheetDone: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  choiceBox: { width: '100%', maxWidth: 300, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: 'center' },
  choiceItem: { alignItems: 'center' },
  modalInput: { width: '100%', height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 10, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
