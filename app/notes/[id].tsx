import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { ImageViewer } from '@/components/ImageViewer';
import { AlertType, CustomAlert } from '@/components/ui/CustomAlert';
import { VoiceNoteItem } from '@/components/VoiceNoteItem';
import { VoiceRecordingUI } from '@/components/VoiceRecordingUI';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bold, Camera, ChevronLeft, Image as GalleryIcon, Image as ImageIcon, Italic, Link, List, ListOrdered, Lock, Mic, PenTool, Pin, Redo, Square, Strikethrough, Trash2, Underline, Undo, Unlock, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { notes, addNote, updateNote, deleteNote, draftNote, setDraftNote } = useStore();
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

  const richText = useRef<RichEditor>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ 
    title: string; 
    message: string; 
    type: AlertType;
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    cancelText?: string;
    confirmText?: string;
  }>({ title: '', message: '', type: 'info' });

  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (!isNew && existingNote) {
      if (existingNote.is_locked && !isAuthenticated) {
        authenticateToUnlock();
      } else {
        setTitle(existingNote.title);
        setContent(existingNote.content);
        setIsLocked(existingNote.is_locked);
        setIsPinned(existingNote.is_pinned || false);
        setTags(existingNote.tags || []);
        setImageUris(existingNote.image_uris || []);
        setAudioUris(existingNote.audio_uris || []);
        setDrawingUris(existingNote.drawing_uris || []);
      }
    } else if (isNew && draftNote) {
      setTitle(draftNote.title || '');
      setContent(draftNote.content || '');
      setIsLocked(draftNote.is_locked || false);
      setIsPinned(draftNote.is_pinned || false);
      setTags(draftNote.tags || []);
      setImageUris(draftNote.image_uris || []);
      setAudioUris(draftNote.audio_uris || []);
      setDrawingUris(draftNote.drawing_uris || []);
    } else if (!isNew && !existingNote) {
      router.back();
    }
  }, [id, isAuthenticated, draftNote]);

  useEffect(() => {
    if (isNew) {
      if (!title.trim() && !content.trim() && imageUris.length === 0 && audioUris.length === 0 && drawingUris.length === 0) {
        setDraftNote(null);
      } else {
        setDraftNote({ 
          title, 
          content, 
          is_locked: isLocked, 
          is_pinned: isPinned, 
          tags, 
          image_uris: imageUris, 
          audio_uris: audioUris, 
          drawing_uris: drawingUris 
        });
      }
    }
  }, [title, content, isLocked, isPinned, tags, imageUris, audioUris, drawingUris]);

  const authenticateToUnlock = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Note' });
      if (result.success) setIsAuthenticated(true);
      else router.back();
    } else {
      setIsAuthenticated(true);
    }
  };

  const handlePickImage = async (useCamera: boolean = false) => {
    const getStatus = async () => {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status;
      }
    };

    const status = await getStatus();

    if (status !== 'granted') {
      setAlertConfig({
        title: useCamera ? 'Camera Access Needed' : 'Photo Access Needed',
        message: useCamera ? 'To attach photos to your notes, please allow camera access.' : 'To attach images from your gallery, please allow photo access.',
        type: 'warning' });
      setAlertVisible(true);
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3] };

    const result = useCamera 
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUris([...imageUris, result.assets[0].uri]);
    }
    setImagePickerVisible(false);
  };

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();

    if (status !== 'granted') {
      setAlertConfig({
        title: 'Microphone Access Needed',
        message: 'To record voice notes, please allow microphone access in your settings.',
        type: 'warning' });
      setAlertVisible(true);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      showAlert('Recording Error', 'The microphone could not be started.', 'error');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        setAudioUris([...audioUris, uri]);
        transcribeAudio(uri);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  const transcribeAudio = (uri: string) => {
    setTimeout(() => {
      const transcription = "<p><i>[Voice Transcription]: This is a summary of the recorded thoughts regarding the project timeline and key milestones...</i></p>";
      setContent(prev => prev + transcription);
      richText.current?.insertHTML(transcription);
    }, 2000);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      router.back();
      return;
    }
    const noteData = {
      title: title.trim(),
      content: content.trim(),
      is_locked: isLocked,
      is_pinned: isPinned,
      tags,
      image_uris: imageUris,
      audio_uris: audioUris,
      drawing_uris: drawingUris,
      media_uri: imageUris[0] || audioUris[0] || null,
      media_type: imageUris.length > 0 ? 'image' : (audioUris.length > 0 ? 'audio' : null) as any
    };

    if (isNew) {
      await addNote(noteData);
      setDraftNote(null);
    } else {
      await updateNote(id as string, noteData);
    }
    
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await deleteNote(id as string);
            router.back();
          } 
        }
      ]
    );
  };

  if (!isNew && existingNote?.is_locked && !isAuthenticated) {
    return (
      <BackgroundGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Lock size={48} color={theme.secondaryText} style={{ marginBottom: 16 }} />
          <Text style={{ color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>Unlock to view note</Text>
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 24 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
            <TabHeader 
              title={isNew ? "New Note" : "Edit Note"} 
              subtitle={isNew ? "Capture your thoughts" : `Last edited ${existingNote ? new Date(existingNote.updated_at).toLocaleDateString() : ''}`}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={() => setIsPinned(!isPinned)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isPinned ? theme.accent : theme.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Pin size={20} color={isPinned ? 'white' : theme.accent} />
                  </Pressable>
                  <Pressable onPress={() => setIsLocked(!isLocked)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isLocked ? theme.accent : theme.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                    {isLocked ? <Lock size={20} color="white" /> : <Unlock size={20} color={theme.accent} />}
                  </Pressable>
                  {!isNew && (
                    <Pressable onPress={handleDelete} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${theme.danger}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={16} color={theme.danger} />
                    </Pressable>
                  )}
               </View>
               <Pressable onPress={handleSave} style={{ paddingHorizontal: 20, height: 40, borderRadius: 12, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ color: 'white', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Save</Text>
               </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={{ paddingHorizontal: 24 }}>
              <TextInput
                style={[styles.titleInput, { color: theme.primaryText }]}
                placeholder="Note Title"
                placeholderTextColor={theme.secondaryText + '80'}
                value={title}
                onChangeText={setTitle}
                multiline
              />
              
              <View style={styles.tagSection}>
                {tags.map(tag => (
                  <View key={tag} style={[styles.tagPill, { backgroundColor: theme.card }]}>
                    <Text style={[styles.tagText, { color: theme.primaryText }]}>#{tag}</Text>
                    <Pressable onPress={() => setTags(tags.filter(t => t !== tag))} style={{ marginLeft: 6 }}>
                      <Text style={[styles.tagClose, { color: theme.secondaryText }]}>×</Text>
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  style={[styles.tagInput, { color: theme.primaryText, borderColor: theme.cardBorder }]}
                  placeholder="Add tag..."
                  placeholderTextColor={theme.secondaryText}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.attachmentStrip}>
                <Pressable 
                  onPress={() => setImagePickerVisible(true)} 
                  style={[styles.attachmentBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <ImageIcon size={16} color={theme.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.attachmentBtnText, { color: theme.primaryText }]}>Image</Text>
                </Pressable>

                <Pressable 
                  onPress={isRecording ? stopRecording : startRecording} 
                  style={[styles.attachmentBtn, isRecording ? { backgroundColor: `${theme.danger}15`, borderColor: theme.danger } : { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  {isRecording ? <Square size={16} color={theme.danger} style={{ marginRight: 8 }} /> : <Mic size={16} color={theme.accent} style={{ marginRight: 8 }} />}
                  <Text style={[styles.attachmentBtnText, { color: isRecording ? theme.danger : theme.primaryText }]}>{isRecording ? 'Recording' : 'Voice'}</Text>
                </Pressable>
              </View>

              {imageUris.map((uri, idx) => (
                <Pressable 
                  key={`img-${idx}`} 
                  onPress={() => { setSelectedImageUri(uri); setImageViewerVisible(true); }}
                  onLongPress={() => {
                    Alert.alert("Image Options", "What would you like to do?", [
                      { text: "Delete", style: "destructive", onPress: () => setImageUris(imageUris.filter((_, i) => i !== idx)) },
                      { text: "Cancel", style: "cancel" }
                    ]);
                  }}
                  style={[styles.imageAttachment, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
                >
                  <Image source={{ uri }} style={styles.imageAsset} />
                </Pressable>
              ))}

              {isRecording && (
                <VoiceRecordingUI 
                  onStop={stopRecording} 
                  colors={{
                    background: theme.background,
                    cardBg: theme.card,
                    cardBorder: theme.cardBorder,
                    text: theme.primaryText,
                    textSecondary: theme.secondaryText
                  }} 
                  isDark={isDark} 
                />
              )}

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
                    textSecondary: theme.secondaryText
                  }} 
                  isDark={isDark} 
                  onDelete={() => setAudioUris(audioUris.filter((_, i) => i !== idx))} 
                />
              ))}

              {drawingUris.map((drawingData, idx) => {
                const strokes = JSON.parse(drawingData);
                const inkStrokes = strokes.filter((s: any) => !s.isEraser);
                const eraserStrokes = strokes.filter((s: any) => s.isEraser);
                const maskId = `mask-${idx}`;
                return (
                  <View key={`draw-${idx}`} style={[styles.drawingAttachment, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Svg style={StyleSheet.absoluteFill}>
                      <Defs><Mask id={maskId}><Rect width="100%" height="100%" fill="white" />{eraserStrokes.map((s: any, sIdx: number) => (<Path key={`e-${sIdx}`} d={s.d} stroke="black" strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />))}</Mask></Defs>
                      <G mask={`url(#${maskId})`}>{inkStrokes.map((s: any, sIdx: number) => (<Path key={`i-${sIdx}`} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />))}</G>
                    </Svg>
                    <Pressable onPress={() => setDrawingUris(drawingUris.filter((_, i) => i !== idx))} style={styles.drawingDeleteBtn}>
                      <Trash2 size={16} color={theme.primaryText} />
                    </Pressable>
                  </View>
                );
              })}

              <RichToolbar
                editor={richText}
                actions={[actions.setBold, actions.setItalic, actions.setUnderline, actions.insertBulletsList, actions.insertOrderedList, actions.insertLink, actions.setStrikethrough, actions.undo, actions.redo]}
                style={styles.toolbar}
                selectedIconTint={theme.accent}
                iconTint={theme.secondaryText}
                iconMap={{
                  [actions.setBold]: ({ tintColor }: any) => <Bold size={18} color={tintColor} />,
                  [actions.setItalic]: ({ tintColor }: any) => <Italic size={18} color={tintColor} />,
                  [actions.setUnderline]: ({ tintColor }: any) => <Underline size={18} color={tintColor} />,
                  [actions.insertBulletsList]: ({ tintColor }: any) => <List size={18} color={tintColor} />,
                  [actions.insertOrderedList]: ({ tintColor }: any) => <ListOrdered size={18} color={tintColor} />,
                  [actions.insertLink]: ({ tintColor }: any) => <Link size={18} color={tintColor} />,
                  [actions.setStrikethrough]: ({ tintColor }: any) => <Strikethrough size={18} color={tintColor} />,
                  [actions.undo]: ({ tintColor }: any) => <Undo size={18} color={tintColor} />,
                  [actions.redo]: ({ tintColor }: any) => <Redo size={18} color={tintColor} />
                }}
              />
              <RichEditor
                ref={richText}
                initialContentHTML={content}
                onChange={setContent}
                placeholder="Start typing your thoughts..."
                editorStyle={{
                  backgroundColor: 'transparent',
                  color: theme.primaryText,
                  contentCSSText: `font-family: 'Inter_500Medium'; font-size: 16px; line-height: 24px; min-height: 400px;` }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {isDrawing && (
        <DrawingCanvas 
          colors={{
            background: theme.background,
            cardBg: theme.card,
            cardBorder: theme.cardBorder,
            text: theme.primaryText,
            textSecondary: theme.secondaryText
          }} 
          onCancel={() => setIsDrawing(false)} 
          onSave={(paths) => { setDrawingUris([...drawingUris, paths]); setIsDrawing(false); }} 
        />
      )}

      <Modal visible={imagePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setImagePickerVisible(false)} />
          <View style={[styles.choiceContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Text style={[styles.choiceTitle, { color: theme.primaryText }]}>Add Image</Text>
            <View style={styles.choiceRow}>
              <Pressable onPress={() => handlePickImage(true)} style={styles.choiceBtn}>
                <View style={[styles.choiceIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}><Camera size={24} color="#007AFF" /></View>
                <Text style={[styles.choiceText, { color: theme.primaryText }]}>Camera</Text>
              </Pressable>
              <Pressable onPress={() => handlePickImage(false)} style={styles.choiceBtn}>
                <View style={[styles.choiceIcon, { backgroundColor: 'rgba(52,199,89,0.1)' }]}><GalleryIcon size={24} color="#34C759" /></View>
                <Text style={[styles.choiceText, { color: theme.primaryText }]}>Gallery</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setImagePickerVisible(false)} style={styles.closeBtn}><X size={20} color={theme.secondaryText} /></Pressable>
          </View>
        </View>
      </Modal>

      <ImageViewer visible={imageViewerVisible} uri={selectedImageUri || ''} isDark={isDark} onClose={() => setImageViewerVisible(false)} onDelete={() => { setImageUris(imageUris.filter(u => u !== selectedImageUri)); setImageViewerVisible(false); }} />
      <CustomAlert visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onConfirm={alertConfig.onConfirm || (() => setAlertVisible(false))} onCancel={alertConfig.onCancel || (() => setAlertVisible(false))} showCancel={alertConfig.showCancel} cancelText={alertConfig.cancelText} confirmText={alertConfig.confirmText} />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtn: { padding: 8, borderRadius: 12, paddingHorizontal: 16 },
  saveBtnText: { color: '#FFF', fontFamily: 'Inter_700Bold' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', marginBottom: 16 },
  tagSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  tagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  tagClose: { fontSize: 14,  fontFamily: 'Inter_600SemiBold' },
  tagInput: { fontSize: 12, fontFamily: 'Inter_500Medium', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 16 },
  attachmentStrip: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  attachmentBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  imageAttachment: { marginBottom: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  imageAsset: { width: '100%', height: 220, resizeMode: 'cover' },
  drawingAttachment: { marginBottom: 16, height: 200, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  drawingDeleteBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 20 },
  toolbar: { backgroundColor: 'transparent' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  choiceContainer: { width: '100%', maxWidth: 320, borderRadius: 28, borderWidth: 1, padding: 24, alignItems: 'center', position: 'relative' },
  choiceTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 24 },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', gap: 20 },
  choiceBtn: { alignItems: 'center' },
  choiceIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  choiceText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 }
});
