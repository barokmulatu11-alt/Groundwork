import { AppText as Text } from '@/components/ui/AppText';
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, Platform, ScrollView, PanResponder, Modal, StatusBar } from 'react-native';
import Svg, { Path, Defs, Mask, Rect, G } from 'react-native-svg';
import {
  Eraser, RotateCcw, RotateCw, Trash2, X, Check
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Stroke {
  d: string;
  color: string;
  width: number;
  isEraser: boolean;
}

interface DrawingCanvasProps {
  colors: any;
  onSave: (data: string) => void;
  onCancel: () => void;
}

const COLORS = [
  '#000000', '#FFFFFF', '#007AFF', '#FF3B30',
  '#FF9500', '#FFCC00', '#34C759', '#AF52DE',
  '#FF2D55', '#5AC8FA',
];

const THICKNESSES = [
  { label: 'Thin', value: 4 },
  { label: 'Medium', value: 8 },
  { label: 'Thick', value: 16 },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onCancel, colors }) => {
  const { theme } = useTheme();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [penColor, setPenColor] = useState(theme.accent);
  const [penWidth, setPenWidth] = useState(8);
  const [isEraser, setIsEraser] = useState(false);

  const livePathRef = useRef<string>('');

  // ─── Direct Touch Handling ────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const startPoint = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      livePathRef.current = startPoint;
      setCurrentPath(startPoint);
      setRedoStack([]); // Clear redo stack on new stroke
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      livePathRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      setCurrentPath(livePathRef.current);
    },
    onPanResponderRelease: () => {
      const pathData = livePathRef.current;
      if (!pathData) return;

      const newStroke: Stroke = {
        d: pathData,
        color: isEraser ? '#ERASER' : penColor,
        width: isEraser ? 32 : penWidth,
        isEraser: isEraser };

      setStrokes(prev => [...prev, newStroke]);
      livePathRef.current = '';
      setCurrentPath('');
    } }), [penColor, penWidth, isEraser]);

  const handleSave = () => {
    if (strokes.length > 0) {
      onSave(JSON.stringify(strokes));
    } else {
      onCancel();
    }
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      const lastStroke = strokes[strokes.length - 1];
      setStrokes(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastStroke]);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const lastRedo = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      setStrokes(prev => [...prev, lastRedo]);
    }
  };

  return (
    <Modal visible animationType="slide" transparent={false}>
      <StatusBar hidden={Platform.OS === 'android'} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* Simple Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.cardBorder }]}>
          <Pressable onPress={onCancel} style={[styles.headerBtn]}>
            <X size={24} color="#FF3B30" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Sketchboard</Text>
            <Text style={{ fontSize: 10,  fontFamily: 'System', color: colors.textSecondary }}>{strokes.length} strokes</Text>
          </View>
          <Pressable onPress={handleSave} style={[styles.saveBtn]}>
            <Check size={24} color="#FFF" />
          </Pressable>
        </View>

        {/* Drawing Canvas */}
        <View style={styles.canvasContainer}>
          <Svg style={StyleSheet.absoluteFill}>
            {/* Draw existing strokes */}
            {strokes.map((s, i) => (
              <Path
                key={i}
                d={s.d}
                stroke={s.isEraser ? colors.background : s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            
            {/* Draw current stroke */}
            {currentPath !== '' && (
              <Path
                d={currentPath}
                stroke={isEraser ? colors.background : penColor}
                strokeWidth={isEraser ? 32 : penWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>

          {/* Touch Overlay - NO MASKING for now to fix Android crash/bugs */}
          <View 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.01)' }]} 
            {...panResponder.panHandlers} 
          />

          {strokes.length === 0 && currentPath === '' && (
            <View style={styles.placeholder} pointerEvents="none">
              <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>Tap and drag to draw</Text>
            </View>
          )}
        </View>

        {/* Compact Controls */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => { setPenColor(c); setIsEraser(false); }}
                style={[styles.colorDot, { 
                  backgroundColor: c, 
                  borderColor: penColor === c && !isEraser ? theme.accent : colors.cardBorder,
                  borderWidth: penColor === c && !isEraser ? 3 : 1
                }]}
              />
            ))}
          </ScrollView>

          <View style={styles.toolRow}>
            <View style={styles.thicknessRow}>
              {THICKNESSES.map(t => (
                <Pressable
                  key={t.value}
                  onPress={() => { setPenWidth(t.value); setIsEraser(false); }}
                  style={[styles.thicknessBtn, { 
                    backgroundColor: penWidth === t.value && !isEraser ? theme.accent : 'rgba(0,0,0,0.05)'
                  }]}
                >
                  <View style={{ width: t.value, height: t.value, borderRadius: t.value/2, backgroundColor: penWidth === t.value && !isEraser ? '#FFF' : colors.text }} />
                </Pressable>
              ))}
            </View>

            <View style={styles.toolGroup}>
              <Pressable onPress={() => setIsEraser(!isEraser)} style={[styles.toolIcon, isEraser && styles.toolActive]}>
                <Eraser size={20} color={isEraser ? '#FFF' : colors.text} />
              </Pressable>
              <Pressable onPress={handleUndo} style={[styles.toolIcon]} disabled={strokes.length === 0}>
                <RotateCcw size={20} color={strokes.length === 0 ? colors.textSecondary : colors.text} />
              </Pressable>
              <Pressable onPress={handleRedo} style={[styles.toolIcon]} disabled={redoStack.length === 0}>
                <RotateCw size={20} color={redoStack.length === 0 ? colors.textSecondary : colors.text} />
              </Pressable>
              <Pressable onPress={() => { setStrokes([]); setRedoStack([]); }} style={[styles.toolIcon, styles.clearBtn]}>
                <Trash2 size={20} color="#FF3B30" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16,
    borderBottomWidth: 1 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  saveBtn: { backgroundColor: '#34C759', padding: 10, borderRadius: 20 },
  canvasContainer: { flex: 1 },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
  footer: { paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1, paddingTop: 16 },
  colorScroll: { maxHeight: 50, marginBottom: 16, paddingHorizontal: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  thicknessRow: { flexDirection: 'row', gap: 8 },
  thicknessBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolGroup: { flexDirection: 'row', gap: 8 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  toolActive: { backgroundColor: '#FF9500' },
  clearBtn: { backgroundColor: 'rgba(255,59,48,0.1)' } });
