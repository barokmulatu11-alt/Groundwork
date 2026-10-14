import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Retired feature route for /notes.
 * Resolves safely to the main retained app without breaking bookmarks or URLs.
 */
export default function NotesRetiredRoute() {
  return <Redirect href={'/' as any} />;
}
