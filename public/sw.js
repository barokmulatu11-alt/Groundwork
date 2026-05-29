/* eslint-disable no-restricted-globals */
// AUTO-GENERATED FILE (pwa/generate-precache-sw.mjs)
// Do not edit dist/sw.js by hand; edit public/sw.js for dev behavior or change the generator.

const CACHE_NAME = 'groundwork-pwa-precache-v2';
const PRECACHE = [
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/_expo/.routes.json",
  "/_expo/static/css/web-c9e323bdf469727f3ff3b49e7fea741f.css",
  "/_expo/static/js/web/entry-72bd40e808af0e3f7184e71fcd351da0.js",
  "/_expo/static/js/web/worker-9682892338add432ac29d447446e91db.js",
  "/_sitemap.html",
  "/(tabs)/connect/index.html",
  "/(tabs)/connect/user-profile.html",
  "/(tabs)/courses.html",
  "/(tabs)/index.html",
  "/(tabs)/more.html",
  "/+not-found.html",
  "/about.html",
  "/account-settings.html",
  "/achievements.html",
  "/appearance-settings.html",
  "/assets/node_modules/@expo-google-fonts/inter/100Thin_Italic/Inter_100Thin_Italic.1b97f7df9b976cfe530c18c09598e6f6.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/100Thin/Inter_100Thin.ddbb1cd55ad509e82377bd10beed6506.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/200ExtraLight_Italic/Inter_200ExtraLight_Italic.3d0662838915a7a16d01c262735d3d29.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/200ExtraLight/Inter_200ExtraLight.e1f33daee21eb5998b13d3e05264d9a3.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/300Light_Italic/Inter_300Light_Italic.17f8f23a2852bfa14ce5bf590c2a0e2c.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/300Light/Inter_300Light.d2994e3dea3856e1834395ad6cce32af.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/400Regular_Italic/Inter_400Regular_Italic.36cad9f97595b7759264b945d64502b4.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.51b6ad87261f18b6433ec52871ddfabc.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/500Medium_Italic/Inter_500Medium_Italic.155406bfbfb023eb104728edfe62c0e9.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.137ab18bace28dd0bd83eb3b8ed2bc54.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/600SemiBold_Italic/Inter_600SemiBold_Italic.a349d1ac188e1a67689432f44de99849.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.a5f35888d2da465de352e0dcfaf33324.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/700Bold_Italic/Inter_700Bold_Italic.3398006c80026f0508aaaf4808950d56.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.6e237de4f1f413afa2fcc45c77ac343a.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/800ExtraBold_Italic/Inter_800ExtraBold_Italic.7ca909a56537d965feef41abe58b87e0.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.6016034293c084aa0c056e83938bf1cc.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/900Black_Italic/Inter_900Black_Italic.d5f78c24de59ce5e4bad405e10e71941.ttf",
  "/assets/node_modules/@expo-google-fonts/inter/900Black/Inter_900Black.bcec6eda9700a81ba92c483a2f2c02c1.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.3f78af31cca60105799838a1a7a59fbd.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.31b5ffea3daddc69dd01a1f3d6cf63c5.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.140c53a7643ea949007aa9a282153849.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.3b89dd103490708d19a95adcae52210e.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.1f77739ca9ff2188b539c36f30ffa2be.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.605ed7926cf39a2ad5ec2d1f9d391d3d.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.56c8d80832e37783f12c05db7c8849e2.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.370dd5af19f8364907b6e2c41f45dbbf.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.adec7d6f310bc577f05e8fe06a5daccf.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.b49ae8ab2dbccb02c4d11caaacf09eab.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.e20945d7c929279ef7a6f1db184a4470.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.871378c6eab492a3e689a9385dc45a12.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.d2285965fe34b05465047401b8595dd0.ttf",
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.1681f34aaca71b8dfb70756bca331eb2.ttf",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png",
  "/assets/node_modules/@react-navigation/elements/lib/module/assets/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png",
  "/assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png",
  "/assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png",
  "/assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png",
  "/assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png",
  "/assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png",
  "/assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png",
  "/assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png",
  "/assets/node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.783a2e11efab57e42036efde040ea8fd.wasm",
  "/calendar.html",
  "/change-password.html",
  "/connect/index.html",
  "/connect/user-profile.html",
  "/courses.html",
  "/data-settings.html",
  "/downloads.html",
  "/edit-profile.html",
  "/favicon.ico",
  "/focus.html",
  "/forgot-password.html",
  "/habits.html",
  "/health.html",
  "/login.html",
  "/modal.html",
  "/more.html",
  "/notes/[id].html",
  "/notes/index.html",
  "/notification-settings.html",
  "/permissions_onboarding.html",
  "/permissions_settings.html",
  "/privacy-settings.html",
  "/productivity-settings.html",
  "/recap.html",
  "/settings.html",
  "/signup.html",
  "/subscription-settings.html",
  "/support-settings.html",
  "/tasks/index.html",
  "/tasks/task-detail.html",
  "/welcome.html"
];

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
