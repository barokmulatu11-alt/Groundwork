import { AppText as Text } from '@/components/ui/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Moon, Monitor, Smartphone, Sun, Type } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { name: 'Blue',    color: '#007AFF' },
  { name: 'Indigo',  color: '#5856D6' },
  { name: 'Purple',  color: '#AF52DE' },
  { name: 'Pink',    color: '#FF2D55' },
  { name: 'Green',   color: '#34C759' },
  { name: 'Teal',    color: '#5AC8FA' },
  { name: 'Orange',  color: '#FF9500' },
  { name: 'Red',     color: '#FF3B30' },
];

const APP_ICONS = [
  { name: 'Default',   bg: '#007AFF',  letter: 'g' },
  { name: 'Dark',      bg: '#1C1C1E',  letter: 'g' },
  { name: 'Midnight',  bg: '#0A0A2E',  letter: 'g' },
  { name: 'Forest',    bg: '#2D6A4F',  letter: 'g' },
  { name: 'Sunset',    bg: '#FF6B35',  letter: 'g' },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

interface SegmentedControlProps {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  theme: any;
  accentColor: string;
}

function SegmentedControl({ options, value, onChange, theme, accentColor }: SegmentedControlProps) {
  return (
    <View style={[styles.segmentedTrack, { backgroundColor: 'transparent' }]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segmentButton,
              active && { backgroundColor: 'transparent',      },
            ]}
          >
            {opt.icon && (
              <View style={{ marginBottom: 4 }}>
                {React.cloneElement(opt.icon as any, {
                  size: 16,
                  color: active ? accentColor : theme.tertiaryText,
                })}
              </View>
            )}
            <Text style={[
              styles.segmentLabel,
              { color: active ? accentColor : theme.tertiaryText },
              active && { fontFamily: 'Inter_700Bold' },
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {children}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AppearanceSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { theme: themeMode, setTheme: setThemeMode, accentColor, setAccentColor, fontSize, setFontSize } = useSettingsStore();
  const [density, setDensity]           = useState('comfortable');
  const [selectedIcon, setSelectedIcon] = useState('Default');

  const handleThemeChange = (value: string) => {
    setThemeMode(value as 'light' | 'dark' | 'system');
  };

  return (
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Personalise your experience</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── THEME ─────────────────────────────── */}
        <SectionLabel label="THEME" theme={theme} />
        <Card theme={theme}>
          <SegmentedControl
            theme={theme}
            accentColor={accentColor}
            value={themeMode}
            onChange={handleThemeChange}
            options={[
              { label: 'Light',  value: 'light',  icon: <Sun  size={16} color="" /> },
              { label: 'Dark',   value: 'dark',   icon: <Moon size={16} color="" /> },
              { label: 'System', value: 'system', icon: <Monitor size={16} color="" /> },
            ]}
          />
          {/* Live preview strip */}
          <View style={[styles.previewStrip, { backgroundColor: theme.cardBorder + '30' }]}>
            <View style={[styles.previewDot, { backgroundColor: '#FDFBD4' }]} />
            <Text style={[styles.previewLabel, { color: theme.secondaryText }]}>
              Currently: <Text style={{ color: accentColor, fontFamily: 'Inter_700Bold' }}>
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
            </Text>
            <View style={[styles.previewDot, { backgroundColor: '#080C14' }]} />
          </View>
        </Card>

        {/* ── ACCENT COLOR ──────────────────────── */}
        <SectionLabel label="ACCENT COLOR" theme={theme} />
        <Card theme={theme}>
          <View style={styles.colorGrid}>
            {ACCENT_COLORS.map((item) => {
              const active = accentColor === item.color;
              return (
                <TouchableOpacity
                  key={item.color}
                  onPress={() => setAccentColor(item.color)}
                  activeOpacity={0.8}
                  style={styles.colorItemWrapper}
                >
                  <View style={[
                    styles.colorSwatch,
                    { backgroundColor: item.color },
                    active && styles.colorSwatchActive,
                  ]}>
                    {active && <Check size={16} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.colorName, { color: theme.tertiaryText }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>


        {/* ── FONT SIZE ─────────────────────────── */}
        <SectionLabel label="FONT SIZE" theme={theme} />
        <Card theme={theme}>
          <SegmentedControl
            theme={theme}
            accentColor={accentColor}
            value={fontSize}
            onChange={(v) => setFontSize(v as any)}
            options={[
              { label: 'Small',   value: 'small' },
              { label: 'Medium',  value: 'medium' },
              { label: 'Large',   value: 'large' },
            ]}
          />
          {/* Font size preview */}
          <View style={styles.fontPreview}>
            <Text style={[
              styles.fontPreviewText,
              { color: theme.primaryText },
              fontSize === 'small'  && { fontSize: 13 },
              fontSize === 'medium' && { fontSize: 16 },
              fontSize === 'large'  && { fontSize: 20 },
            ]}>
              The quick brown fox jumps over the lazy dog.
            </Text>
          </View>
        </Card>

        {/* ── APP ICON ──────────────────────────── */}
        <SectionLabel label="APP ICON" theme={theme} />
        <Card theme={theme}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }}>Coming real soon...</Text>
          </View>
        </Card>



      </ScrollView>
    </BackgroundGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    
    
    
    
    
  },
  // ── Segmented Control ────────
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  // ── Preview strip ────────────
  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  previewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  // ── Color grid ───────────────
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  colorItemWrapper: {
    alignItems: 'center',
    gap: 6,
    width: '22%',
  },
  colorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    
    
    
    
    
    transform: [{ scale: 1.1 }],
  },
  colorName: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  // ── Font preview ─────────────
  fontPreview: {
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  fontPreviewText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  // ── App Icon ─────────────────
  iconRow: {
    gap: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  appIconWrapper: {
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  appIconPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconLetter: {
    fontSize: 32,
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
  },
  appIconLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  appIconCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Density hint ─────────────
  densityHint: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 14,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
});
