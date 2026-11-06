import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export const AppText = React.forwardRef<RNText, TextProps>((props, ref) => {
  const { fontSize } = useSettingsStore();
  const scale = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.15 : 1;
  
  let flatStyle = StyleSheet.flatten(props.style || {}) as any;
  if (!flatStyle || !flatStyle.fontFamily) {
    flatStyle = { fontFamily: 'Inter_400Regular', ...(flatStyle || {}) };
  }

  if (scale !== 1) {
    if (flatStyle && flatStyle.fontSize) {
      flatStyle = {
        ...flatStyle,
        fontSize: flatStyle.fontSize * scale,
        lineHeight: flatStyle.lineHeight ? flatStyle.lineHeight * scale : undefined,
      };
    } else {
      flatStyle = { ...flatStyle, fontSize: 14 * scale };
    }
  }
  
  return <RNText ref={ref} {...props} style={flatStyle} />;
});


