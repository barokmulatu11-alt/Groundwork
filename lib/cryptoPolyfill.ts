let Crypto: any = null;
try {
  Crypto = require('expo-crypto');
} catch (_) {}


declare const global: any;

// Polyfill Web Crypto API for React Native (Hermes / JSC)
// Packages like @neondatabase/auth and better-auth rely on global `crypto` and `crypto.randomUUID()`.

const targetGlobal: any =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : {};

function generateRandomUUID(): string {
  try {
    if (Crypto && typeof Crypto.randomUUID === 'function') {
      const id = Crypto.randomUUID();
      if (id) return id;
    }
  } catch (_) {
    // Native module might not be ready or available in current environment
  }

  // RFC4122 v4 UUID generator using cryptographically secure random bytes where possible
  try {
    const bytes = new Uint8Array(16);
    if (Crypto && typeof Crypto.getRandomValues === 'function') {
      Crypto.getRandomValues(bytes);
    } else if (targetGlobal.crypto && typeof targetGlobal.crypto.getRandomValues === 'function') {
      targetGlobal.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch (_) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function polyfillGetRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  try {
    if (Crypto && typeof Crypto.getRandomValues === 'function') {
      return Crypto.getRandomValues(array as any) as any;
    }
  } catch (_) {
    // Native module might not be ready
  }

  if ('BYTES_PER_ELEMENT' in (array as any)) {
    const uint8 = new Uint8Array(
      (array as any).buffer,
      (array as any).byteOffset,
      (array as any).byteLength
    );
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
}

if (!targetGlobal.crypto) {
  targetGlobal.crypto = {};
}

if (!targetGlobal.crypto.getRandomValues) {
  targetGlobal.crypto.getRandomValues = polyfillGetRandomValues;
}

if (!targetGlobal.crypto.randomUUID) {
  targetGlobal.crypto.randomUUID = generateRandomUUID;
}

// Ensure both global and globalThis (and window if present) expose the crypto object
if (typeof global !== 'undefined' && !(global as any).crypto) {
  (global as any).crypto = targetGlobal.crypto;
}
if (typeof globalThis !== 'undefined' && !(globalThis as any).crypto) {
  (globalThis as any).crypto = targetGlobal.crypto;
}
if (typeof window !== 'undefined' && !(window as any).crypto) {
  (window as any).crypto = targetGlobal.crypto;
}

export {};
