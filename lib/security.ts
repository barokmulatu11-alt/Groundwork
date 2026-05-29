import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PIN_STORAGE_KEY = 'app_pin_hash';

export const SecurityUtils = {
  /**
   * Hashes a PIN using SHA-256
   */
  hashPin: async (pin: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
  },

  /**
   * Stores a PIN hash securely
   */
  savePin: async (pin: string): Promise<void> => {
    const hash = await SecurityUtils.hashPin(pin);
    await AsyncStorage.setItem(PIN_STORAGE_KEY, hash);
  },

  /**
   * Verifies a PIN against the stored hash
   */
  verifyPin: async (pin: string): Promise<boolean> => {
    const storedHash = await AsyncStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;
    const hash = await SecurityUtils.hashPin(pin);
    return hash === storedHash;
  },

  /**
   * Clears the stored PIN
   */
  clearPin: async (): Promise<void> => {
    await AsyncStorage.removeItem(PIN_STORAGE_KEY);
  },

  /**
   * Checks if MFA is enabled for the current user
   */
  getMFAStatus: async (): Promise<{ enabled: boolean; verified: boolean }> => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return { enabled: false, verified: false };
    
    const totpFactor = data.all.find(f => f.factor_type === 'totp');
    return {
      enabled: !!totpFactor,
      verified: totpFactor?.status === 'verified'
    };
  },

  /**
   * Starts the MFA enrollment process
   */
  enrollMFA: async () => {
    return await supabase.auth.mfa.enroll({ factorType: 'totp' });
  },

  /**
   * Challenges the user with an MFA code
   */
  challengeMFA: async (factorId: string) => {
    return await supabase.auth.mfa.challenge({ factorId });
  },

  /**
   * Verifies the MFA challenge
   */
  verifyMFA: async (factorId: string, challengeId: string, code: string) => {
    return await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
  }
};
