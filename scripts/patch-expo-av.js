const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const expoAvDir = path.join(projectRoot, 'node_modules', 'expo-av');

if (!fs.existsSync(expoAvDir)) {
  console.log('[patch-expo-av] expo-av not found in node_modules, skipping.');
  process.exit(0);
}

console.log('[patch-expo-av] Applying compatibility patches to expo-av...');

// 1. expo-module.config.json: remove publication to force source compilation
const configPath = path.join(expoAvDir, 'expo-module.config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.android && config.android.publication) {
      delete config.android.publication;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      console.log('  -> Removed publication from expo-module.config.json');
    }
  } catch (e) {
    console.error('  Failed to update expo-module.config.json:', e.message);
  }
}

// 2. build.gradle: comment out externalNativeBuild
const buildGradlePath = path.join(expoAvDir, 'android', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  if (content.includes('externalNativeBuild {')) {
    content = content.replace(/externalNativeBuild\s*\{[\s\S]*?cmake\s*\{[\s\S]*?\}\s*\}/g, '// externalNativeBuild disabled');
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log('  -> Disabled externalNativeBuild in build.gradle');
  }
}

// 3. AVManager.java: wrap System.loadLibrary in try/catch and make mHybridData null-safe
const avManagerPath = path.join(expoAvDir, 'android', 'src', 'main', 'java', 'expo', 'modules', 'av', 'AVManager.java');
if (fs.existsSync(avManagerPath)) {
  let content = fs.readFileSync(avManagerPath, 'utf8');
  if (!content.includes('sNativeLibraryLoaded')) {
    content = content.replace(
      'static {\n    System.loadLibrary("expo-av");\n  }',
      `private static boolean sNativeLibraryLoaded = false;
  static {
    try {
      System.loadLibrary("expo-av");
      sNativeLibraryLoaded = true;
    } catch (Throwable t) {
      android.util.Log.w("AVManager", "Could not load libexpo-av native library", t);
    }
  }`
    );
    content = content.replace(
      'private final HybridData mHybridData = initHybrid();',
      'private final HybridData mHybridData = sNativeLibraryLoaded ? initHybrid() : null;'
    );
    fs.writeFileSync(avManagerPath, content, 'utf8');
    console.log('  -> Patched AVManager.java for safe native lib loading');
  }
}

// 4. ViewUtils.kt: resolve view without missing UIManager.resolveView
const viewUtilsPath = path.join(expoAvDir, 'android', 'src', 'main', 'java', 'expo', 'modules', 'av', 'ViewUtils.kt');
if (fs.existsSync(viewUtilsPath)) {
  let content = fs.readFileSync(viewUtilsPath, 'utf8');
  if (content.includes('import expo.modules.core.interfaces.services.UIManager')) {
    content = content.replace(
      'import expo.modules.core.interfaces.services.UIManager',
      'import expo.modules.core.interfaces.ActivityProvider'
    );
    content = content.replace(
      /val videoWrapperView = moduleRegistry\.getModule\(UIManager::class\.java\)\.resolveView\(viewTag\) as VideoViewWrapper\?/g,
      'val activity = moduleRegistry.getModule(ActivityProvider::class.java)?.currentActivity\n      val videoWrapperView = activity?.findViewById<VideoViewWrapper>(viewTag)'
    );
    content = content.replace(/catch \(e: IllegalViewOperationException\)/g, 'catch (e: Exception)');
    fs.writeFileSync(viewUtilsPath, content, 'utf8');
    console.log('  -> Patched ViewUtils.kt for UIManager compatibility');
  }
}

// 5. FullscreenVideoPlayer.java: remove KeepAwakeManager
const fullscreenPath = path.join(expoAvDir, 'android', 'src', 'main', 'java', 'expo', 'modules', 'av', 'video', 'FullscreenVideoPlayer.java');
if (fs.existsSync(fullscreenPath)) {
  let content = fs.readFileSync(fullscreenPath, 'utf8');
  if (content.includes('KeepAwakeManager')) {
    content = content.replace(/import expo\.modules\.core\.interfaces\.services\.KeepAwakeManager;\s*\n/g, '');
    content = content.replace(
      /AppContext appContext = fullscreenVideoPlayer\.mAppContext\.get\(\);[\s\S]*?fullscreenVideoPlayer\.mKeepScreenOnHandler\.postDelayed\(this, UPDATE_KEEP_SCREEN_ON_FLAG_MS\);/g,
      `if (isPlaying) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
          } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
          }
        }
        fullscreenVideoPlayer.mKeepScreenOnHandler.postDelayed(this, UPDATE_KEEP_SCREEN_ON_FLAG_MS);`
    );
    fs.writeFileSync(fullscreenPath, content, 'utf8');
    console.log('  -> Patched FullscreenVideoPlayer.java');
  }
}

console.log('[patch-expo-av] All patches applied successfully!');
