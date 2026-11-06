const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// ─── 1. Load Master Icon and Extract Normalized Glyph Mask ───────────────────────
const masterPath = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
const masterBuf = fs.readFileSync(masterPath);
const masterPng = PNG.sync.read(masterBuf);

// Bounding box in 1024x1024 master
const GLYPH_MIN_X = 419;
const GLYPH_MAX_X = 604;
const GLYPH_MIN_Y = 428;
const GLYPH_MAX_Y = 595;
const GLYPH_W = GLYPH_MAX_X - GLYPH_MIN_X + 1; // 186
const GLYPH_H = GLYPH_MAX_Y - GLYPH_MIN_Y + 1; // 168

// Extract 2D alpha mask of the glyph normalized to [0, 1]
const glyphMask = [];
for (let y = 0; y < GLYPH_H; y++) {
  const row = new Float32Array(GLYPH_W);
  for (let x = 0; x < GLYPH_W; x++) {
    const srcX = GLYPH_MIN_X + x;
    const srcY = GLYPH_MIN_Y + y;
    const idx = (masterPng.width * srcY + srcX) << 2;
    // Master background is (251, 249, 250), glyph is blue (0, 121, 251)
    const red = masterPng.data[idx];
    const alpha = Math.max(0, Math.min(1, (251 - red) / 251));
    row[x] = alpha;
  }
  glyphMask.push(row);
}
console.log(`Extracted glyph mask: ${GLYPH_W}x${GLYPH_H}`);

