/**
 * Audio Storage Utility for Groundwork
 * Resolves browser ephemeral blob URL issues by persisting raw audio Blobs in IndexedDB on web,
 * and standard FileSystem paths on native platforms.
 * 
 * Supports:
 * - Persistent storage across browser refresh and restart
 * - Active Object URL regeneration upon note load
 * - Cloud synchronization upload when authenticated
 */

import { Platform } from 'react-native';

const DB_NAME = 'groundwork_media_db';
const STORE_NAME = 'audio_recordings';
const DB_VERSION = 1;

// Cache active object URLs in memory for the current page session: storedKey -> activeBlobUrl
const activeUrlCache = new Map<string, string>();

/** Open IndexedDB on web */
function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists an audio recording Blob in durable browser storage.
 * Returns a permanent ID (`gw_audio_<timestamp>_<id>`) and a currently active playback URL.
 */
export async function saveAudioRecording(
  audioData: Blob | string,
  filenamePrefix: string = 'recording'
): Promise<{ permanentId: string; playbackUrl: string }> {
  if (Platform.OS === 'web') {
    let blob: Blob;

    if (typeof audioData === 'string') {
      if (audioData.startsWith('blob:')) {
        // Fetch the blob from the temporary URL before it gets revoked
        const res = await fetch(audioData);
        blob = await res.blob();
      } else if (audioData.startsWith('data:')) {
        const res = await fetch(audioData);
        blob = await res.blob();
      } else {
        // Already a remote URL
        return { permanentId: audioData, playbackUrl: audioData };
      }
    } else {
      blob = audioData;
    }

    const id = `gw_audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const db = await openMediaDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({
          id,
          blob,
          mimeType: blob.type || 'audio/webm',
          createdAt: new Date().toISOString(),
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      const playbackUrl = URL.createObjectURL(blob);
      activeUrlCache.set(id, playbackUrl);

      return { permanentId: id, playbackUrl };
    } catch (err) {
      console.warn('[AudioStorage] IndexedDB save failed, falling back to data URL:', err);
      // Fallback: convert to base64 data URL
      const dataUrl = await blobToDataUrl(blob);
      return { permanentId: dataUrl, playbackUrl: dataUrl };
    }
  }

  // Native: audioData is a local file URI (e.g. file:///...)
  const uri = typeof audioData === 'string' ? audioData : '';
  return { permanentId: uri, playbackUrl: uri };
}

/**
 * Resolves a stored audio URI (permanent ID, remote URL, or old blob URL) into a valid, playable URL.
 * If stored in IndexedDB, regenerates an active Object URL if needed.
 */
export async function resolveAudioPlaybackUrl(storedUri: string): Promise<string> {
  if (!storedUri) return '';

  // Remote HTTPS URLs or Data URLs are directly playable
  if (storedUri.startsWith('http://') || storedUri.startsWith('https://') || storedUri.startsWith('data:')) {
    return storedUri;
  }

  // Native file URIs
  if (Platform.OS !== 'web' || storedUri.startsWith('file://') || storedUri.startsWith('content://')) {
    return storedUri;
  }

  // Check active session cache first
  if (activeUrlCache.has(storedUri)) {
    return activeUrlCache.get(storedUri)!;
  }

  // If it's a permanent IndexedDB key or cached storage URI in IndexedDB:
  if (Platform.OS === 'web' && (storedUri.startsWith('gw_audio_') || storedUri.startsWith('supabase-storage:'))) {
    try {
      const db = await openMediaDb();
      const record = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(storedUri);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (record && record.blob) {
        const freshUrl = URL.createObjectURL(record.blob);
        activeUrlCache.set(storedUri, freshUrl);
        return freshUrl;
      }
    } catch (err) {
      console.warn('[AudioStorage] Failed to resolve audio from IndexedDB:', err);
    }
  }

  // If it's a cloud storage URI requiring authenticated access (e.g. second device)
  if (storedUri.startsWith('supabase-storage:')) {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Private recordings require authenticated access
      if (!sessionData?.session?.user) {
        console.warn('[AudioStorage] Access denied: private recording requires authenticated user session.');
        return '';
      }

      const match = storedUri.match(/^supabase-storage:([^/]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const filePath = match[2];
        const { data: signedData, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);

        if (!signErr && signedData?.signedUrl) {
          activeUrlCache.set(storedUri, signedData.signedUrl);

          // Asynchronously cache the blob in local IndexedDB for future offline playback
          if (Platform.OS === 'web') {
            fetch(signedData.signedUrl)
              .then((r) => (r.ok ? r.blob() : null))
              .then(async (blob) => {
                if (blob) {
                  try {
                    const db = await openMediaDb();
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    tx.objectStore(STORE_NAME).put({
                      id: storedUri,
                      blob,
                      mimeType: blob.type || 'audio/webm',
                      createdAt: new Date().toISOString(),
                    });
                  } catch (_) {}
                }
              })
              .catch(() => {});
          }

          return signedData.signedUrl;
        }
      }
    } catch (err) {
      console.warn('[AudioStorage] Failed to generate signed URL for private recording:', err);
    }
  }

  return storedUri;
}

/**
 * Deletes an audio recording from durable storage when deleted by the user.
 */
export async function deleteAudioRecording(storedUri: string): Promise<void> {
  if (Platform.OS === 'web' && (storedUri.startsWith('gw_audio_') || storedUri.startsWith('supabase-storage:'))) {
    try {
      // Revoke any active session object URL
      if (activeUrlCache.has(storedUri)) {
        URL.revokeObjectURL(activeUrlCache.get(storedUri)!);
        activeUrlCache.delete(storedUri);
      }

      const db = await openMediaDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(storedUri);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[AudioStorage] Failed to delete audio from IndexedDB:', e);
    }
  }
}

/**
 * Uploads durable local audio to Supabase / S3 storage for cloud sync.
 * Preserves local audio until upload succeeds, updates note references safely,
 * and keeps private recordings behind authenticated access.
 */
export async function syncAudioToCloud(
  storedUri: string,
  userId: string
): Promise<string | null> {
  if (!userId || userId === 'guest') return null;
  // If already a cloud storage URI, return it directly
  if (storedUri.startsWith('supabase-storage:') || storedUri.startsWith('https://') || storedUri.startsWith('http://')) {
    return storedUri;
  }

  try {
    const { supabase } = await import('@/lib/supabase');
    let blobData: Blob | null = null;

    if (Platform.OS === 'web') {
      if (storedUri.startsWith('gw_audio_')) {
        const db = await openMediaDb();
        const record = await new Promise<any>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(storedUri);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (record?.blob) blobData = record.blob;
      }
    } else {
      const response = await fetch(storedUri);
      blobData = await response.blob();
    }

    if (!blobData) return null;

    const mimeType = blobData.type || 'audio/webm';
    let ext = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) {
      ext = 'm4a';
    } else if (mimeType.includes('wav')) {
      ext = 'wav';
    } else if (mimeType.includes('ogg')) {
      ext = 'ogg';
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      ext = 'mp3';
    } else if (mimeType.includes('webm')) {
      ext = 'webm';
    } else if (typeof storedUri === 'string' && storedUri.includes('.')) {
      const match = storedUri.match(/\.([a-zA-Z0-9]+)$/);
      if (match) ext = match[1];
    }

    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filePath = `${userId}/audio_${Date.now()}_${randomSuffix}.${ext}`;

    const { error } = await supabase.storage
      .from('notes')
      .upload(filePath, blobData, { contentType: mimeType, upsert: true });

    if (!error) {
      const cloudRef = `supabase-storage:notes/${filePath}`;

      // Preserve local audio: store an alias in IndexedDB under the cloud reference
      // so local playback continues without re-downloading or network dependency
      if (Platform.OS === 'web') {
        try {
          const db = await openMediaDb();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({
            id: cloudRef,
            blob: blobData,
            mimeType: blobData.type || 'audio/webm',
            createdAt: new Date().toISOString(),
          });
          // Cache the active playback URL for this cloud reference
          if (activeUrlCache.has(storedUri)) {
            activeUrlCache.set(cloudRef, activeUrlCache.get(storedUri)!);
          }
        } catch (e) {
          console.warn('[AudioStorage] Failed to cache local alias for cloud recording:', e);
        }
      }

      return cloudRef;
    } else {
      console.warn('[AudioStorage] Storage upload error:', error.message);
    }
  } catch (err) {
    console.warn('[AudioStorage] Cloud audio sync skipped or unavailable:', err);
  }

  // Upload did not succeed: return null to preserve local URI safely
  return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
