import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

const PIN_STORAGE_KEY = 'app_pin_hash';

// Utility object for app security — PIN hashing/storage, MFA enrollment and verification
export const SecurityUtils = {
  // Hashes a plain-text PIN using SHA-256 so it's never stored in the clear
  hashPin: async (pin: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
  },

  // Saves a hashed PIN to AsyncStorage for secure local auth
  savePin: async (pin: string): Promise<void> => {
    const hash = await SecurityUtils.hashPin(pin);
    await AsyncStorage.setItem(PIN_STORAGE_KEY, hash);
  },

  // Checks a PIN against the stored hash. Falls back to the old plain-text
  // storage for users who set their PIN before hashing was introduced.
  verifyPin: async (pin: string): Promise<boolean> => {
    // Primary: check hashed PIN in AsyncStorage
    const storedHash = await AsyncStorage.getItem(PIN_STORAGE_KEY);
    if (storedHash) {
      const hash = await SecurityUtils.hashPin(pin);
      if (hash === storedHash) return true;
    }
    // Fallback: check raw PIN stored in settings store (for users who set PIN before hashing was introduced)
    try {
      const { useSettingsStore } = require('@/store/useSettingsStore');
      const appPin = useSettingsStore.getState().appPin;
      if (appPin && appPin === pin) {
        // Upgrade to hashed storage
        await SecurityUtils.savePin(pin);
        return true;
      }
    } catch (_) {}
    return false;
  },

  // Removes the stored PIN hash from AsyncStorage
  clearPin: async (): Promise<void> => {
    await AsyncStorage.removeItem(PIN_STORAGE_KEY);
  },

  // Checks whether the current user has MFA (TOTP) enabled and verified
  getMFAStatus: async (): Promise<{ enabled: boolean; verified: boolean; supported: boolean }> => {
    try {
      const authMfa = (supabase.auth as any)?.mfa;
      if (!authMfa || typeof authMfa.listFactors !== 'function') {
        // Active auth provider (Neon Auth) does not provide TOTP MFA
        return { enabled: false, verified: false, supported: false };
      }
      const { data, error } = await authMfa.listFactors();
      if (error || !data || !Array.isArray(data.all)) {
        return { enabled: false, verified: false, supported: true };
      }
      
      const totpFactor = data.all.find((f: any) => f.factor_type === 'totp');
      return {
        enabled: Boolean(totpFactor),
        verified: totpFactor?.status === 'verified',
        supported: true,
      };
    } catch (_) {
      return { enabled: false, verified: false, supported: false };
    }
  },

  // Starts TOTP-based MFA enrollment for the current user
  enrollMFA: async () => {
    const authMfa = (supabase.auth as any)?.mfa;
    if (!authMfa || typeof authMfa.enroll !== 'function') {
      return { data: null, error: new Error('Two-factor authentication is not supported by the active authentication provider.') };
    }
    return await authMfa.enroll({ factorType: 'totp' });
  },

  // Sends an MFA challenge for the given factor (generates a one-time code)
  challengeMFA: async (factorId: string) => {
    const authMfa = (supabase.auth as any)?.mfa;
    if (!authMfa || typeof authMfa.challenge !== 'function') {
      return { data: null, error: new Error('Two-factor authentication is not supported by the active authentication provider.') };
    }
    return await authMfa.challenge({ factorId });
  },

  // Verifies the MFA code provided by the user against the challenge
  verifyMFA: async (factorId: string, challengeId: string, code: string) => {
    const authMfa = (supabase.auth as any)?.mfa;
    if (!authMfa || typeof authMfa.verify !== 'function') {
      return { data: null, error: new Error('Two-factor authentication is not supported by the active authentication provider.') };
    }
    return await authMfa.verify({
      factorId,
      challengeId,
      code,
    });
  }
};
