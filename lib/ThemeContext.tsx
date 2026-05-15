import React, { createContext, useContext, useState } from 'react'
import { useColorScheme } from 'react-native'
import { useSettingsStore } from '@/store/useSettingsStore'
export const lightTheme = {
  isDark: false,
  background: '#FAF7F2',
  backgroundGradientStart: '#FAF7F2',
  backgroundGradientEnd: '#F0EDE8',
  card: 'rgba(255,255,255,0.65)',
  cardBorder: 'rgba(255,255,255,0.95)',
  cardSolid: '#FFFFFF',
  primaryText: '#1C1C1E',
  secondaryText: '#AEAEB2',
  tertiaryText: '#C7C7CC',
  accent: '#007AFF',
  accentLight: 'rgba(0,122,255,0.08)',
  accentBorder: 'rgba(0,122,255,0.2)',
  success: '#34C759',
  successLight: 'rgba(52,199,89,0.08)',
  warning: '#FF9500',
  warningLight: 'rgba(255,149,0,0.08)',
  danger: '#FF3B30',
  dangerLight: 'rgba(255,59,48,0.08)',
  separator: 'rgba(0,0,0,0.06)',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  inputBackground: 'rgba(255,255,255,0.65)',
  inputBorder: 'rgba(255,255,255,0.95)',
  tabBar: 'rgba(255,255,255,0.7)',
  tabBarBorder: 'rgba(0,0,0,0.05)',
  blob1: 'rgba(0,122,255,0.07)',
  blob2: 'rgba(0,122,255,0.07)',
  skeletonBase: 'rgba(0,0,0,0.06)',
  skeletonHighlight: 'rgba(0,0,0,0.03)',
  switchTrackFalse: '#E5E5EA',
  switchTrackTrue: '#007AFF',
  switchThumb: '#FFFFFF',
  checkboxBorder: '#007AFF',
  checkboxFill: '#007AFF',
  pillActive: '#007AFF',
  pillInactive: 'rgba(255,255,255,0.65)',
  pillInactiveBorder: 'rgba(255,255,255,0.95)',
  pillInactiveText: '#1C1C1E',
  statusBar: 'dark-content' as 'dark-content',
}

export const darkTheme = {
  isDark: true,
  background: '#080C14',
  backgroundGradientStart: '#080C14',
  backgroundGradientEnd: '#0d1525',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardSolid: '#111827',
  primaryText: '#F2F2F7',
  secondaryText: '#8E8E93',
  tertiaryText: '#636366',
  accent: '#007AFF',
  accentLight: 'rgba(0,122,255,0.15)',
  accentBorder: 'rgba(0,122,255,0.3)',
  success: '#34C759',
  successLight: 'rgba(52,199,89,0.15)',
  warning: '#FF9500',
  warningLight: 'rgba(255,149,0,0.15)',
  danger: '#FF3B30',
  dangerLight: 'rgba(255,59,48,0.15)',
  separator: 'rgba(255,255,255,0.06)',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  inputBackground: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.08)',
  tabBar: 'rgba(0,0,0,0.7)',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  blob1: 'rgba(0,122,255,0.07)',
  blob2: 'rgba(0,122,255,0.07)',
  skeletonBase: 'rgba(255,255,255,0.06)',
  skeletonHighlight: 'rgba(255,255,255,0.03)',
  switchTrackFalse: '#39393D',
  switchTrackTrue: '#007AFF',
  switchThumb: '#FFFFFF',
  checkboxBorder: '#007AFF',
  checkboxFill: '#007AFF',
  pillActive: '#007AFF',
  pillInactive: 'rgba(255,255,255,0.06)',
  pillInactiveBorder: 'rgba(255,255,255,0.08)',
  pillInactiveText: '#F2F2F7',
  statusBar: 'light-content' as 'light-content',
}

type BaseTheme = typeof lightTheme
export type Theme = Omit<BaseTheme, 'statusBar'> & { statusBar: 'light-content' | 'dark-content' }

import { NativePopup } from '@/components/ui/NativePopup'

interface AlertState {
  visible: boolean
  title: string
  message: string
  primaryButton: {
    text: string
    onPress: () => void
    destructive?: boolean
  }
  secondaryButton?: {
    text: string
    onPress: () => void
  }
}

const ThemeContext = createContext<{
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  showAlert: (config: Omit<AlertState, 'visible'>) => void
  hideAlert: () => void
}>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  showAlert: () => {},
  hideAlert: () => {},
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme()
  const { theme: storedTheme, setTheme, accentColor } = useSettingsStore()
  
  const isDark = storedTheme === 'system' ? systemColorScheme === 'dark' : storedTheme === 'dark'
  
  const baseTheme = isDark ? darkTheme : lightTheme
  
  const opacityLight = isDark ? '26' : '14'
  const opacityBorder = isDark ? '4D' : '33'

  const theme: Theme = {
    ...baseTheme,
    accent: accentColor,
    accentLight: accentColor + opacityLight,
    accentBorder: accentColor + opacityBorder,
    switchTrackTrue: accentColor,
    checkboxBorder: accentColor,
    checkboxFill: accentColor,
    pillActive: accentColor,
  }

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    primaryButton: { text: 'OK', onPress: () => {} }
  })

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const showAlert = (config: Omit<AlertState, 'visible'>) => {
    setAlert({ ...config, visible: true })
  }

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }))
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDark, 
      toggleTheme,
      showAlert,
      hideAlert
    }}>
      {children}
      <NativePopup
        visible={alert.visible}
        onClose={hideAlert}
        title={alert.title}
        message={alert.message}
        theme={theme}
        isDark={isDark}
        primaryButton={{
          ...alert.primaryButton,
          onPress: () => {
            alert.primaryButton.onPress()
            hideAlert()
          }
        }}
        secondaryButton={alert.secondaryButton ? {
          ...alert.secondaryButton,
          onPress: () => {
            alert.secondaryButton?.onPress()
            hideAlert()
          }
        } : undefined}
      />
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
