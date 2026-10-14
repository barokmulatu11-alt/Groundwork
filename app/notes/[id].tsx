import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Retired feature route for /notes/[id].
 * Resolves safely to the main retained app without breaking bookmarks or URLs.
 */
export default function NoteDetailRetiredRoute() {
  return <Redirect href={'/' as any} />;
}
