import { Redirect } from 'expo-router';

/**
 * Legacy route handler for /courses.
 * Gracefully redirects to the main app without throwing 404 or breaking legacy links.
 */
export default function CoursesLegacyRoute() {
  return <Redirect href={'/' as any} />;
}
