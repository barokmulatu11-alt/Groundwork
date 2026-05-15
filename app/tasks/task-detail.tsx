import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text>Task Detail {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
