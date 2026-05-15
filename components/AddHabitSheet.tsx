import { AppText as Text } from '@/components/ui/AppText';
import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView } from 'react-native';
import { CenterModal } from './ui/CenterModal';
import { AnimatedButton } from './ui/AnimatedButton';
import { useTheme } from '@/lib/ThemeContext';

interface AddHabitSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddHabit: (habit: { title: string, category: string, difficulty: 'Easy' | 'Medium' | 'Hard', frequency: string }) => void;
}

const CATEGORIES = ["Health", "Learning", "Mind", "Work", "Personal"];
const DIFFICULTIES: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];
const TEMPLATES = [
  { title: 'Morning Workout', category: 'Health', difficulty: 'Hard' as const },
  { title: 'Read 20 Pages', category: 'Learning', difficulty: 'Medium' as const },
  { title: 'Meditate 10min', category: 'Mind', difficulty: 'Easy' as const },
  { title: 'Drink 8 Glasses of Water', category: 'Health', difficulty: 'Easy' as const },
  { title: 'Study 1 Hour', category: 'Learning', difficulty: 'Hard' as const },
  { title: 'No Social Media', category: 'Personal', difficulty: 'Medium' as const },
];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function AddHabitSheet({ visible, onClose, onAddHabit }: AddHabitSheetProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Health');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [frequency, setFrequency] = useState('Daily');
  const [customDays, setCustomDays] = useState<number[]>([]);

  const { theme, isDark } = useTheme();
  
  const textColor = theme.primaryText;
  const labelColor = theme.secondaryText;
  const inputBorder = theme.cardBorder;

  const handleSave = () => {
    if (title.trim()) {
      let freqString = frequency;
      if (frequency === 'Custom') {
        freqString = `Custom:${customDays.sort().join(',')}`;
      }
      onAddHabit({ title: title.trim(), category, difficulty, frequency: freqString });
      reset();
      onClose();
    }
  };

  const reset = () => {
    setTitle('');
    setCategory('Health');
    setDifficulty('Medium');
    setFrequency('Daily');
    setCustomDays([]);
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setCategory(t.category);
    setDifficulty(t.difficulty);
  };

  const toggleDay = (idx: number) => {
    if (customDays.includes(idx)) {
      setCustomDays(customDays.filter(d => d !== idx));
    } else {
      setCustomDays([...customDays, idx]);
    }
  };

  return (
    <CenterModal visible={visible} onClose={onClose} maxWidth={380}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: textColor, marginBottom: 20, textAlign: 'center' }}>Create Habit</Text>
        
        {/* Templates */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Quick Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {TEMPLATES.map(t => (
            <Pressable
              key={t.title}
              onPress={() => applyTemplate(t)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginRight: 8, borderWidth: 1, borderColor: theme.cardBorder }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}>{t.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Habit Name */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Habit Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Drink 2L of water"
            placeholderTextColor="#AEAEB2"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', color: textColor, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: inputBorder, fontSize: 15, fontFamily: 'Inter_500Medium' }}
          />
        </View>

        {/* Category */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: category === c ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), borderWidth: 1, borderColor: category === c ? '#007AFF' : theme.cardBorder }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: category === c ? 'white' : theme.primaryText }}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Difficulty</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {DIFFICULTIES.map(d => (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: difficulty === d ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), alignItems: 'center', borderWidth: 1, borderColor: difficulty === d ? '#007AFF' : theme.cardBorder }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: difficulty === d ? 'white' : theme.primaryText }}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Frequency</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {['Daily', 'Weekdays', 'Weekends', 'Custom'].map(f => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: frequency === f ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), borderWidth: 1, borderColor: frequency === f ? '#007AFF' : theme.cardBorder }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: frequency === f ? 'white' : theme.primaryText }}>{f}</Text>
              </Pressable>
            ))}
          </View>

          {frequency === 'Custom' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {DAYS.map((d, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: customDays.includes(i) ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: customDays.includes(i) ? '#007AFF' : theme.cardBorder }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: customDays.includes(i) ? 'white' : theme.primaryText }}>{d}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <AnimatedButton title="Create Habit" onPress={handleSave} />
      </ScrollView>
    </CenterModal>
  );
}



