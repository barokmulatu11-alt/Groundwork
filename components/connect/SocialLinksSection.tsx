import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { CenterModal } from '@/components/ui/CenterModal';
import { SocialLinkButton } from '@/components/connect/SocialLinkButton';
import { useTheme } from '@/lib/ThemeContext';
import type { SocialLink } from '@/hooks/connect/useProfile';
import {
  SocialPlatformDef,
  detectPlatformFromUrl,
  getAvailablePlatforms,
  getPlatformDef,
  normalizePlatformId,
  normalizeSocialUrl,
} from '@/lib/socialPlatforms';
import { FontAwesome5 } from '@expo/vector-icons';
import { Link, Plus } from 'lucide-react-native';

const MAX_LINKS = 5;

interface SocialLinksSectionProps {
  links: SocialLink[];
  editable?: boolean;
  emptyMessage?: string;
  onAdd?: (platform: string, url: string) => Promise<void>;
  onDelete?: (linkId: string) => Promise<void>;
  cardBg: string;
  cardBorder: string;
}

export function SocialLinksSection({
  links,
  editable = false,
  emptyMessage,
  onAdd,
  onDelete,
  cardBg,
  cardBorder,
}: SocialLinksSectionProps) {
  const { theme, isDark, showAlert } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [picked, setPicked] = useState<SocialPlatformDef | null>(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => getAvailablePlatforms(links.map(l => l.platform)),
    [links]
  );

  const canAdd = editable && links.length < MAX_LINKS && available.length > 0;

  const openModal = () => {
    setPicked(available[0] ?? null);
    setUrl('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setPicked(null);
    setUrl('');
  };

  const handleSave = async () => {
    if (!picked || !onAdd) return;
    const normalized = normalizeSocialUrl(url);
    if (!normalized || normalized.length < 8) {
      showAlert({
        title: 'Invalid URL',
        message: 'Enter a valid link (e.g. github.com/username).',
        primaryButton: { text: 'OK', onPress: () => {} },
      });
      return;
    }
    const platformId =
      picked.id === 'website' ? detectPlatformFromUrl(normalized) : picked.id;
    if (links.some(l => normalizePlatformId(l.platform) === platformId)) {
      showAlert({
        title: 'Already added',
        message: `You already have a ${getPlatformDef(platformId).label} link.`,
        primaryButton: { text: 'OK', onPress: () => {} },
      });
      return;
    }
    setSaving(true);
    try {
      await onAdd(platformId, normalized);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Link size={15} color={theme.accent} />
          <Text style={[styles.title, { color: theme.primaryText }]}>Social Links</Text>
        </View>
        {canAdd ? (
          <Pressable onPress={openModal} style={[styles.addChip, { backgroundColor: theme.accent }]}>
            <Plus size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.addChipText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {links.length > 0 ? (
        <View style={styles.linksWrap}>
          {links.map(link => (
            <SocialLinkButton
              key={link.id}
              link={link}
              onDelete={editable && onDelete ? () => onDelete(link.id) : undefined}
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: theme.secondaryText }]}>
          {emptyMessage ??
            (editable
              ? 'Add GitHub, X, LinkedIn, and more so friends can find you.'
              : 'No social links yet.')}
        </Text>
      )}

      {editable && links.length >= MAX_LINKS ? (
        <Text style={[styles.limit, { color: theme.tertiaryText }]}>
          Maximum {MAX_LINKS} links
        </Text>
      ) : null}

      <CenterModal visible={modalOpen} onClose={closeModal} maxWidth={400}>
        <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Add social link</Text>
        <Text style={[styles.modalSub, { color: theme.secondaryText }]}>
          Pick a platform, then paste your profile URL.
        </Text>

        <Text style={[styles.fieldLbl, { color: theme.secondaryText }]}>PLATFORM</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.platformScroll}
        >
          {available.map(p => {
            const active = picked?.id === p.id;
            const iconColor = isDark && ['github', 'x', 'tiktok'].includes(p.id) ? p.iconOnDark : p.brandColor;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  setPicked(p);
                  if (!url) setUrl('');
                }}
                style={[
                  styles.platformChip,
                  {
                    backgroundColor: active ? p.brandColor + (isDark ? '40' : '18') : theme.card,
                    borderColor: active ? p.brandColor : theme.cardBorder,
                  },
                ]}
              >
                <FontAwesome5 name={p.icon} size={18} color={iconColor} brand />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter_700Bold',
                    color: active ? (isDark ? '#FFF' : p.brandColor) : theme.secondaryText,
                    marginTop: 4,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.fieldLbl, { color: theme.secondaryText }]}>URL</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder={picked?.placeholder ?? 'https://'}
          placeholderTextColor={theme.tertiaryText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[
            styles.input,
            {
              color: theme.primaryText,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: theme.cardBorder,
            },
          ]}
        />
        {picked ? (
          <Text style={[styles.hint, { color: theme.tertiaryText }]}>{picked.urlHint}</Text>
        ) : null}

        <View style={styles.modalActions}>
          <AnimatedButton title="Cancel" variant="ghost" onPress={closeModal} style={{ flex: 1 }} />
          <AnimatedButton
            title={saving ? 'Saving…' : 'Add link'}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </CenterModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addChipText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  linksWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  limit: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 8 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  fieldLbl: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  platformScroll: { gap: 8, paddingBottom: 16 },
  platformChip: {
    width: 72,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
  },
  hint: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
