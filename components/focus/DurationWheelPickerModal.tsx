import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { X, Clock } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

interface DurationWheelPickerModalProps {
  visible: boolean;
  initialMinutes: number;
  onClose: () => void;
  onConfirm: (totalMinutes: number) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_VERTICAL = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const HOURS_DATA = Array.from({ length: 13 }, (_, i) => i); // 0 to 12
const MINUTES_DATA = Array.from({ length: 60 }, (_, i) => i); // 0 to 59

const QUICK_SHORTCUTS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: '90m', minutes: 90 },
  { label: '120m', minutes: 120 },
];

export function DurationWheelPickerModal({
  visible,
  initialMinutes,
  onClose,
  onConfirm,
}: DurationWheelPickerModalProps) {
  const { theme, isDark } = useTheme();

  const [selectedHours, setSelectedHours] = useState(() => Math.floor(Math.max(1, initialMinutes) / 60));
  const [selectedMinutes, setSelectedMinutes] = useState(() => Math.max(1, initialMinutes) % 60);

  const hoursListRef = useRef<FlatList>(null);
  const minutesListRef = useRef<FlatList>(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible) {
      const clamped = Math.max(1, initialMinutes || 25);
      const h = Math.floor(clamped / 60);
      const m = clamped % 60;
      setSelectedHours(h);
      setSelectedMinutes(m);

      // Scroll lists to initial positions after render
      setTimeout(() => {
        hoursListRef.current?.scrollToOffset({
          offset: h * ITEM_HEIGHT,
          animated: false,
        });
        minutesListRef.current?.scrollToOffset({
          offset: m * ITEM_HEIGHT,
          animated: false,
        });
      }, 80);
    }
  }, [visible, initialMinutes]);

  const totalMinutes = selectedHours * 60 + selectedMinutes;
  const isZeroDuration = totalMinutes === 0;

  const handleScrollHours = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, HOURS_DATA.length - 1));
    if (clamped !== selectedHours) {
      hapticLight();
      setSelectedHours(clamped);
    }
  };

  const handleScrollMinutes = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, MINUTES_DATA.length - 1));
    if (clamped !== selectedMinutes) {
      hapticLight();
      setSelectedMinutes(clamped);
    }
  };

  const handleShortcutPress = (mins: number) => {
    hapticLight();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    setSelectedHours(h);
    setSelectedMinutes(m);
    hoursListRef.current?.scrollToOffset({
      offset: h * ITEM_HEIGHT,
      animated: true,
    });
    minutesListRef.current?.scrollToOffset({
      offset: m * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleConfirm = () => {
    hapticSuccess();
    const finalMinutes = Math.max(1, totalMinutes);
    onConfirm(finalMinutes);
    onClose();
  };

  // Formatted display readout: e.g. "1 hr 25 min" or "45 minutes"
  const formattedReadout = (() => {
    if (isZeroDuration) return '0 minutes (min 1m)';
    if (selectedHours === 0) return `${selectedMinutes} minutes`;
    if (selectedMinutes === 0) return `${selectedHours} ${selectedHours === 1 ? 'hour' : 'hours'}`;
    return `${selectedHours} hr ${selectedMinutes} min`;
  })();

  const renderHoursItem = ({ item, index }: { item: number; index: number }) => {
    const distance = Math.abs(index - selectedHours);
    const isSelected = distance === 0;
    const opacity = isSelected ? 1 : distance === 1 ? 0.45 : 0.2;
    const scale = isSelected ? 1.05 : 0.95;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          hapticLight();
          setSelectedHours(item);
          hoursListRef.current?.scrollToOffset({
            offset: item * ITEM_HEIGHT,
            animated: true,
          });
        }}
        style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
      >
        <Text
          style={[
            styles.wheelItemText,
            {
              color: isSelected ? theme.primaryText : theme.secondaryText,
              opacity,
              transform: [{ scale }],
              fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
            },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMinutesItem = ({ item, index }: { item: number; index: number }) => {
    const distance = Math.abs(index - selectedMinutes);
    const isSelected = distance === 0;
    const opacity = isSelected ? 1 : distance === 1 ? 0.45 : 0.2;
    const scale = isSelected ? 1.05 : 0.95;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          hapticLight();
          setSelectedMinutes(item);
          minutesListRef.current?.scrollToOffset({
            offset: item * ITEM_HEIGHT,
            animated: true,
          });
        }}
        style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
      >
        <Text
          style={[
            styles.wheelItemText,
            {
              color: isSelected ? theme.primaryText : theme.secondaryText,
              opacity,
              transform: [{ scale }],
              fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
            },
          ]}
        >
          {String(item).padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: theme.separator,
            },
          ]}
        >
          {/* Top Notch Bar */}
          <View style={styles.notchWrap}>
            <View style={[styles.notch, { backgroundColor: theme.separator }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
                Custom Duration
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                Scroll to dial exact session time
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: theme.separator }]}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
            >
              <X size={18} color={theme.primaryText} />
            </TouchableOpacity>
          </View>

          {/* Current Selection Display Card */}
          <View
            style={[
              styles.displayCard,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#F6F6F8',
                borderColor: theme.separator,
              },
            ]}
          >
            <Clock size={18} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.displayCardText, { color: theme.primaryText }]}>
              {formattedReadout}
            </Text>
          </View>

          {/* Column Header Labels */}
          <View style={styles.labelsRow}>
            <View style={styles.wheelColumn}>
              <Text style={[styles.columnLabel, { color: theme.secondaryText }]}>
                HOURS
              </Text>
            </View>
            <View style={{ width: 24 }} />
            <View style={styles.wheelColumn}>
              <Text style={[styles.columnLabel, { color: theme.secondaryText }]}>
                MINUTES
              </Text>
            </View>
          </View>

          {/* Dual Wheel Drum Picker Container */}
          <View style={styles.wheelsWrapper}>
            {/* Center Selection Indicator Strip */}
            <View
              pointerEvents="none"
              style={[
                styles.selectionHighlight,
                {
                  borderColor: theme.accent,
                  backgroundColor: theme.accent + '15',
                },
              ]}
            />

            {/* Column 1: Hours */}
            <View style={styles.wheelColumn}>
              <FlatList
                ref={hoursListRef}
                data={HOURS_DATA}
                keyExtractor={(item) => `hour_${item}`}
                renderItem={renderHoursItem}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
                onMomentumScrollEnd={handleScrollHours}
                onScrollEndDrag={handleScrollHours}
                initialNumToRender={13}
                style={{ height: WHEEL_HEIGHT }}
              />
            </View>

            {/* Column Separator Colon */}
            <View style={styles.colonWrap}>
              <Text style={[styles.colonText, { color: theme.secondaryText }]}>:</Text>
            </View>

            {/* Column 2: Minutes */}
            <View style={styles.wheelColumn}>
              <FlatList
                ref={minutesListRef}
                data={MINUTES_DATA}
                keyExtractor={(item) => `min_${item}`}
                renderItem={renderMinutesItem}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
                onMomentumScrollEnd={handleScrollMinutes}
                onScrollEndDrag={handleScrollMinutes}
                initialNumToRender={20}
                style={{ height: WHEEL_HEIGHT }}
              />
            </View>
          </View>

          {/* Quick Preset Shortcuts */}
          <View style={styles.shortcutsRow}>
            {QUICK_SHORTCUTS.map((sc) => {
              const isSelected = totalMinutes === sc.minutes;
              return (
                <TouchableOpacity
                  key={sc.label}
                  onPress={() => handleShortcutPress(sc.minutes)}
                  style={[
                    styles.shortcutChip,
                    { borderColor: isSelected ? theme.accent : theme.separator },
                    isSelected && { backgroundColor: theme.accent + '20' },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shortcutChipText,
                      {
                        color: isSelected ? theme.accent : theme.secondaryText,
                        fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                      },
                    ]}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: theme.separator }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.secondaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isZeroDuration}
              style={[
                styles.confirmBtn,
                { backgroundColor: theme.accent },
                isZeroDuration && { opacity: 0.5 },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                Set Duration
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    borderRadius: Platform.OS === 'web' ? 24 : 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 20 : 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  notchWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    display: Platform.OS === 'web' ? 'none' : 'flex',
  },
  notch: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  displayCardText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  wheelsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WHEEL_HEIGHT,
    position: 'relative',
    marginVertical: 4,
  },
  selectionHighlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PADDING_VERTICAL,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  colonWrap: {
    width: 24,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colonText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    includeFontPadding: false,
    textAlign: 'center',
  },
  wheelItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  wheelItemText: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  shortcutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  shortcutChipText: {
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  confirmBtn: {
    flex: 1.8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
