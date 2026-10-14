import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Retired payment history route.
 * Redirects safely to milestone rewards / settings.
 */
export default function PaymentHistoryRetiredRoute() {
  return <Redirect href={'/settings' as any} />;
}
