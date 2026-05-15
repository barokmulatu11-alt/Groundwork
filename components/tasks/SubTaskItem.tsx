import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Check } from 'lucide-react-native';
import { SubTask } from '@/lib/taskDatabase';

interface Props {
  subTask: SubTask;
  onToggle: (id: string) => void;
}

export const SubTaskItem = ({ subTask, onToggle }: Props) => {
  const { theme } = useTheme();

  return (
    <Pressable style={[styles.container]} onPress={() => onToggle(subTask.id)}>
      <View style={[styles.checkbox, { borderColor: theme.accent }, subTask.completed && { backgroundColor: theme.accent }]}>
        {subTask.completed && <Check size={12} color="white" />}
      </View>
      <Text style={[
        styles.title, 
        { color: theme.primaryText },
        subTask.completed && { textDecorationLine: 'line-through', opacity: 0.5 }
      ]}>
        {subTask.title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checked: { },
  title: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 }
});

