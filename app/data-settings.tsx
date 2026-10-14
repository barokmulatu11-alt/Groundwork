import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, Switch, Platform, Share, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Cloud, 
  CloudOff, 
  CloudSync, 
  Database, 
  Download, 
  Upload, 
  HardDrive, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Trash2,
  Info,
  FileText
} from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

function Card({ children, theme, style }: { children: React.ReactNode; theme: any; style?: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }, style]}>
      {children}
    </View>
  );
}

interface SettingRowProps {
  icon: any;
  title: string;
  subtitle?: string;
  theme: any;
  children?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingRow({ icon: Icon, title, subtitle, theme, children, onPress, destructive }: SettingRowProps) {
  const content = (
    <View style={styles.settingRowContainer}>
      <View style={styles.settingHeader}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: destructive ? theme.danger : theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DataSyncSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;

  const { syncStatus: storeSyncStatus, lastSyncedAt, syncPartialFailures, syncFromCloud, tasks, habits, notes, focusSessions } = useStore();
  const { offlineMode, setOfflineMode } = useSettingsStore();
  const { session, isGuest } = useAuthStore();

  // Derive the display-level status from the authoritative store field.
  // 'local_guest' and 'offline' are session/setting overrides; otherwise use storeSyncStatus.
  const syncStatus = (() => {
    if (isGuest || !session) return 'local_guest' as const;
    if (offlineMode) return 'offline' as const;
    if (storeSyncStatus === 'idle' && !lastSyncedAt) return 'never_synced' as const;
    if (storeSyncStatus === 'idle') return 'synced' as const; // has prior timestamp, first render before sync fires
    if (storeSyncStatus === 'syncing') return 'syncing' as const;
    if (storeSyncStatus === 'failed') return 'failed' as const;
    if (storeSyncStatus === 'partial') return 'partial' as const;
    if (storeSyncStatus === 'synced') return 'synced' as const;
    return !lastSyncedAt ? 'never_synced' as const : 'synced' as const;
  })();

  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    if (isClearingCache) return;
    setIsClearingCache(true);
    try {
      if (Platform.OS !== 'web') {
        const FileSystem = await import('expo-file-system/legacy');
        if (FileSystem.cacheDirectory) {
          const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
          for (const file of files) {
            try {
              await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
            } catch (_) {}
          }
        }
      } else {
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.clear();
          }
        } catch (_) {}
      }
      showAlert({
        title: "Clear Cache",
        message: "Temporary cache files cleared successfully. Your tasks, habits, and settings are preserved.",
        primaryButton: { text: "OK", onPress: () => {} },
      });
    } catch (e) {
      showAlert({
        title: "Clear Cache",
        message: "Failed to clear cache. Please try again.",
        primaryButton: { text: "OK", onPress: () => {} },
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleBackup = async () => {
    if (isGuest || !session) {
      showAlert({
        title: "Account Required",
        message: "Cloud sync is available for registered accounts. Create a free account or sign in to sync your data across devices.",
        primaryButton: { text: "Sign In / Register", onPress: () => router.push('/login' as any) },
        secondaryButton: { text: "Keep Working Offline", onPress: () => {} }
      });
      return;
    }
    if (offlineMode) {
      showAlert({
        title: "Offline Mode Active",
        message: "Please disable offline mode below to sync with the cloud.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
      return;
    }
    try {
      const result = await syncFromCloud();
      if (result?.skipped) {
        showAlert({
          title: "Sync Skipped",
          message: result.reason || "Please sign in to sync with the cloud.",
          primaryButton: { text: "OK", onPress: () => {} }
        });
        return;
      }

      if (result?.partial) {
        // Store's syncStatus is already set to 'partial' by syncFromCloud.
        const failedItems = result.partialFailures && result.partialFailures.length > 0
          ? result.partialFailures.join(', ')
          : 'some items';
        showAlert({
          title: "Sync Partially Completed",
          message: `Some items (${failedItems}) could not be uploaded to the cloud. The previous successful backup timestamp was preserved. Tap Retry Sync to upload remaining items.`,
          primaryButton: { text: "Retry Sync", onPress: () => handleBackup() },
          secondaryButton: { text: "Dismiss", onPress: () => {} }
        });
        return;
      }

      if (!result?.success) {
        // Store's syncStatus is already set to 'failed' by syncFromCloud.
        showAlert({
          title: "Sync Failed",
          message: result?.error || "Could not connect to the server. Please check your network connection.",
          primaryButton: { text: "Retry", onPress: () => handleBackup() },
          secondaryButton: { text: "Dismiss", onPress: () => {} }
        });
        return;
      }

      // Store's syncStatus is already set to 'synced' by syncFromCloud.
      showAlert({
        title: "Sync Complete",
        message: "Your data has been successfully backed up to the cloud.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    } catch (e: any) {
      // Store's syncStatus is already set to 'failed' by syncFromCloud's catch block.
      showAlert({
        title: "Sync Failed",
        message: e?.message || "Could not connect to the server. Please check your internet connection.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    
    let contentToShare = '';
    
    if (format === 'json') {
      const data = {
        tasks,
        habits,
        notes,
        focusSessions,
        settings: useSettingsStore.getState(),
        exportedAt: new Date().toISOString(),
        version: '1.1.0'
      };
      contentToShare = JSON.stringify(data, null, 2);
    } else {
      contentToShare += '--- TASKS ---\n';
      contentToShare += 'ID,Title,Date,Completed,Priority\n';
      tasks.forEach(t => {
        contentToShare += `${t.id},"${t.title.replace(/"/g, '""')}","${t.date}",${t.completed},${t.priority}\n`;
      });
      
      contentToShare += '\n--- HABITS ---\n';
      contentToShare += 'ID,Title,Streak,Frequency\n';
      habits.forEach(h => {
        contentToShare += `${h.id},"${h.title.replace(/"/g, '""')}",${h.streak},${h.frequency}\n`;
      });
      
      contentToShare += '\n--- NOTES ---\n';
      contentToShare += 'ID,Title\n';
      notes.forEach(n => {
        contentToShare += `${n.id},"${n.title.replace(/"/g, '""')}"\n`;
      });
      
      contentToShare += '\n--- PRODUCTIVITY (FOCUS SESSIONS) ---\n';
      contentToShare += 'ID,Mode,Duration (min),Date\n';
      focusSessions.forEach(f => {
        contentToShare += `${f.id},${f.mode},${f.duration_minutes},${f.created_at}\n`;
      });
    }
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const mimeType = format === 'json' ? 'application/json' : 'text/csv';
        const blob = new Blob([contentToShare], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `groundwork-backup-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert({
          title: "Export Downloaded",
          message: `Your ${format.toUpperCase()} backup file has been saved to your downloads.`,
          primaryButton: { text: "OK", onPress: () => {} }
        });
        return;
      } catch (err) {
        console.warn('[DataExport] Web download failed, falling back:', err);
      }
    }

    try {
      await Share.share({
        message: contentToShare,
        title: `groundwork. Data Backup (${format.toUpperCase()})`
      });
    } catch (e) {
      // Fallback to clipboard
      await Clipboard.setStringAsync(contentToShare);
      showAlert({
        title: "Exported",
        message: "Data copied to clipboard (Sharing was unavailable).",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    }
  };

  const handleImport = async () => {
    setShowImportConfirm(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const text = await response.text();
        const data = JSON.parse(text);

        await useStore.getState().importData(data);
        
        showAlert({
          title: "Import Successful",
          message: "Data has been successfully merged.",
          primaryButton: { text: "OK", onPress: () => {} }
        });
      }
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Failed to import data. The file might be corrupted or in an invalid format.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    }
  };

  const calculateStorage = () => {
    const totalItems = tasks.length + habits.length + focusSessions.length;
    const estimatedSize = (totalItems * 0.5).toFixed(1); // Rough estimate in KB
    return `${estimatedSize} KB (${totalItems} items)`;
  };

  // Sync animation
  const spin = useSharedValue(0);
  useEffect(() => {
    if (syncStatus === 'syncing') {
      spin.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
    } else {
      spin.value = 0;
    }
  }, [syncStatus]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }]
  }));

  const renderSyncStatus = () => {
    switch (syncStatus) {
      case 'local_guest':
        return (
          <View style={styles.statusBadge}>
            <HardDrive size={14} color={accentColor} />
            <Text style={[styles.statusText, { color: accentColor }]}>Local Only (Guest)</Text>
          </View>
        );
      case 'syncing':
        return (
          <View style={styles.statusBadge}>
            <Animated.View style={spinStyle}>
              <RefreshCw size={14} color={accentColor} />
            </Animated.View>
            <Text style={[styles.statusText, { color: accentColor }]}>Syncing...</Text>
          </View>
        );
      case 'synced':
        return (
          <View style={styles.statusBadge}>
            <CheckCircle2 size={14} color={theme.success} />
            <Text style={[styles.statusText, { color: theme.success }]}>Synced</Text>
          </View>
        );
      case 'partial':
        return (
          <View style={styles.statusBadge}>
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={[styles.statusText, { color: '#F59E0B' }]}>Partially Synced</Text>
          </View>
        );
      case 'never_synced':
        return (
          <View style={styles.statusBadge}>
            <CloudOff size={14} color={theme.tertiaryText} />
            <Text style={[styles.statusText, { color: theme.secondaryText }]}>Never Synced</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={styles.statusBadge}>
            <AlertCircle size={14} color={theme.danger} />
            <Text style={[styles.statusText, { color: theme.danger }]}>Failed</Text>
          </View>
        );
      case 'offline':
        return (
          <View style={styles.statusBadge}>
            <CloudOff size={14} color={theme.secondaryText} />
            <Text style={[styles.statusText, { color: theme.secondaryText }]}>Offline</Text>
          </View>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -1 }}>
            Data & sync.
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Backups, import and cloud sync.
          </Text>
        </View>
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* ── CLOUD SYNC ─────────────────────────────── */}
          <SectionLabel label="CLOUD SYNC" theme={theme} />
          <Card theme={theme} style={styles.syncCard}>
            <View style={styles.syncStatusHeader}>
              <View style={styles.syncInfoMain}>
                <Text style={[styles.syncStatusLabel, { color: theme.secondaryText }]}>Current Status</Text>
                {renderSyncStatus()}
              </View>
              <View style={[styles.cloudIconContainer, { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.05)' }]}>
                {syncStatus === 'offline' || syncStatus === 'local_guest' ? (
                  <CloudOff size={32} color={theme.secondaryText} />
                ) : (
                  <Cloud size={32} color={accentColor} />
                )}
              </View>
            </View>
            
            <View style={[styles.separator, { backgroundColor: theme.separator, marginVertical: 20 }]} />
            
            <View style={styles.syncMetaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: theme.secondaryText }]}>
                  {syncStatus === 'partial' ? 'Last Full Sync' : 'Last Sync'}
                </Text>
                <Text style={[styles.metaValue, { color: theme.primaryText }]}>
                  {syncStatus === 'local_guest'
                    ? 'Local Only (No Cloud)'
                    : lastSyncedAt
                    ? new Date(lastSyncedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                    : syncStatus === 'partial'
                    ? 'Pending full sync'
                    : 'Never'}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.backupBtn, { backgroundColor: accentColor }]} 
                onPress={handleBackup}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <RefreshCw size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.backupBtnText}>
                      {syncStatus === 'local_guest' ? 'Connect Cloud' : syncStatus === 'partial' ? 'Retry Sync' : 'Sync Now'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          {/* ── DATA MANAGEMENT ────────────────────────── */}
          <SectionLabel label="DATA MANAGEMENT" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={FileJson} 
              title="Export as JSON" 
              subtitle="Generate a full backup of everything" 
              theme={theme}
              onPress={() => handleExport('json')}
            />

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={FileText} 
              title="Export as CSV" 
              subtitle="Generate a spreadsheet-friendly backup" 
              theme={theme}
              onPress={() => handleExport('csv')}
            />

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Download} 
              title="Import Data" 
              subtitle="Restore from a previous backup" 
              theme={theme}
              onPress={() => setShowImportConfirm(true)}
            />

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={CloudOff} 
              title="Offline Mode" 
              subtitle="Stop syncing with cloud servers" 
              theme={theme}
            >
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {/* ── STORAGE ────────────────────────── */}
          <SectionLabel label="STORAGE" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={HardDrive} 
              title="Local Usage" 
              subtitle={calculateStorage()} 
              theme={theme}
            />
            
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Trash2} 
              title="Clear Local Cache" 
              subtitle={isClearingCache ? "Clearing temporary files..." : "Remove temporary files only"} 
              theme={theme}
              onPress={handleClearCache}
              destructive
            />
          </Card>
        </Animated.View>

        <View style={styles.infoBox}>
          <Info size={14} color={theme.secondaryText} />
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            Your data is transmitted over secure HTTPS connections and stored locally on your device or in your cloud database.
          </Text>
        </View>

      </ScrollView>



      <ConfirmDialog
        visible={showImportConfirm}
        title="Import Data"
        message="Importing data will MERGE it with your current local data. This action cannot be easily undone."
        onConfirm={handleImport}
        onCancel={() => setShowImportConfirm(false)}
        confirmText="Import"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    
    
    
    
    
  },
  syncCard: {
    padding: 24,
  },
  syncStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncInfoMain: {
    flex: 1,
  },
  syncStatusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  cloudIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    
    
    
    
    
  },
  backupBtnText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  settingRowContainer: {
    paddingVertical: 8,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginVertical: 12,
    opacity: 0.05,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    lineHeight: 18,
  }
});