// Bilinear sampling from normalized glyph mask
function sampleGlyph(u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  const gx = u * (GLYPH_W - 1);
  const gy = v * (GLYPH_H - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, GLYPH_W - 1);
  const y1 = Math.min(y0 + 1, GLYPH_H - 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const top = glyphMask[y0][x0] * (1 - fx) + glyphMask[y0][x1] * fx;
  const bottom = glyphMask[y1][x0] * (1 - fx) + glyphMask[y1][x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

// ─── 2. Variant Visual Definitions ──────────────────────────────────────────────
const VARIANTS = {
  classic: {
    id: 'classic',
    bg: { r: 255, g: 255, b: 255 }, // Clean warm-white
    fg: { r: 0, g: 122, b: 255 },   // Groundwork Blue (#007AFF)
    hexBg: '#FFFFFF',
  },
  pro_blue: {
    id: 'pro_blue',
    bg: { r: 11, g: 21, b: 40 },    // Restrained deep blue (#0B1528)
    fg: { r: 47, g: 128, b: 237 },  // Bright vibrant Groundwork blue (#2F80ED)
    hexBg: '#0B1528',
  },
  dark_titanium: {
    id: 'dark_titanium',
    bg: { r: 28, g: 30, b: 36 },    // Deep charcoal (#1C1E24)
    fg: { r: 226, g: 232, b: 240 }, // Cool silver/metallic gray (#E2E8F0)
    hexBg: '#1C1E24',
  },
  gold_elite: {
    id: 'gold_elite',
    bg: { r: 14, g: 13, b: 11 },    // Obsidian near-black (#0E0D0B)
    fg: { r: 245, g: 197, b: 66 },  // Warm rich gold (#F5C542)
    hexBg: '#0E0D0B',
  },
  neon_future: {
    id: 'neon_future',
    bg: { r: 6, g: 11, b: 20 },     // Midnight cool dark (#060B14)
    fg: { r: 0, g: 242, b: 254 },   // Vivid crisp cyan (#00F2FE)
    hexBg: '#060B14',
  },
  executive: {
    id: 'executive',
    bg: { r: 237, g: 239, b: 242 }, // Soft light executive gray (#EDEFF2)
    fg: { r: 30, g: 41, b: 59 },    // Dark slate (#1E293B)
    hexBg: '#EDEFF2',
  },
};

// Android Density Configurations
const DENSITIES = {
  mdpi:    { launcher: 48,  adaptive: 108 },
  hdpi:    { launcher: 72,  adaptive: 162 },
  xhdpi:   { launcher: 96,  adaptive: 216 },
  xxhdpi:  { launcher: 144, adaptive: 324 },
  xxxhdpi: { launcher: 192, adaptive: 432 },
};

// ─── 3. Rendering Helpers ────────────────────────────────────────────────────────

// Render Adaptive Foreground (Transparent background, centered glyph)
function renderAdaptiveForeground(size, fgColor) {
  const png = new PNG({ width: size, height: size });
  // Target glyph size: 22% of canvas (matching original master logo proportion)
  const targetGlyphW = size * 0.22;
  const targetGlyphH = targetGlyphW * (GLYPH_H / GLYPH_W);
  const startX = (size - targetGlyphW) / 2;
  const startY = (size - targetGlyphH) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const u = (x - startX) / targetGlyphW;
      const v = (y - startY) / targetGlyphH;
      const alpha = sampleGlyph(u, v);

      if (alpha > 0.001) {
        png.data[idx] = fgColor.r;
        png.data[idx + 1] = fgColor.g;
        png.data[idx + 2] = fgColor.b;
        png.data[idx + 3] = Math.round(alpha * 255);
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }
  return png;
}

// Render Legacy Normal Launcher Icon (Solid background with smooth rounded corners)
function renderLegacyLauncher(size, bgColor, fgColor) {
  const png = new PNG({ width: size, height: size });
  // Target glyph size: 26% of canvas
  const targetGlyphW = size * 0.26;
  const targetGlyphH = targetGlyphW * (GLYPH_H / GLYPH_W);
  const startX = (size - targetGlyphW) / 2;
  const startY = (size - targetGlyphH) / 2;
  const cornerRadius = size * 0.20; // 20% squircle corner

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Calculate distance for rounded rectangle corner
      let cornerDist = 0;
      const cx = x < cornerRadius ? cornerRadius - x : x > size - 1 - cornerRadius ? x - (size - 1 - cornerRadius) : 0;
      const cy = y < cornerRadius ? cornerRadius - y : y > size - 1 - cornerRadius ? y - (size - 1 - cornerRadius) : 0;
      if (cx > 0 && cy > 0) {
        cornerDist = Math.sqrt(cx * cx + cy * cy);
      }
      const cornerAlpha = cornerDist > cornerRadius ? Math.max(0, 1 - (cornerDist - cornerRadius)) : 1;

      if (cornerAlpha <= 0) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Glyph sampling
      const u = (x - startX) / targetGlyphW;
      const v = (y - startY) / targetGlyphH;
      const glyphAlpha = sampleGlyph(u, v);

      // Blend glyph over background
      const r = Math.round(bgColor.r * (1 - glyphAlpha) + fgColor.r * glyphAlpha);
      const g = Math.round(bgColor.g * (1 - glyphAlpha) + fgColor.g * glyphAlpha);
      const b = Math.round(bgColor.b * (1 - glyphAlpha) + fgColor.b * glyphAlpha);

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = Math.round(cornerAlpha * 255);
    }
  }
  return png;
}

// Render Legacy Round Launcher Icon (Solid circular background with antialiased edge)
function renderLegacyRound(size, bgColor, fgColor) {
  const png = new PNG({ width: size, height: size });
  // Target glyph size: 24% of canvas
  const targetGlyphW = size * 0.24;
  const targetGlyphH = targetGlyphW * (GLYPH_H / GLYPH_W);
  const startX = (size - targetGlyphW) / 2;
  const startY = (size - targetGlyphH) / 2;
  const center = size / 2;
  const radius = (size / 2) - 0.75;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const circleAlpha = dist > radius ? Math.max(0, 1 - (dist - radius)) : 1;

      if (circleAlpha <= 0) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Glyph sampling
      const u = (x - startX) / targetGlyphW;
      const v = (y - startY) / targetGlyphH;
      const glyphAlpha = sampleGlyph(u, v);

      const r = Math.round(bgColor.r * (1 - glyphAlpha) + fgColor.r * glyphAlpha);
      const g = Math.round(bgColor.g * (1 - glyphAlpha) + fgColor.g * glyphAlpha);
      const b = Math.round(bgColor.b * (1 - glyphAlpha) + fgColor.b * glyphAlpha);

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = Math.round(circleAlpha * 255);
    }
  }
  return png;
}

