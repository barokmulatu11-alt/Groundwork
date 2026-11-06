const fs = require('fs');
const path = require('path');

const variants = ['pro_blue', 'dark_titanium', 'gold_elite', 'neon_future', 'executive'];
const densities = ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

densities.forEach(density => {
  const dir = path.join('android', 'app', 'src', 'main', 'res', 'mipmap-' + density);
  const srcLauncher = path.join(dir, 'ic_launcher.webp');
  const srcRound = path.join(dir, 'ic_launcher_round.webp');
  
  if (fs.existsSync(srcLauncher)) {
    variants.forEach(v => {
      fs.copyFileSync(srcLauncher, path.join(dir, 'ic_launcher_' + v + '.webp'));
    });
  }
  if (fs.existsSync(srcRound)) {
    variants.forEach(v => {
      fs.copyFileSync(srcRound, path.join(dir, 'ic_launcher_' + v + '_round.webp'));
    });
  }
});

const anydpiDir = path.join('android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
variants.forEach(v => {
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/icon_bg_${v}"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, `ic_launcher_${v}.xml`), xmlContent, 'utf8');
  fs.writeFileSync(path.join(anydpiDir, `ic_launcher_${v}_round.xml`), xmlContent, 'utf8');
});

console.log('Mipmaps generated successfully');
