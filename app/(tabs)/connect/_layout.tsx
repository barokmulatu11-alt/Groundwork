import { Stack } from 'expo-router';
import React from 'react';

export default function ConnectTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user-profile" />
    </Stack>
  );
}
