# Groundwork Analytics System

A comprehensive event-driven analytics and intelligence system that powers all Pro features in Groundwork.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Actions  │───▶│  AnalyticsTracker │───▶│ AnalyticsEngine │
│   (useStore)    │    │  (Event Logging)  │    │ (Processing)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   SQLite Local   │    │   Pro Features  │
                       │   (Raw Events)   │    │   (Analytics)   │
                       └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. AnalyticsTracker (`AnalyticsTracker.ts`)

The global event logging system that captures all user actions.

**Key Features:**

- Structured event emission with userId, timestamp, type, and metadata
- Append-only local SQLite storage
- Async cloud sync to Supabase
- Real-time event listeners
- Automatic aggregation pipeline

**Event Types:**

```typescript
// Task Events
(task_created, task_completed, task_deleted, task_updated);

// Habit Events
(habit_created,
  habit_completed,
  habit_streak_extended,
  habit_deleted,
  habit_updated);

// Note Events
(note_created, note_updated, note_deleted, note_viewed, note_revision_session);

// Focus Events
(focus_session_started, focus_session_ended, focus_session_interrupted);

// Auth & App Events
(login, logout, signup, app_opened, app_closed, screen_view);

// Subscription Events
(paywall_view, subscription_started, subscription_ended);
```

### 2. AnalyticsEngine (`AnalyticsEngine.ts`)

Processes raw events into computed analytics datasets.

**Features:**

- Productivity Analytics (tasks completed, completion rate, peak hours, trends)
- Habit Heatmaps (calendar view, consistency scores, streak tracking)
- Focus Analytics (total time, session length, distraction rate, focus score)
- Revision Analytics (weak topics, overdue revisions, spaced repetition)
- Trend Engine (rolling averages, direction analysis)
- Reports Generator (weekly & monthly reports with AI-generated insights)

### 3. Data Pipeline

**Storage Layers:**

1. **Raw Events Store** - Append-only log of all events
2. **Daily Aggregates** - Pre-computed daily metrics
3. **Real-time Cache** - Instant dashboard data

## Usage

### Tracking Events

```typescript
import { trackTask, trackHabit, trackNote, trackFocus } from "@/lib/analytics";

// Track task completion
trackTask.completed(taskId, taskTitle, completedAfterMinutes);

// Track habit check-in
trackHabit.completed(habitId, habitTitle, streak);

// Track note creation
trackNote.created(noteId, noteTitle, tags);

// Track focus session
trackFocus.ended(sessionId, durationMinutes, completed, mode);
```

### Getting Analytics

```typescript
import {
  getProductivityMetrics,
  getHabitHeatmapData,
  getFocusMetrics,
  getTrendAnalysis,
  generateWeeklyReport,
} from "@/lib/analytics";

// Get productivity metrics
const metrics = getProductivityMetrics(userId, 30);
// Returns: tasksCompletedToday, completionRate, peakHours, trend...

// Get habit heatmap data
const heatmap = getHabitHeatmapData(userId, 90);
// Returns: [{ date, count, habits }] for calendar visualization

// Get focus metrics
const focus = getFocusMetrics(userId);
// Returns: totalFocusTime, averageSessionLength, focusScore...

// Get trend analysis
const trends = getTrendAnalysis(userId);
// Returns: productivity, habitConsistency, focus trends with direction

// Generate weekly report
const report = generateWeeklyReport(userId);
// Returns: tasksCompleted, habitsConsistency, insights...
```

## Pro Feature Enforcement

All analytics features check subscription status:

```typescript
import { isPro } from "@/lib/subscriptionService";

// Free users get limited data
if (!isPro()) {
  return {
    tasksCompletedToday: fullMetrics.tasksCompletedToday,
    tasksCompletedThisWeek: fullMetrics.tasksCompletedThisWeek,
    // No trends, no peak hours, no detailed analytics
  };
}
```

**Free Users Receive:**

- Basic task/habit counts
- Simple completion rates
- No heatmaps
- No trend analysis
- No reports
- No revision insights

**Pro Users Receive:**

- Full analytics dashboard
- Habit heatmaps (90 days)
- Productivity trends
- Focus analytics with scores
- Weekly & monthly reports
- Revision insights with spaced repetition
- Peak productivity hours

