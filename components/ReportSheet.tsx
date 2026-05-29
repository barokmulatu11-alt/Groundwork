import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import { AppText as Text } from './ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { X, ChevronDown, CheckCircle2, AlertCircle, MessageSquare, Bug, Lightbulb } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/useAuthStore';

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ReportSheet({ visible, onClose }: ReportSheetProps) {
  const { theme, isDark } = useTheme();
  const { session } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'bug' | 'suggestion' | 'problem'>('bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please provide both a title and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        user_id: session?.user?.id,
        title: title.trim(),
        description: description.trim(),
        type: type,
        status: 'pending'
      });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setDescription('');
        setType('bug');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { label: 'Bug', value: 'bug', icon: Bug },
    { label: 'Suggestion', value: 'suggestion', icon: Lightbulb },
    { label: 'General Problem', value: 'problem', icon: AlertCircle },
  ];

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleRequestClose = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
    } else {
      onClose();
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent 
      onRequestClose={handleRequestClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={[
            styles.sheet, 
            { 
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', // Force solid background
              borderColor: theme.cardBorder,
              borderTopWidth: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 20
            }
          ]}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Report an Issue</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={theme.tertiaryText} />
              </Pressable>
            </View>

            {isSuccess ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={64} color={theme.accent} />
                <Text style={[styles.successTitle, { color: theme.primaryText }]}>Report Submitted</Text>
                <Text style={[styles.successSubtitle, { color: theme.secondaryText }]}>
                  Thank you for helping us improve groundwork.!
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
                <Text style={[styles.label, { color: theme.secondaryText }]}>REPORT TYPE</Text>
                <View style={styles.typeGrid}>
                  {types.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setType(t.value as any)}
                      style={[
                        styles.typeCard,
                        { borderColor: type === t.value ? theme.accent : theme.cardBorder },
                        type === t.value && { backgroundColor: theme.accent + '10' }
                      ]}
                    >
                      <t.icon size={20} color={type === t.value ? theme.accent : theme.tertiaryText} />
                      <Text style={[
                        styles.typeLabel,
                        { color: type === t.value ? theme.primaryText : theme.secondaryText }
                      ]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.secondaryText }]}>TITLE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.primaryText, borderColor: theme.cardBorder }]}
                  placeholder="Summary of the issue..."
                  placeholderTextColor={theme.tertiaryText}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={[styles.label, { color: theme.secondaryText }]}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.background, color: theme.primaryText, borderColor: theme.cardBorder }]}
                  placeholder="Tell us more about what happened..."
                  placeholderTextColor={theme.tertiaryText}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <TouchableOpacity 
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[styles.submitButton, { backgroundColor: theme.accent }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 450,
  },
  sheet: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  textArea: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: 24,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
