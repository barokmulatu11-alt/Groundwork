import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const distDir = path.join(projectRoot, 'dist');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function toUrl(filePath) {
  // Convert "dist\_expo\static\..." -> "/_expo/static/..."
  const rel = path.relative(distDir, filePath).split(path.sep).join('/');
  return '/' + rel;
}

function buildSw(precacheUrls) {
  const precacheList = JSON.stringify(precacheUrls, null, 2);

  return `/* eslint-disable no-restricted-globals */
// AUTO-GENERATED FILE (pwa/generate-precache-sw.mjs)
// Do not edit dist/sw.js by hand; edit public/sw.js for dev behavior or change the generator.

const CACHE_NAME = 'groundwork-pwa-precache-v1';
const PRECACHE = ${precacheList};

const isCacheableResponse = (res) =>
  res && res.status === 200 && (res.type === 'basic' || res.type === 'default');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache everything needed for offline usage after install.
      await cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only same-origin; never cache Supabase (cross-origin) here.
  if (url.origin !== self.location.origin) return;

  // SPA navigation fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Keep index fresh when online
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Precached assets: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (isCacheableResponse(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
`;
}

async function main() {
  if (!(await exists(distDir))) {
    throw new Error(`dist folder not found at: ${distDir}\nRun: npx expo export -p web`);
  }

  const files = await walk(distDir);
  const urls = files
    .filter((f) => {
      const rel = path.relative(distDir, f).split(path.sep).join('/');
      // Don't precache the service worker itself.
      if (rel === 'sw.js') return false;
      // Keep list clean.
      if (rel.endsWith('.DS_Store')) return false;
      return true;
    })
    .map(toUrl);

  // Ensure we cache index.html for navigation fallback.
  if (!urls.includes('/index.html') && (await exists(path.join(distDir, 'index.html')))) {
    urls.unshift('/index.html');
  }

  // Put small, important files first (makes failures more obvious).
  urls.sort((a, b) => {
    const score = (u) =>
      u === '/index.html' ? 0 :
      u === '/manifest.webmanifest' ? 1 :
      u.startsWith('/icons/') ? 2 :
      u.startsWith('/_expo/') ? 3 : 4;
    return score(a) - score(b) || a.localeCompare(b);
  });

  const swPath = path.join(distDir, 'sw.js');
  await fs.writeFile(swPath, buildSw(urls), 'utf8');
  console.log(`[PWA] Wrote precache service worker: ${swPath}`);
  console.log(`[PWA] Precache entries: ${urls.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

