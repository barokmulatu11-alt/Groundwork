'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function OpenAppContent() {
  const searchParams = useSearchParams();
  const screen = searchParams.get('screen') || '';
  const token = searchParams.get('token') || '';

  // Construct target app route
  let appRoute = '';
  if (screen) {
    appRoute = screen;
  }
  if (token) {
    appRoute = `reset-password?token=${encodeURIComponent(token)}`;
  }

  const customSchemeUrl = appRoute ? `groundwork://${appRoute}` : `groundwork://`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.baroklabs.groundwork';

  const [status, setStatus] = useState<'checking' | 'opened' | 'fallback'>('checking');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    let appOpened = false;
    const start = Date.now();

    const markAppOpened = () => {
      appOpened = true;
      setStatus('opened');
    };

    window.addEventListener('blur', markAppOpened);
    window.addEventListener('pagehide', markAppOpened);
    const onVisibility = () => {
      if (document.hidden) markAppOpened();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Immediately try scheme
    window.location.href = customSchemeUrl;

    // Timeout: if not opened and still visible, fall back to Play Store
    const timer = setTimeout(() => {
      if (!appOpened && !document.hidden && Date.now() - start < 3500) {
        setStatus('fallback');
        window.location.href = playStoreUrl;
      }
    }, 1600);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('blur', markAppOpened);
      window.removeEventListener('pagehide', markAppOpened);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [customSchemeUrl, playStoreUrl]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0f19',
      color: '#F5F2EB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '28px',
        padding: '44px 28px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
      }}>
        <div style={{ fontSize: '32px', fontWeight: 900, marginBottom: '20px', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#007AFF' }}>g</span>roundwork.
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#93c5fd',
          backgroundColor: 'rgba(0, 122, 255, 0.12)',
          border: '1px solid rgba(0, 122, 255, 0.25)',
          borderRadius: '9999px',
          padding: '6px 16px',
          marginBottom: '20px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%'
          }} />
          {status === 'opened'
            ? 'App launched!'
            : status === 'fallback'
            ? 'Redirecting to Google Play...'
            : 'Detecting Groundwork app...'}
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', color: '#ffffff' }}>
          {status === 'fallback' ? 'Groundwork Not Found' : 'Opening Groundwork'}
        </h1>

        <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, marginBottom: '26px' }}>
          {status === 'fallback'
            ? 'Groundwork does not appear to be installed on your device. Taking you to Google Play Store...'
            : 'Launching Groundwork on your device. If the app is not installed, you will be redirected to Google Play.'}
        </p>

        <a
          href={customSchemeUrl}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#007AFF',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 800,
            textDecoration: 'none',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 6px 24px rgba(0, 122, 255, 0.4)',
            marginBottom: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          🚀 Open Groundwork App
        </a>

        <a
          href={playStoreUrl}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e5e7eb',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '13px 20px',
            borderRadius: '14px',
            marginBottom: '12px'
          }}
        >
          🛒 View on Google Play Store
        </a>

        <div style={{ marginTop: '14px' }}>
          <a
            href="https://github.com/barokmulatu11-alt/Groundwork/releases/download/v1.2.1/groundwork-1.2.1.apk"
            style={{
              display: 'inline-block',
              fontSize: '13px',
              color: '#60a5fa',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            📥 Need the direct APK? Download here
          </a>
        </div>
      </div>
    </div>
  );
}

export default function OpenAppPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#F5F2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Opening Groundwork...
      </div>
    }>
      <OpenAppContent />
    </Suspense>
  );
}
