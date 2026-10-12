/**
 * logoStore.ts — Groundwork Pro Logo Center
 *
 * ISOLATED MODULE — local persistence only, no cloud sync, no backend.
 * Safe to remove without affecting any other system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // Visual identity tokens — used to render the logo in-app
  letterColor: string;        // Primary color of the "g"
  letterColorSecondary: string; // Gradient end / secondary
  dotColor: string;           // The dot after "g."
  background: string;         // Card/icon background
  isGradient: boolean;        // Whether the letter uses a gradient
  glowColor: string | null;   // Neon glow color (null = no glow)
  isPro: boolean;             // Requires Pro
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
    name: 'Pro Blue',
    tagline: 'Deep blue gradient with premium depth.',
    letterColor: '#1A56FF',
    letterColorSecondary: '#0A2AFF',
    dotColor: '#4A90FF',
    background: '#0A0F1E',
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
    background: '#1C1C1E',
    isGradient: true,
    glowColor: null,
    isPro: true,
  },
  {
    id: 'gold_elite',
    name: 'Gold Elite',
    tagline: 'Luxurious gold on obsidian black.',
    letterColor: '#D4AF37',
    letterColorSecondary: '#F5C842',
    dotColor: '#F5C842',
    background: '#0A0800',
    isGradient: true,
    glowColor: null,
    isPro: true,
  },
  {
    id: 'neon_future',
    name: 'Neon Future',
    tagline: 'Electric cyan glow on midnight dark.',
    letterColor: '#00F5FF',
    letterColorSecondary: '#00CFDD',
    dotColor: '#00F5FF',
    background: '#040D14',
    isGradient: false,
    glowColor: '#00F5FF',
    isPro: true,
  },
  {
    id: 'executive',
    name: 'Executive Minimal',
    tagline: 'Understated slate for the focused mind.',
    letterColor: '#3A3A4A',
    letterColorSecondary: '#52525B',
    dotColor: '#52525B',
    background: '#F0F0F5',
    isGradient: false,
    glowColor: null,
    isPro: true,
  },
];

export const DEFAULT_LOGO_ID: LogoVariantId = 'classic';

const STORAGE_KEY = '@groundwork_selected_logo_v1';

// ─── Store ────────────────────────────────────────────────────────────────────

interface LogoStoreState {
  selectedLogoId: LogoVariantId;
  isLoaded: boolean;
  setSelectedLogo: (id: LogoVariantId) => Promise<void>;
  loadSavedLogo: () => Promise<void>;
  getActiveVariant: () => LogoVariant;
}

// Zustand store for logo selection — persists to AsyncStorage, no cloud sync
export const useLogoStore = create<LogoStoreState>((set, get) => ({
  selectedLogoId: DEFAULT_LOGO_ID,
  isLoaded: false,

  // Saves the chosen logo ID to AsyncStorage so it persists between sessions
  setSelectedLogo: async (id: LogoVariantId) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
      set({ selectedLogoId: id });
    } catch (e) {
      console.warn('[LogoStore] Failed to persist logo selection:', e);
      // Keep in-session selection even if storage fails
      set({ selectedLogoId: id });
    }
  },

  // Loads the saved logo on app boot; falls back to default if none found or invalid
  loadSavedLogo: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Validate that saved id is still a valid variant
        const isValid = LOGO_VARIANTS.some((v) => v.id === saved);
        if (isValid) {
          set({ selectedLogoId: saved as LogoVariantId, isLoaded: true });
          return;
        }
      }
    } catch (e) {
      console.warn('[LogoStore] Failed to load saved logo, using default:', e);
    }
    set({ selectedLogoId: DEFAULT_LOGO_ID, isLoaded: true });
  },

  // Returns the currently active LogoVariant object (or the first/default one)
  getActiveVariant: () => {
    const { selectedLogoId } = get();
    return (
      LOGO_VARIANTS.find((v) => v.id === selectedLogoId) ??
      LOGO_VARIANTS[0]
    );
  },
}));
