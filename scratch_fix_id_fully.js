const fs = require('fs');
const filePath = 'c:\\Users\\HP\\Desktop\\Groundwork\\app\\notes\\[id].tsx';
let content = fs.readFileSync(filePath, 'utf8');

const returnBlock = `  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 24 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
            <TabHeader 
              title={isNew ? "New Note" : "Edit Note"} 
              subtitle={isNew ? "Capture your thoughts" : \`Last edited \${existingNote ? new Date(existingNote.updated_at).toLocaleDateString() : ''}\`}
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
                    <Pressable onPress={handleDelete} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: \`\${theme.danger}15\`, alignItems: 'center', justifyContent: 'center' }}>
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
                  style={[styles.attachmentBtn, isRecording ? { backgroundColor: \`\${theme.danger}15\`, borderColor: theme.danger } : { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  {isRecording ? <Square size={16} color={theme.danger} style={{ marginRight: 8 }} /> : <Mic size={16} color={theme.accent} style={{ marginRight: 8 }} />}
                  <Text style={[styles.attachmentBtnText, { color: isRecording ? theme.danger : theme.primaryText }]}>{isRecording ? 'Recording' : 'Voice'}</Text>
                </Pressable>
              </View>

              {imageUris.map((uri, idx) => (
                <Pressable 
                  key={\`img-\${idx}\`} 
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
                  key={\`aud-\${idx}\`} 
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
                const maskId = \`mask-\${idx}\`;
                return (
                  <View key={\`draw-\${idx}\`} style={[styles.drawingAttachment, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Svg style={StyleSheet.absoluteFill}>
                      <Defs><Mask id={maskId}><Rect width="100%" height="100%" fill="white" />{eraserStrokes.map((s: any, sIdx: number) => (<Path key={\`e-\${sIdx}\`} d={s.d} stroke="black" strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />))}</Mask></Defs>
                      <G mask={\`url(#\${maskId})\`}>{inkStrokes.map((s: any, sIdx: number) => (<Path key={\`i-\${sIdx}\`} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />))}</G>
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
                  contentCSSText: \`font-family: 'Inter_500Medium'; font-size: 16px; line-height: 24px; min-height: 400px;\` }}
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
`;

const startIndex = content.indexOf('  return (');
const endIndex = content.indexOf('const styles = StyleSheet.create({');

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + returnBlock + '\n' + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Fully reconstructed return block in [id].tsx');
} else {
    console.log('Could not find markers');
}
