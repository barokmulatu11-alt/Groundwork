const fs = require('fs');

const cardComponent = `
const Card = ({ children, theme }: { children: React.ReactNode; theme: any }) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
    {children}
  </View>
);

function SettingRow({ icon: Icon, title, subtitle, theme, onPress, destructive, rightElement }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
        <View style={styles.infoBox}>
          <Text style={[styles.rowTitle, { color: destructive ? theme.danger : theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {rightElement || <ChevronRight size={18} color={theme.tertiaryText} />}
      </View>
    </TouchableOpacity>
  );
}
`;

const cardStyles = `
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  rowWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  separator: {
    height: 1,
    marginLeft: 46,
    opacity: 0.5,
  },
`;

// Transform settings.tsx
let settings = fs.readFileSync('./app/settings.tsx', 'utf8');

settings = settings.replace(/<ActionRow\s+Icon=\{User\}\s+title="Account"\s+subtitle=\{session \? "Email, Password, Subscription" : "Sign in to sync your data"\}\s+onPress=\{[^\}]+\}\s*\/>/, 
  `<Card theme={theme}>\n          <SettingRow icon={User} title="Account" subtitle={session ? "Email, Password, Subscription" : "Sign in to sync your data"} theme={theme} onPress={() => { if (session) { router.push('/account-settings' as any); } else { router.push('/login' as any); } }} />\n        </Card>`);

settings = settings.replace(
  /<ActionRow\s+Icon=\{Sun\}\s+title="Appearance".*?\/>\s*<ActionRow\s+Icon=\{Zap\}\s+title="Productivity".*?\/>\s*<ActionRow\s+Icon=\{Bell\}\s+title="Notifications".*?\/>/s,
  `<Card theme={theme}>
          <SettingRow icon={Sun} title="Appearance" subtitle="Theme, accent color, font size" theme={theme} onPress={() => router.push('/appearance-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Zap} title="Productivity" subtitle="Priority, reminders, pomodoro, goals" theme={theme} onPress={() => router.push('/productivity-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Bell} title="Notifications" subtitle="Alerts, sounds, quiet hours" theme={theme} onPress={() => router.push('/notification-settings' as any)} />
        </Card>`
);

settings = settings.replace(
  /<ActionRow\s+Icon=\{RefreshCw\}\s+title="Data & Sync".*?\/>\s*<ActionRow\s+Icon=\{Shield\}\s+title="Privacy & Security".*?\/>/s,
  `<Card theme={theme}>
          <SettingRow icon={RefreshCw} title="Data & Sync" subtitle="Cloud backup, export, storage" theme={theme} onPress={() => router.push('/data-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Shield} title="Privacy & Security" subtitle="Biometrics, PIN, sessions" theme={theme} onPress={() => router.push('/privacy-settings' as any)} />
        </Card>`
);

// Add imports for ChevronRight
settings = settings.replace(/import {([^}]+)} from 'lucide-react-native';/, "import { ChevronRight, $1 } from 'lucide-react-native';");
settings = settings.replace("import { ActionRow } from '@/components/ui/ActionRow';", "");
settings = settings.replace("export default function SettingsScreen", cardComponent + "\n\nexport default function SettingsScreen");
settings = settings.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + cardStyles);
settings = settings.replace("borderRadius: 20", "borderRadius: 16"); // for logoutBtn

fs.writeFileSync('./app/settings.tsx', settings, 'utf8');
console.log("Updated settings.tsx");

// Transform more.tsx
let more = fs.readFileSync('./app/(tabs)/more.tsx', 'utf8');

more = more.replace(
  /<ActionRow\s+Icon=\{Download\}.*?\/>\s*<ActionRow\s+Icon=\{Award\}.*?\/>\s*<ActionRow\s+Icon=\{Share2\}.*?\/>\s*<ActionRow\s+Icon=\{MessageSquare\}.*?\/>/s,
  `<Card theme={theme}>
          <SettingRow icon={Download} title="Downloads" subtitle="Manage offline content" theme={theme} onPress={() => router.push('/downloads')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Award} title="Achievements" subtitle="View your earned badges" theme={theme} onPress={() => router.push('/achievements')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Share2} title="Invite Friends" subtitle="Earn rewards for referrals" theme={theme} onPress={handleInvite} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={MessageSquare} title="Send Feedback" subtitle="Report bugs or suggest features" theme={theme} onPress={handleFeedback} />
        </Card>`
);

more = more.replace(
  /<ActionRow\s+Icon=\{Heart\}.*?\/>\s*<ActionRow\s+Icon=\{Info\}.*?\/>/s,
  `<Card theme={theme}>
          <SettingRow icon={Heart} title="Support Developer" subtitle="Support the creator of groundwork." theme={theme} onPress={() => router.push('/support-settings')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Info} title="About groundwork." subtitle="Version, terms and information" theme={theme} onPress={() => router.push('/about' as any)} />
        </Card>`
);

more = more.replace(
  /<ActionRow\s+Icon=\{Globe\}.*?\/>\s*<ActionRow\s+Icon=\{Camera\}.*?\/>\s*<ActionRow\s+Icon=\{Send\}.*?\/>\s*<ActionRow\s+Icon=\{Code\}.*?\/>/s,
  `<Card theme={theme}>
          <SettingRow icon={Globe} title="Website" subtitle="groundwork.app" theme={theme} onPress={() => Linking.openURL('https://groundwork.app')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Camera} title="Instagram" subtitle="@groundwork.app" theme={theme} onPress={() => Linking.openURL('https://instagram.com/groundwork.app')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Send} title="Telegram Channel" subtitle="Updates and community" theme={theme} onPress={() => Linking.openURL('https://t.me/groundwork_app')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Code} title="GitHub" subtitle="View source code" theme={theme} onPress={() => Linking.openURL('https://github.com/barok-m-lakew/GroundWork')} />
        </Card>`
);

more = more.replace(/import {([^}]+)} from 'lucide-react-native';/, "import { ChevronRight, $1 } from 'lucide-react-native';");
more = more.replace("import { ActionRow } from '@/components/ui/ActionRow';", "");
more = more.replace("export default function MoreScreen", cardComponent + "\n\nexport default function MoreScreen");
more = more.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + cardStyles);

fs.writeFileSync('./app/(tabs)/more.tsx', more, 'utf8');
console.log("Updated more.tsx");

