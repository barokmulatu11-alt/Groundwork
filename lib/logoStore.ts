/**
 * logoStore.ts — Groundwork Launcher Icon Center
 *
 * Manages the Android launcher icon variant selection.
 * In-app headers and branding remain completely consistent and decoupled
 * from the Android device launcher icon.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { create } from 'zustand';

// ─── Logo variant definitions ─────────────────────────────────────────────────

export type LogoVariantId =
  | 'classic'
  | 'pro_blue'
  | 'dark_titanium'
  | 'gold_elite'
  | 'neon_future'
  | 'executive';

export interface LogoVariant {
  id: LogoVariantId;
  name: string;
  tagline: string;
  // Visual identity tokens used for preview cards
  letterColor: string;
  letterColorSecondary: string;
  dotColor: string;
  background: string;
  isGradient: boolean;
  glowColor: string | null;
  isPro: boolean; // Milestone reward unlocked
}

export const LOGO_VARIANTS: LogoVariant[] = [
  {
    id: 'classic',
    name: 'Groundwork Classic',
    tagline: 'The original. Clean, minimal, timeless.',
    letterColor: '#007AFF',
    letterColorSecondary: '#007AFF',
    dotColor: '#007AFF',
    background: '#FFFFFF',
    isGradient: false,
    glowColor: null,
    isPro: false,
  },
  {
    id: 'pro_blue',
    name: 'Groundwork Blue',
    tagline: 'Deep blue gradient with premium depth.',
    letterColor: '#1A56FF',
    letterColorSecondary: '#0A2AFF',
    dotColor: '#4A90FF',
    background: '#0B1528',
    isGradient: true,
    glowColor: null,
    isPro: true,
  },
  {
    id: 'dark_titanium',
    name: 'Dark Titanium',
    tagline: 'Sleek metallic grey on deep charcoal.',
    letterColor: '#8E8E93',
    letterColorSecondary: '#636366',
    dotColor: '#AEAEB2',
    background: '#1C1E24',
    isGradient: true,
    glowColor: null,
    isPro: true,
  },
  {
    id: 'gold_elite',
    name: 'Gold Elite',
    tagline: 'Warm gold on obsidian black.',
    letterColor: '#D4AF37',
    letterColorSecondary: '#F5C842',
    dotColor: '#F5C842',
    background: '#0E0D0B',
    isGradient: true,
    glowColor: null,
    isPro: true,
  },
  {
    id: 'neon_future',
    name: 'Neon Future',
    tagline: 'Electric cyan on midnight dark.',
    letterColor: '#00F5FF',
    letterColorSecondary: '#00CFDD',
    dotColor: '#00F5FF',
    background: '#060B14',
    isGradient: false,
    glowColor: '#00F5FF',
    isPro: true,
  },
  {
    id: 'executive',
    name: 'Executive Minimal',
    tagline: 'Understated slate on soft gray.',
    letterColor: '#3A3A4A',
    letterColorSecondary: '#52525B',
    dotColor: '#52525B',
    background: '#EDEFF2',
    isGradient: false,
    glowColor: null,
    isPro: true,
  },
];

export const DEFAULT_LOGO_ID: LogoVariantId = 'classic';

export const STORAGE_KEY = '@groundwork_selected_logo_v1';

// ─── Store ────────────────────────────────────────────────────────────────────

export interface LogoStoreState {
  selectedLogoId: LogoVariantId;
  isLoaded: boolean;
  isApplying: boolean;
  error: string | null;
  setSelectedLogo: (id: LogoVariantId) => Promise<boolean>;
  loadSavedLogo: () => Promise<void>;
  getActiveVariant: () => LogoVariant;
  clearError: () => void;
}

export const useLogoStore = create<LogoStoreState>((set, get) => ({
  selectedLogoId: DEFAULT_LOGO_ID,
  isLoaded: false,
  isApplying: false,
  error: null,

  clearError: () => set({ error: null }),

  // Applies the launcher icon natively on Android and persists only on success
  setSelectedLogo: async (id: LogoVariantId) => {
    const isValid = LOGO_VARIANTS.some((v) => v.id === id);
    if (!isValid) {
      const err = `Invalid launcher icon variant: ${id}`;
      set({ error: err });
      throw new Error(err);
    }

    if (get().selectedLogoId === id) {
      return true;
    }

    if (Platform.OS === 'web') {
      const msg = 'Changing home screen launcher icons is only supported on installed Android apps.';
      set({ error: msg });
      throw new Error(msg);
    }

    if (Platform.OS !== 'android') {
      const msg = 'Changing launcher icons is currently supported only on Android.';
      set({ error: msg });
      throw new Error(msg);
    }

    const { AppIconModule } = NativeModules;
    if (!AppIconModule || typeof AppIconModule.setAppIcon !== 'function') {
      const msg = 'AppIconModule is not available on this Android build.';
      set({ error: msg });
      throw new Error(msg);
    }

    const prevId = get().selectedLogoId;
    set({ isApplying: true, error: null });

    try {
      const confirmedVariant = await AppIconModule.setAppIcon(id);
      if (confirmedVariant !== id) {
        throw new Error(`Android returned unexpected active variant '${confirmedVariant}'.`);
      }
      // Persist only after native success
      await AsyncStorage.setItem(STORAGE_KEY, id);
      set({ selectedLogoId: id, isApplying: false, error: null });
      return true;
    } catch (err: any) {
      const message = err?.message || 'Failed to update launcher icon on Android.';
      // Restore previous applied selection
      set({ selectedLogoId: prevId, isApplying: false, error: message });
      throw err;
    }
  },

  // Authoritatively reads the enabled Android alias on startup and reconciles AsyncStorage
  loadSavedLogo: async () => {
    try {
      if (Platform.OS === 'android' && NativeModules.AppIconModule?.getCurrentIcon) {
        try {
          const activeNative = await NativeModules.AppIconModule.getCurrentIcon();
          const isValid = LOGO_VARIANTS.some((v) => v.id === activeNative);
          const authoritativeId = (isValid ? activeNative : DEFAULT_LOGO_ID) as LogoVariantId;

          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          if (saved !== authoritativeId) {
            await AsyncStorage.setItem(STORAGE_KEY, authoritativeId);
          }

          set({ selectedLogoId: authoritativeId, isLoaded: true, error: null });
          return;
        } catch (nativeErr) {
          console.warn('[LogoStore] Failed to read native launcher icon state:', nativeErr);
        }
      }

      // Fallback for non-Android or if native query was unavailable
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && LOGO_VARIANTS.some((v) => v.id === saved)) {
        set({ selectedLogoId: saved as LogoVariantId, isLoaded: true, error: null });
        return;
      }
    } catch (e) {
      console.warn('[LogoStore] Failed to load saved logo, using default:', e);
    }
    set({ selectedLogoId: DEFAULT_LOGO_ID, isLoaded: true, error: null });
  },

  // Returns the currently active LogoVariant object for previews
  getActiveVariant: () => {
    const { selectedLogoId } = get();
    return (
      LOGO_VARIANTS.find((v) => v.id === selectedLogoId) ??
      LOGO_VARIANTS[0]
    );
  },
}));
