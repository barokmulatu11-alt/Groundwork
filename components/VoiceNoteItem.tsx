import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { Play, Pause, Trash2, Headphones } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  runOnJS,
  useAnimatedProps,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface VoiceNoteItemProps {
  uri: string;
  onDelete: () => void;
  colors: any;
  isDark: boolean;
  index: number;
}

export function VoiceNoteItem({ uri, onDelete, colors, isDark, index }: VoiceNoteItemProps) {
  const { theme } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const progressAnim = useSharedValue(0);
  const isSeeking = useSharedValue(false);
  const positionMillis = useSharedValue(0);
  const waveformWidth = useSharedValue(0);

  const barsCount = 35; 
  const bars = useRef(Array.from({ length: barsCount }, () => 0.2 + Math.random() * 0.8)).current;

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [uri]);

  const loadSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 100 },
        (status: any) => {
          if (status.isLoaded && !isSeeking.value) {
            runOnJS(updateUI)(status);
          }
        }
      );
      setSound(newSound);
      soundRef.current = newSound;
    } catch (e) {
      console.error("Error loading sound:", e);
    }
  };

  const updateUI = (status: any) => {
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.durationMillis) {
      progressAnim.value = status.positionMillis / status.durationMillis;
      positionMillis.value = status.positionMillis;
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      progressAnim.value = 0;
      positionMillis.value = 0;
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      if (positionMillis.value >= duration - 100) {
        await sound.setPositionAsync(0);
      }
      await sound.playAsync();
    }
  };

  const doSeek = async (percentage: number) => {
    if (!soundRef.current || duration === 0) return;
    const seekPos = Math.floor(percentage * duration);
    try {
      await soundRef.current.setPositionAsync(seekPos);
      positionMillis.value = seekPos;
      progressAnim.value = percentage;
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        isSeeking.value = false;
      }, 150);
    }
  };

  const formatTime = (millis: number) => {
    'worklet';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const timeTextProps = useAnimatedProps(() => {
    return {
      text: formatTime(positionMillis.value),
    } as any;
  });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isSeeking.value = true;
    })
    .onUpdate((event) => {
      if (waveformWidth.value === 0) return;
      let newProgress = event.x / waveformWidth.value;
      newProgress = Math.max(0, Math.min(1, newProgress));
      progressAnim.value = newProgress;
      positionMillis.value = newProgress * duration;
    })
    .onEnd(() => {
      runOnJS(doSeek)(progressAnim.value);
    });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E9ECEF' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconTag, { backgroundColor: theme.accentLight }]}>
            <Headphones size={12} color={theme.accent} />
          </View>
          <Text style={[styles.titleText, { color: isDark ? '#E9ECEF' : '#212529' }]}>Voice Note {index + 1}</Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Trash2 size={16} color="#FF3B30" />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Pressable onPress={togglePlayback} style={[styles.playBtn, { backgroundColor: theme.accent }]}>
          {isPlaying ? <Pause size={20} color="#FFF" fill="#FFF" /> : <Play size={20} color="#FFF" fill="#FFF" style={{ marginLeft: 2 }} />}
        </Pressable>

        <View style={styles.waveformWrapper}>
          <GestureDetector gesture={panGesture}>
            <View 
              style={styles.waveformContainer}
              onLayout={(e) => { waveformWidth.value = e.nativeEvent.layout.width; }}
            >
              <View style={styles.barsWrapper}>
                {bars.map((height, i) => {
                  const barAnimatedStyle = useAnimatedStyle(() => {
                    const isActive = (i / (barsCount - 1)) <= progressAnim.value;
                    return {
                      height: 4 + (height * 22),
                      backgroundColor: isActive ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    };
                  });
                  return <Animated.View key={i} style={[styles.bar, barAnimatedStyle]} />;
                })}
              </View>
              
              <Animated.View 
                style={[
                  styles.scrubber, 
                  useAnimatedStyle(() => ({
                    left: `${progressAnim.value * 100}%`,
                    transform: [{ scale: isSeeking.value ? withSpring(1.5) : 1 }]
                  }))
                ]}
              >
                <View style={[styles.scrubberHead, { backgroundColor: theme.accent }]} />
              </Animated.View>
            </View>
          </GestureDetector>
          
          <View style={styles.timeRow}>
            <AnimatedTextInput
              editable={false}
              underlineColorAndroid="transparent"
              animatedProps={timeTextProps}
              style={[styles.timeText, { color: isDark ? '#6C757D' : '#6C757D' }]}
            />
            <Text style={[styles.timeText, { color: isDark ? '#6C757D' : '#6C757D' }]}> / {formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTag: {
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  titleText: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  waveformWrapper: {
    flex: 1,
  },
  waveformContainer: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: '100%',
  },
  bar: {
    flex: 1,
    borderRadius: 1.5,
  },
  scrubber: {
    position: 'absolute',
    width: 30,
    height: 30,
    marginLeft: -15,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubberHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFF',
    
    
    
    
  },
  timeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'System',
    fontWeight: '600',
    padding: 0,
    margin: 0,
    height: 14,
  }
});
