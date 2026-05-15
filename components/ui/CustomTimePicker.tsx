import { AppText as Text } from '@/components/ui/AppText';
import React, { useRef, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Platform, TextInput, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface PickerProps {
  items: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  width?: number;
}

const ITEM_HEIGHT = 60;
const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const CustomTimePicker: React.FC<PickerProps> = ({ items, selectedValue, onValueChange, width = 75 }) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const isInternal = useRef(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isInternal.current && !isEditing) {
      const index = items.indexOf(selectedValue);
      if (index !== -1) {
        // Force instant jump, no animation to prevent bouncing
        scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      }
    }
    isInternal.current = false;
  }, [selectedValue, isEditing]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isEditing) return;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < items.length) {
      const value = items[index];
      if (value !== selectedValue) {
        isInternal.current = true;
        onValueChange(value);
      }
    }
  };

  const adjust = (direction: 'up' | 'down') => {
    const currentIndex = items.indexOf(selectedValue);
    let nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < items.length) {
      onValueChange(items[nextIndex]);
    }
  };

  const handleManualInput = (val: string) => {
    const num = parseInt(val) || 0;
    const max = items.length - 1;
    const finalVal = Math.min(Math.max(0, num), max).toString();
    onValueChange(finalVal);
    setIsEditing(false);
  };

  return (
    <View style={{ width, alignItems: 'center' }}>
      <Pressable onPress={() => adjust('up')} style={{ paddingVertical: 10, opacity: 0.5 }}>
        <ChevronUp size={20} color={theme.accent} />
      </Pressable>

      <View style={{ height: ITEM_HEIGHT, width, overflow: 'hidden' }}>
        {!isEditing ? (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={onScrollEnd}
            scrollEventThrottle={16}
            disableIntervalMomentum={true}
            bounces={false}
            overScrollMode="never"
            style={{ height: ITEM_HEIGHT }}
          >
            {items.map((item, index) => {
              const isSelected = item === selectedValue;
              return (
                <Pressable 
                  key={index} 
                  onPress={() => isSelected && setIsEditing(true)}
                  style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={{
                    fontSize: isSelected ? 32 : 20,
                    fontWeight: isSelected ? '800' : '500',
                    color: isSelected ? theme.accent : theme.secondaryText,
                    fontFamily: MONO_FONT,
                    letterSpacing: isSelected ? -1 : 0,
                  }}>
                    {item.padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              autoFocus
              keyboardType="number-pad"
              maxLength={2}
              defaultValue={selectedValue.padStart(2, '0')}
              onBlur={() => setIsEditing(false)}
              onSubmitEditing={(e) => handleManualInput(e.nativeEvent.text)}
              style={{
                fontSize: 32,
                fontWeight: '800',
                color: theme.accent,
                fontFamily: MONO_FONT,
                textAlign: 'center',
                width: '100%',
                letterSpacing: -1,
                padding: 0,
                margin: 0
              }}
            />
          </View>
        )}
        <View style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.accentLight,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.accentBorder,
          pointerEvents: 'none',
          zIndex: -1
        }} />
      </View>

      <Pressable onPress={() => adjust('down')} style={{ paddingVertical: 10, opacity: 0.5 }}>
        <ChevronDown size={20} color={theme.accent} />
      </Pressable>
    </View>
  );
};
