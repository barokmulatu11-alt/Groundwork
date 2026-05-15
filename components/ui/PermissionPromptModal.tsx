import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { openSettings } from '@/lib/permissions';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface PermissionPromptModalProps {
  emoji: string;
  title: string;
  reason: string;
  isPermanentlyDenied?: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export const PermissionPromptModal = forwardRef<BottomSheet, PermissionPromptModalProps>(({ 
  emoji, title, reason, isPermanentlyDenied, onAllow, onCancel 
}, ref) => {
  const { theme, isDark } = useTheme();
  const snapPoints = useMemo(() => ['35%'], []);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.secondaryText }}
    >
      <BottomSheetView style={styles.content}>
        <View style={[styles.emojiCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>

        <Text style={[styles.title, { color: theme.primaryText }]}>
          {isPermanentlyDenied ? 'Action Required' : title}
        </Text>
        
        <Text style={[styles.reason, { color: theme.secondaryText }]}>
          {isPermanentlyDenied 
            ? 'Please enable this permission in your phone settings to continue.' 
            : reason}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity 
            onPress={isPermanentlyDenied ? openSettings : onAllow} 
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.primaryButtonText}>
              {isPermanentlyDenied ? 'Open Settings' : 'Allow Access'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onCancel} style={[styles.secondaryButton]}>
            <Text style={[styles.secondaryButtonText, { color: theme.secondaryText }]}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', padding: 24 },
  emojiCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emojiText: { fontSize: 32, fontFamily: 'System', },
  title: { fontSize: 20, fontFamily: 'System', fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  reason: { fontSize: 14, fontFamily: 'System', fontWeight: '600', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  actions: { width: '100%', gap: 12 },
  primaryButton: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: 'white', fontSize: 16, fontFamily: 'System', fontWeight: '800' },
  secondaryButton: { height: 40, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'System', fontWeight: '700' }
});



