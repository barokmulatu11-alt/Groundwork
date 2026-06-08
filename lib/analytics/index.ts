/**
 * Analytics Module - Central Export
 *
 * This module provides a complete event-driven analytics system for Groundwork.
 * All Pro analytics features are powered by this system.
 *
 * Usage:
 * ```typescript
 * import { AnalyticsTracker, AnalyticsEngine } from '@/lib/analytics';
 *
 * // Track events
 * AnalyticsTracker.trackTask.completed('task-123', 'Complete project');
 *
 * // Get analytics
 * const metrics = AnalyticsEngine.getProductivityMetrics(userId);
 * ```
 */

export * from "./AnalyticsEngine";
export * from "./AnalyticsTracker";

