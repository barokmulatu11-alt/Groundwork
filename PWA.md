# Groundwork PWA (Web/Desktop)

Groundwork is already an Expo + expo-router app with web output enabled. This adds the missing PWA pieces (manifest + service worker + icons) so it can be installable on desktop.

## What was added

- `public/manifest.webmanifest` (PWA manifest)
- `public/sw.js` (service worker with offline caching)
- `public/icons/*` (192/512 + maskable icons)
- `app/+html.tsx` updated to:
  - reference the manifest
  - set `theme-color`
  - register the service worker

## Run locally (dev)

```bash
npm install
npm run web
```

Then open the web URL shown in the terminal.

## Build a static web export (recommended for hosting)

```bash
npm run export:web:pwa
```

This produces a static site (`dist/`) you can host (Vercel/Netlify/S3, etc.). It also generates a **precache** service worker inside `dist/sw.js` so the app can run offline immediately after install/first load.

## Vercel deployment notes

- Create a new Vercel project that points at this repo root.
- Set:
  - Build Command: `npm run export:web:pwa`
  - Output Directory: `dist`
- SPA routing is handled via the root `vercel.json` rewrite to `/index.html`.

## Notes / next steps

- Offline behavior:
  - The app works offline after install/first load. For production hosting, `npm run export:web:pwa` generates a precache service worker from the exported `dist/` files.
  - User data is stored locally in SQLite (`expo-sqlite`) and the app already has a bidirectional sync manager that pushes local changes to Supabase when online.
- If you use Supabase auth, confirm your “Site URL / Redirect URLs” include the PWA domain.
