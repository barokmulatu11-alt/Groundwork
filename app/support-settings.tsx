import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  AtSign,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  Heart,
  HelpCircle,
  Info,
  Mail,
  MessageCircle,
  Share2,
  Star
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Linking, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}>
      {children}
    </View>
  );
}

interface SupportRowProps {
  icon: any;
  title: string;
  subtitle?: string;
  theme: any;
  onPress: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
}

function SupportRow({ icon: Icon, title, subtitle, theme, onPress, destructive, rightElement }: SupportRowProps) {
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SupportAboutScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const version = Constants.expoConfig?.version || '1.1.0';

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out groundwork. - The ultimate daily focus companion! Download it now at https://groundwork.app`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleRate = () => {
    showAlert({
      title: 'Rate App',
      message: 'Redirecting to Play Store... Thank you for your support!',
      primaryButton: { text: 'OK', onPress: () => { } }
    });
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert({
          title: "Error",
          message: "Could not open this link on your device.",
          primaryButton: { text: "OK", onPress: () => { } }
        });
      }
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Something went wrong while trying to open the link.",
        primaryButton: { text: "OK", onPress: () => { } }
      });
    }
  };

  return (
    <BackgroundGradient>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        <TabHeader title="Support & Contact" subtitle="Help, feedback and information" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ABOUT SECTION ─────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.aboutCardContainer}>
          <Card theme={theme}>
            <View style={styles.aboutHeader}>
              <View style={styles.aboutInfo}>
                <BrandLogo fontSize={24} />
                <Text style={[styles.appVersion, { color: theme.secondaryText, marginTop: 4 }]}>Version {version}</Text>
              </View>
            </View>
            <Text style={[styles.appDescription, { color: theme.secondaryText }]}>
              groundwork. is a premium productivity companion designed to help you stay focused, manage tasks, and build meaningful habits with ease.
            </Text>
            <View style={{ height: 16 }} />
            <View style={styles.attributionRow}>
              <Text style={[styles.builtBy, { color: theme.tertiaryText }]}>Developed by</Text>
              <TouchableOpacity onPress={() => openLink('https://v0-barok-labs.vercel.app/')}>
                <Text style={[styles.companyName, { color: theme.accent }]}>Barok Labs</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          {/* ── DONATE / SUPPORT ─────────────────────────────── */}
          <SectionLabel label="SUPPORT THE DEVELOPER" theme={theme} />
          <Card theme={theme}>
            <SupportRow
              icon={Heart}
              title="Telebirr"
              subtitle="+251935008069"
              theme={theme}
              onPress={() => handleCopy("+251935008069", "Telebirr")}
              rightElement={copiedLabel === 'Telebirr' ? <CheckCircle2 size={18} color={theme.success} /> : <Copy size={18} color={theme.tertiaryText} />}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={Heart}
              title="CBE Birr / Bank"
              subtitle="1000750283784"
              theme={theme}
              onPress={() => handleCopy("1000750283784", "CBE")}
              rightElement={copiedLabel === 'CBE' ? <CheckCircle2 size={18} color={theme.success} /> : <Copy size={18} color={theme.tertiaryText} />}
            />
          </Card>
          {copiedLabel && (
            <Animated.Text entering={FadeIn} style={[styles.copyMessage, { color: theme.success }]}>
              Copied {copiedLabel} number!
            </Animated.Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {/* ── HELP & FEEDBACK ─────────────────────────────── */}
          <SectionLabel label="HELP & FEEDBACK" theme={theme} />
          <Card theme={theme}>
            <SupportRow
              icon={HelpCircle}
              title="Help Center"
              subtitle="Browse tutorials and FAQs"
              theme={theme}
              onPress={() => openLink('https://v0-barok-labs.vercel.app/help')}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={Mail}
              title="Email Support"
              subtitle="Get direct assistance"
              theme={theme}
              onPress={() => openLink('mailto:barok.m.lakew@gmail.com')}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={MessageCircle}
              title="Telegram Support"
              subtitle="Quick chat with us"
              theme={theme}
              onPress={() => openLink('https://t.me/b_rey123')}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={Bug}
              title="Report a Bug"
              subtitle="Help us fix issues"
              theme={theme}
              onPress={() => openLink('mailto:barok.m.lakew@gmail.com?subject=groundwork. Bug Report')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          {/* ── SPREAD THE WORD ────────────────────────── */}
          <SectionLabel label="SPREAD THE WORD" theme={theme} />
          <Card theme={theme}>
            <SupportRow
              icon={Star}
              title="Rate groundwork."
              subtitle="Show your support on the store"
              theme={theme}
              onPress={handleRate}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={Share2}
              title="Share with Friends"
              subtitle="Invite others to join"
              theme={theme}
              onPress={handleShare}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          {/* ── CONNECT ────────────────────────── */}
          <SectionLabel label="CONNECT" theme={theme} />
          <Card theme={theme}>
            <SupportRow
              icon={Globe}
              title="Visit Website"
              theme={theme}
              onPress={() => openLink('https://v0-barok-labs.vercel.app/')}
            />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SupportRow
              icon={AtSign}
              title="Follow Updates"
              subtitle="Stay tuned for new features"
              theme={theme}
              onPress={() => openLink('https://t.me/barok_labs')}
            />
          </Card>
        </Animated.View>

        <View style={styles.footerBranding}>
          <Info size={14} color={theme.tertiaryText} style={{ marginBottom: 8 }} />
          <Text style={[styles.footerText, { color: theme.tertiaryText }]}>
            2026 Barok Labs. All rights reserved.
          </Text>
        </View>

      </ScrollView>
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
  aboutCardContainer: {
    marginTop: 12,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: 'white',
  },
  aboutInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  appDescription: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  builtBy: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  rowWrapper: {
    paddingVertical: 12,
  },
  rowContent: {
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
  infoBox: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    opacity: 0.7,
  },
  separator: {
    height: 1,
    opacity: 0.05,
  },
  footerBranding: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  copyMessage: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginTop: 8,
  }
});
