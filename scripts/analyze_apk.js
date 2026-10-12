const { execSync } = require('child_process');
const aapt = 'C:\\Users\\HP\\AppData\\Local\\Android\\Sdk\\build-tools\\35.0.0\\aapt.exe';

function analyze(apk) {
  console.log(`\n--- Analyzing ${apk} ---`);
  const out = execSync(`"${aapt}" list -v "${apk}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  const lines = out.split('\n');
  const dirs = {};
  const libAbis = {};

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 8) {
      const size = parseInt(parts[0], 10);
      const name = parts[parts.length - 1];
      if (!isNaN(size) && name) {
        const topDir = name.split('/')[0];
        dirs[topDir] = (dirs[topDir] || 0) + size;
        if (name.startsWith('lib/')) {
          const abi = name.split('/')[1];
          libAbis[abi] = (libAbis[abi] || 0) + size;
        }
      }
    }
  }

  for (const [k, v] of Object.entries(dirs)) {
    console.log(`  ${k}: ${(v / (1024 * 1024)).toFixed(2)} MB`);
  }
  console.log('  Native ABIs in lib/:');
  for (const [k, v] of Object.entries(libAbis)) {
    console.log(`    ${k}: ${(v / (1024 * 1024)).toFixed(2)} MB`);
  }
}

analyze('gw-v1.2.1.apk');
analyze('groundwork-release.apk');