// ─── 4. Main Generation Routine ─────────────────────────────────────────────────
async function main() {
  const resBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

  // Update colors.xml with exact variant background colors
  const colorsXmlPath = path.join(resBase, 'values', 'colors.xml');
  const colorsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="splashscreen_background">#ffffff</color>
  <color name="iconBackground">#ffffff</color>
  <color name="colorPrimary">#023c69</color>
  <color name="colorPrimaryDark">#ffffff</color>
  <color name="notification_icon_color">#007AFF</color>

  <color name="icon_bg_classic">#FFFFFF</color>
  <color name="icon_bg_pro_blue">#0B1528</color>
  <color name="icon_bg_dark_titanium">#1C1E24</color>
  <color name="icon_bg_gold_elite">#0E0D0B</color>
  <color name="icon_bg_neon_future">#060B14</color>
  <color name="icon_bg_executive">#EDEFF2</color>
</resources>
`;
  fs.writeFileSync(colorsXmlPath, colorsContent, 'utf8');
  console.log('Updated colors.xml with exact background color resources.');

  // Update mipmap-anydpi-v26 XMLs
  const anydpiDir = path.join(resBase, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

  for (const variant of Object.values(VARIANTS)) {
    const isClassic = variant.id === 'classic';
    const fgDrawable = isClassic ? '@mipmap/ic_launcher_foreground_classic' : `@mipmap/ic_launcher_foreground_${variant.id}`;
    const bgDrawable = `@color/icon_bg_${variant.id}`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="${bgDrawable}"/>
    <foreground android:drawable="${fgDrawable}"/>
</adaptive-icon>
`;
    if (isClassic) {
      fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), xml, 'utf8');
      fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), xml, 'utf8');
    }
    fs.writeFileSync(path.join(anydpiDir, `ic_launcher_${variant.id}.xml`), xml, 'utf8');
    fs.writeFileSync(path.join(anydpiDir, `ic_launcher_${variant.id}_round.xml`), xml, 'utf8');
  }
  console.log('Updated mipmap-anydpi-v26 adaptive icon XML definitions.');

  // Generate density mipmaps
  for (const [densityName, dims] of Object.entries(DENSITIES)) {
    const dir = path.join(resBase, `mipmap-${densityName}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Clean up old duplicate .webp files that conflict with .png
    const existingFiles = fs.readdirSync(dir);
    for (const f of existingFiles) {
      if (f.startsWith('ic_launcher') && f.endsWith('.webp')) {
        fs.unlinkSync(path.join(dir, f));
      }
    }

    for (const variant of Object.values(VARIANTS)) {
      const isClassic = variant.id === 'classic';

      // 1. Adaptive foreground
      const fgPng = renderAdaptiveForeground(dims.adaptive, variant.fg);
      const fgBuf = PNG.sync.write(fgPng);
      fs.writeFileSync(path.join(dir, `ic_launcher_foreground_${variant.id}.png`), fgBuf);
      if (isClassic) {
        fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);
      }

      // 2. Legacy normal launcher icon
      const normalPng = renderLegacyLauncher(dims.launcher, variant.bg, variant.fg);
      const normalBuf = PNG.sync.write(normalPng);
      fs.writeFileSync(path.join(dir, `ic_launcher_${variant.id}.png`), normalBuf);
      if (isClassic) {
        fs.writeFileSync(path.join(dir, 'ic_launcher.png'), normalBuf);
      }

      // 3. Legacy round launcher icon
      const roundPng = renderLegacyRound(dims.launcher, variant.bg, variant.fg);
      const roundBuf = PNG.sync.write(roundPng);
      fs.writeFileSync(path.join(dir, `ic_launcher_${variant.id}_round.png`), roundBuf);
      if (isClassic) {
        fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundBuf);
      }
    }
    console.log(`Generated all icons for density mipmap-${densityName}`);
  }

  console.log('Successfully generated all distinct production launcher icon assets!');
}

main().catch(console.error);