## Data Integrity

### Reconciliation System

```typescript
import { runReconciliation } from "@/lib/analytics";

// Run data integrity checks
const result = runReconciliation(userId);
// Verifies: XP ledger, daily aggregates, realtime cache
// Auto-fixes discrepancies
```

### Automatic Features

- **Debounce Processing** - Events are aggregated with 2-second debounce
- **Incremental Updates** - Only new events trigger recomputation
- **Cache Invalidation** - Stale cache auto-refreshes after 1 hour
- **XP Verification** - XP ledger reconciled against event log

## Database Schema

### Local SQLite Tables

```sql
-- Raw event log (append-only)
analytics_events (
  id, event_type, user_id, timestamp,
  timestamp_ms, metadata, processed
)

-- Pre-computed daily metrics
analytics_daily_aggregates (
  date, user_id, tasks_created, tasks_completed,
  habits_completed, focus_minutes, notes_created,
  notes_viewed, xp_earned, streak_days, focus_sessions
)

-- Real-time cache for dashboards
analytics_realtime_cache (
  user_id, updated_at, weekly_tasks_completed,
  weekly_habits_completed, weekly_focus_minutes,
  current_streak, best_streak, productivity_score
)
```

### Supabase Tables

See `supabase/migrations/20260603_analytics_events.sql` for cloud schema.

## Performance

- **Instant Dashboard Loading** - Uses cached aggregates
- **Background Processing** - Aggregation happens asynchronously
- **Minimal Storage** - Events compressed, old data archived
- **Efficient Queries** - Indexed on user_id, timestamp, event_type

## Integration Points

### With useStore

All user actions in `store/useStore.ts` emit analytics events:

```typescript
// Task completion
toggleTask: async (id, currentStatus) => {
  if (completed) {
    trackTask.completed(task.id, task.title);
  }
};

// Habit check-in
toggleHabit: async (id, date) => {
  if (isCheckingIn) {
    trackHabit.completed(habit.id, habit.title, newStreak);
  }
};

// Note creation
addNote: async (noteData) => {
  trackNote.created(newNote.id, newNote.title, newNote.tags);
};

// Focus session
addFocusSession: async (sessionData) => {
  trackFocus.ended(session.id, duration, true, mode);
};
```

## Testing

```typescript
// Test event tracking
import { getEventsByType } from "@/lib/analytics";

const events = getEventsByType(userId, "task_completed", 7);
expect(events.length).toBeGreaterThan(0);

// Test aggregation
import { getDailyAggregates } from "@/lib/analytics";

const aggregates = getDailyAggregates(userId, 7);
expect(aggregates[0].tasksCompleted).toBeGreaterThan(0);

// Test Pro enforcement
import { getLimitedProductivityMetrics } from "@/lib/analytics";

const metrics = getLimitedProductivityMetrics(userId);
if (!isPro()) {
  expect(metrics.productivityTrend).toBeUndefined();
}
```

## Migration

To enable analytics in your existing Groundwork installation:

1. Run Supabase migration:

```bash
supabase db push
```

2. Analytics tables auto-create on app startup via `initAnalyticsTables()`

3. Existing data will be retroactively analyzed as events are tracked

## Best Practices

1. **Always track at the source** - Emit events where actions occur
2. **Include rich metadata** - Add context for better insights
3. **Respect privacy** - Never track sensitive data
4. **Handle offline** - Events queue locally, sync when online
5. **Test reconciliation** - Regularly verify data integrity

## Troubleshooting

### Events not tracking?

- Check `initAnalyticsTables()` was called
- Verify user is authenticated
- Check console for errors

### Analytics not updating?

- Aggregation has 2-second debounce
- Check `processed` flag in events table
- Run `runReconciliation()` manually

### Pro features showing for free users?

- Check `isPro()` implementation
- Verify subscription status in profile
- Clear app cache and retry

## Future Enhancements

- [ ] Real-time collaboration analytics
- [ ] AI-powered productivity recommendations
- [ ] Export reports to PDF/Markdown
- [ ] Custom analytics dashboards
- [ ] Team/productivity comparisons
- [ ] Predictive trend forecasting
