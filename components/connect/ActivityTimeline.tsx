import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { DesignTokens } from '@/constants/designTokens';
import { TimelineEvent } from '@/hooks/connect/useTimeline';
import * as Icons from 'lucide-react-native';

interface Props {
  events: TimelineEvent[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const ActivityTimeline: React.FC<Props> = ({ events, loading, hasMore, onLoadMore }) => {
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  const getEventMeta = (type: TimelineEvent['formattedType']) => {
    switch (type) {
      case 'note':
        return { Icon: Icons.FileText, color: theme.accent };
      case 'task':
        return { Icon: Icons.CheckCircle2, color: '#34C759' };
      case 'habit':
        return { Icon: Icons.Zap, color: '#FF9500' };
      case 'achievement':
        return { Icon: Icons.Trophy, color: '#FFD700' };
      case 'focus':
        return { Icon: Icons.Clock, color: '#8B5CF6' };
      default:
        return { Icon: Icons.Activity, color: '#94A3B8' };
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.header}>
        <Icons.CalendarDays size={18} color={theme.primaryText} />
        <Text style={[styles.title, { color: theme.primaryText }]}>Activity Feed & Logs</Text>
      </View>

      {events.length > 0 ? (
        <View style={styles.timelineList}>
          {events.map((event, idx) => {
            const { Icon, color } = getEventMeta(event.formattedType);
            const isLast = idx === events.length - 1;

            return (
              <View key={event.id} style={styles.timelineNode}>
                
                {/* Visual Line Connectors */}
                <View style={styles.leftLineCol}>
                  <View style={[styles.iconCircle, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                    <Icon size={14} color={color} strokeWidth={2.5} />
                  </View>
                  {!isLast && (
                    <View style={[styles.timelineLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  )}
                </View>

                {/* Event Card Info */}
                <View style={[styles.eventCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.eventReason, { color: theme.primaryText }]}>
                      {event.reason}
                    </Text>
                    <View style={[styles.xpBadge, { backgroundColor: '#34C7591A' }]}>
                      <Text style={styles.xpText}>+{event.xp_amount} XP</Text>
                    </View>
                  </View>
                  <Text style={[styles.eventTime, { color: theme.secondaryText }]}>
                    {formatTime(event.created_at)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <TouchableOpacity
                  onPress={onLoadMore}
                  style={[styles.loadMoreBtn, { borderColor: cardBorder }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.loadMoreBtnText, { color: theme.accent }]}>Load More Activity</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icons.Inbox size={24} color={theme.secondaryText} style={{ marginBottom: 8, opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No activity logged yet.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...DesignTokens.shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineNode: {
    flexDirection: 'row',
    minHeight: 65,
  },
  leftLineCol: {
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  eventCard: {
    flex: 1,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventReason: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
    flex: 1,
    marginRight: 8,
  },
  xpBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  xpText: {
    color: '#34C759',
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
  },
  eventTime: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
    opacity: 0.8,
  },
  loadMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtnText: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.regular,
    opacity: 0.8,
  },
});
