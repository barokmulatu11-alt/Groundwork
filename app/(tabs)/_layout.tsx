import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/ThemeContext';
import { Tabs } from 'expo-router';
import { BookOpen, Home, Menu, Users } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.secondaryText,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.cardBorder,
          backgroundColor: theme.cardSolid, // Solid background matching cardSolid
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          elevation: 0, // No shadow
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Menu size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
