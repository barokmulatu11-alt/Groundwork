const fs = require('fs');
const filePath = 'c:\\Users\\HP\\Desktop\\Groundwork\\app\\notes\\[id].tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `  return (
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
                      <Trash2 size={20} color={theme.danger} />
                    </Pressable>
                  )}
               </View>
               <Pressable onPress={handleSave} style={{ paddingHorizontal: 20, height: 40, borderRadius: 12, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ color: 'white', fontFamily: 'Inter_700Bold' }}>Save</Text>
               </Pressable>
            </View>
          </View>
`;

const startMarker = "return (\n    <BackgroundGradient>\n      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>";
const endMarker = "<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>";

const startIndex = content.lastIndexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed [id].tsx');
} else {
    console.log('Could not find markers');
    console.log('startIndex:', startIndex);
    console.log('endIndex:', endIndex);
}
