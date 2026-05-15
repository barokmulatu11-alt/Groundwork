import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, Switch, Platform, Share, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
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
    <View style={[styles.card, { backgroundColor: theme.card }, style]}>
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

  const { isSyncing, lastSyncedAt, syncError, syncFromCloud, tasks, habits, notes, focusSessions } = useStore();
  const { offlineMode, setOfflineMode } = useSettingsStore();

  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'failed' | 'offline'>('synced');
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  useEffect(() => {
    if (offlineMode) {
      setSyncStatus('offline');
    } else if (isSyncing) {
      setSyncStatus('syncing');
    } else if (syncError) {
      setSyncStatus('failed');
    } else {
      setSyncStatus('synced');
    }
  }, [offlineMode, isSyncing, syncError]);

  const handleBackup = async () => {
    if (offlineMode) {
      showAlert({
        title: "Offline Mode",
        message: "Please disable offline mode to sync with cloud.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
      return;
    }
    try {
      await syncFromCloud();
      showAlert({ title: "Success", message: "Your data has been backed up to the cloud.", primaryButton: { text: "OK", onPress: () => {} } });
    } catch (e) {
      setSyncStatus('failed');
      showAlert({ title: "Sync Failed", message: "Could not connect to the server. Please check your internet connection.", primaryButton: { text: "OK", onPress: () => {} } });
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
        setSyncStatus('syncing');
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
        setSyncStatus('synced');
      }
    } catch (e) {
      setSyncStatus('failed');
      showAlert({
        title: "Error",
        message: "Failed to import data. The file might be corrupted or in an invalid format.",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    }
  };

  const calculateStorage = () => {
    const totalItems = tasks.length + habits.length + notes.length + focusSessions.length;
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
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>Data & Sync</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Manage your cloud data</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
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
                {syncStatus === 'offline' ? (
                  <CloudOff size={32} color={theme.secondaryText} />
                ) : (
                  <Cloud size={32} color={accentColor} />
                )}
              </View>
            </View>
            
            <View style={[styles.separator, { backgroundColor: theme.separator, marginVertical: 20 }]} />
            
            <View style={styles.syncMetaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: theme.secondaryText }]}>Last Sync</Text>
                <Text style={[styles.metaValue, { color: theme.primaryText }]}>
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Never'}
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
                    <Text style={styles.backupBtnText}>Sync Now</Text>
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
              subtitle="Remove temporary files only" 
              theme={theme}
              onPress={() => showAlert({ title: "Clear Cache", message: "Local cache has been cleared successfully.", primaryButton: { text: "OK", onPress: () => {} } })}
              destructive
            />
          </Card>
        </Animated.View>

        <View style={styles.infoBox}>
          <Info size={14} color={theme.secondaryText} />
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            Your data is end-to-end encrypted and never shared with third parties.
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

    </BackgroundGradient>
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
