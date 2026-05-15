const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\HP\\Desktop\\Groundwork\\app\\login.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `  async function signInWithEmail() {
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Check if user was previously a guest and migrate data
    const { isGuest } = await import('@/store/useAuthStore').then(m => ({ isGuest: m.useAuthStore.getState().isGuest }));
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Sign In Failed', error.message);
      setErrors({ email: error.message });
    } else if (data.user) {
      // Migrate guest data to new user account
      if (isGuest) {
        migrateGuestData('guest', data.user.id);
        await import('@/store/useAuthStore').then(m => m.useAuthStore.getState().setIsGuest(false));
      }
      router.replace('/' as any);
    }
    setLoading(false);
  }
`;

// Find where validateForm ends and React.useEffect starts
const validateFormEnd = content.indexOf('return Object.keys(newErrors).length === 0;');
const useEffectStart = content.indexOf('React.useEffect(() => {');

if (validateFormEnd !== -1 && useEffectStart !== -1) {
    const before = content.substring(0, validateFormEnd + 'return Object.keys(newErrors).length === 0;\n  };'.length);
    const after = content.substring(useEffectStart);
    const newContent = before + '\n\n' + replacement + '\n' + after;
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed login.tsx');
} else {
    console.log('Could not find markers');
}
