const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replaceInFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace imports
  if (content.includes('useSettingsStore') && !filePath.includes('settings.tsx') && !filePath.includes('ThemeContext.tsx')) {
    content = content.replace(/import { useSettingsStore } from '@\/store\/useSettingsStore';/g, "import { useTheme } from '@/context/ThemeContext';");
  } else if (filePath.includes('settings.tsx')) {
    if (!content.includes('useTheme')) {
      content = content.replace(/import { useSettingsStore } from '@\/store\/useSettingsStore';/, "import { useSettingsStore } from '@/store/useSettingsStore';\nimport { useTheme } from '@/context/ThemeContext';");
    }
  }

  // Replace variable declarations
  if (!filePath.includes('ThemeContext.tsx')) {
    content = content.replace(/const theme = useSettingsStore\(state => state\.theme\);\n\s*const isDark = theme === 'dark';\n\s*const textColor = isDark \? '#F2F2F7' : '#1C1C1E';\n\s*const (body|secondary)TextColor = isDark \? '#8E8E93' : '#AEAEB2';/g, "const { isDark, colors } = useTheme();\n  const textColor = colors.text;\n  const bodyTextColor = colors.textSecondary;");
    
    // Also specific cases
    content = content.replace(/const isDark = useSettingsStore\(state => state\.theme === 'dark'\);\n\s*const textColor = isDark \? '#F2F2F7' : '#1C1C1E';\n\s*const secondaryColor = isDark \? '#8E8E93' : '#AEAEB2';/g, "const { colors } = useTheme();\n  const textColor = colors.text;\n  const secondaryColor = colors.textSecondary;");
    
    content = content.replace(/const theme = useSettingsStore\(state => state\.theme\);\n\s*const isDark = theme === 'dark';/g, "const { isDark, colors } = useTheme();");
    
    content = content.replace(/const textColor = isDark \? '#F2F2F7' : '#1C1C1E';/g, "const textColor = colors.text;");
    content = content.replace(/const bodyTextColor = isDark \? '#8E8E93' : '#1C1C1E';/g, "const bodyTextColor = colors.textSecondary;");
    content = content.replace(/const bodyTextColor = isDark \? '#8E8E93' : '#AEAEB2';/g, "const bodyTextColor = colors.textSecondary;");
    
    // Replace settings.tsx specific row style
    if (filePath.includes('settings.tsx')) {
      content = content.replace(/backgroundColor: isDark \? 'rgba\(255,255,255,0\.06\)' : 'rgba\(255,255,255,0\.65\)'/g, "backgroundColor: colors.cardBg");
      content = content.replace(/borderColor: isDark \? 'rgba\(255,255,255,0\.08\)' : 'rgba\(255,255,255,0\.95\)'/g, "borderColor: colors.cardBorder");
      content = content.replace(/backgroundColor: isDark \? '#080C14' : '#FAF7F2'/g, "backgroundColor: colors.background");
    }

    if (filePath.includes('focus.tsx')) {
      content = content.replace(/const borderColor = isDark \? 'rgba\(255,255,255,0\.08\)' : 'rgba\(255,255,255,0\.65\)';/g, "const borderColor = colors.cardBorder;");
    }
    
    if (filePath.includes('recap.tsx')) {
      content = content.replace(/const borderColor = isDark \? 'rgba\(255,255,255,0\.08\)' : 'rgba\(255,255,255,0\.65\)';/g, "const borderColor = colors.cardBorder;");
    }

    if (filePath.includes('AddHabitSheet.tsx') || filePath.includes('AddTaskSheet.tsx')) {
      content = content.replace(/const bgColor = isDark \? '#080C14' : '#FAF7F2';/g, "const bgColor = colors.background;");
      content = content.replace(/const textColor = isDark \? '#F2F2F7' : '#1C1C1E';/g, "const textColor = colors.text;");
      content = content.replace(/const inputBg = isDark \? 'rgba\(255,255,255,0\.06\)' : 'rgba\(255,255,255,0\.65\)';/g, "const inputBg = colors.cardBg;");
      content = content.replace(/const inputBorder = isDark \? 'rgba\(255,255,255,0\.08\)' : 'rgba\(255,255,255,0\.95\)';/g, "const inputBorder = colors.cardBorder;");
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

walkDir(path.join(__dirname, 'app'), replaceInFile);
walkDir(path.join(__dirname, 'components'), replaceInFile);
