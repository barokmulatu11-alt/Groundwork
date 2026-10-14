import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Retired feature route for /revision-insights.
 * Resolves safely to the main retained app without breaking bookmarks or URLs.
 */
export default function RevisionInsightsRetiredRoute() {
  return <Redirect href={'/' as any} />;
}
