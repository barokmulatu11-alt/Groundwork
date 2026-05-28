# Groundwork PWA

This folder tracks the PWA work for the Groundwork app.

## Key files (at repo root)

- `public/manifest.webmanifest` — PWA manifest
- `public/sw.js` — service worker (offline caching)
- `public/icons/*` — app icons
- `app/+html.tsx` — references the manifest and registers the service worker

## Production export (for Vercel)

```bash
npm run export:web:pwa
```

This creates `dist/` and generates a precache service worker at `dist/sw.js` (from `pwa/generate-precache-sw.mjs`).

## Offline + data integrity

- The UI is the same as the mobile app because the PWA is the existing Expo web build.
- Data is stored locally in SQLite via `expo-sqlite` (`lib/db.ts`).
- The app already runs a bidirectional sync with Supabase when online (`store/useStore.ts` → `syncFromCloud`).

More notes: see `PWA.md` at repo root.
