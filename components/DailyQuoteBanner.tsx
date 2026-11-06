import { AppText as Text } from '@/components/ui/AppText';
import { CenterModal } from '@/components/ui/CenterModal';
import { useTheme } from '@/lib/ThemeContext';
import { hapticLight } from '@/lib/haptics';
import { INITIAL_QUOTES } from '@/store/useQuotesStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Quote as QuoteIcon, X, Share2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { getLocalDateString } from '@/lib/dateUtils';
import { GlobalShareSheet } from './GlobalShareSheet';

const STORAGE_KEY = '@groundwork_last_quote_shown_date';
const DISMISS_KEY = '@groundwork_quote_dismissed_date';

export function DailyQuoteBanner() {
  const { theme } = useTheme();
  const [quote, setQuote] = useState<{ text: string; author: string; category?: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const todayStr = getLocalDateString();
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed === todayStr) return;

        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const date = new Date().getDate();
        const dayStamp = Math.floor(new Date(year, month, date).getTime() / (1000 * 60 * 60 * 24));
        const index = dayStamp % INITIAL_QUOTES.length;
        const todayQuote = INITIAL_QUOTES[index];
        if (todayQuote) {
          setQuote({
            ...todayQuote,
            category: todayQuote.category || 'Inspiration',
          });
          setVisible(true);
          await AsyncStorage.setItem(STORAGE_KEY, todayStr);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const dismiss = async () => {
    const todayStr = getLocalDateString();
    await AsyncStorage.setItem(DISMISS_KEY, todayStr);
    setModalOpen(false);
    setVisible(false);
  };

  const openQuote = () => {
    hapticLight();
    setModalOpen(true);
  };

  const openShare = () => {
    hapticLight();
    setModalOpen(false);
    setShareOpen(true);
  };

  if (!visible || !quote) return null;

  return (
    <>
      <Animated.View entering={FadeInDown.duration(350)} exiting={FadeOutUp.duration(250)} style={styles.wrap}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Pressable onPress={openQuote} style={styles.cardBody}>
            <View style={[styles.iconBox, { backgroundColor: theme.accentLight }]}>
              <QuoteIcon size={16} color={theme.accent} />
            </View>
            <View style={styles.textCol}>
              <View style={styles.headerRow}>
                <Text style={[styles.label, { color: theme.accent }]}>Quote of the day · Tap to expand</Text>
              </View>
              <Text style={[styles.quote, { color: theme.primaryText }]} numberOfLines={3}>
                "{quote.text}"
              </Text>
              <Text style={[styles.author, { color: theme.secondaryText }]}>— {quote.author}</Text>
            </View>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={18} color={theme.secondaryText} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Expanded Modal view */}
      <CenterModal visible={modalOpen} onClose={() => setModalOpen(false)} maxWidth={380}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIcon, { backgroundColor: theme.accentLight }]}>
            <QuoteIcon size={28} color={theme.accent} />
          </View>
          <Text style={[styles.modalLabel, { color: theme.accent }]}>Quote of the day</Text>
          <Text style={[styles.modalQuote, { color: theme.primaryText }]}>
            "{quote.text}"
          </Text>
          <Text style={[styles.modalAuthor, { color: theme.secondaryText }]}>— {quote.author}</Text>
          
          <View style={styles.modalActionsRow}>
            <Pressable
              style={[
                styles.modalBtn,
                {
                  backgroundColor: theme.cardBorder,
                  flex: 1.5,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}
              onPress={() => setModalOpen(false)}
            >
              <Text style={[styles.modalBtnText, { color: theme.primaryText, fontFamily: 'Inter_700Bold', fontSize: 14 }]}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalIconBtn,
                {
                  backgroundColor: theme.accent,
                  flex: 1,
                  borderRadius: 14,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }
              ]}
              onPress={openShare}
            >
              <Share2 size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Share</Text>
            </Pressable>
          </View>
        </View>
      </CenterModal>

      {/* Premium Global Share Sheet */}
      <GlobalShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType="quote"
        contentData={quote}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  quote: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  author: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  closeBtn: { padding: 4 },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  modalQuote: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalAuthor: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});

