import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch the most recent session created by Google OAuth in the last 2 minutes
    const rows = await queryNeon<any>(
      `SELECT s.token, s."userId", s."expiresAt", u.email, u.name, u.image 
       FROM neon_auth.session s 
       JOIN neon_auth.user u ON s."userId" = u.id 
       WHERE s."createdAt" >= NOW() - INTERVAL '120 seconds' 
       ORDER BY s."createdAt" DESC 
       LIMIT 1`
    );

    const session = rows && rows.length > 0 ? rows[0] : null;

    const token = session?.token || '';
    const userId = session?.userId || '';
    const email = session?.email || '';
    const name = session?.name || '';
    const image = session?.image || '';

    const queryParams = new URLSearchParams();
    if (token) queryParams.set('token', token);
    if (userId) queryParams.set('userId', userId);
    if (email) queryParams.set('email', email);
    if (name) queryParams.set('name', name);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    // Android Intent URI with fallback url to prevent ERR_UNKNOWN_URL_SCHEME crashes
    const intentUrl = `intent://auth/callback${queryString}#Intent;scheme=groundwork;package=com.baroklabs.groundwork;S.browser_fallback_url=https%3A%2F%2Fgroundwork.app;end;`;
    
    // Custom scheme URI
    const schemeUrl = `groundwork://auth/callback${queryString}`;

    const displayName = name || email || 'Groundwork User';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening Groundwork...</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 28px;
      padding: 44px 28px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.6);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .logo {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .logo span { color: #3b82f6; }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #ffffff;
    }
    p {
      font-size: 14px;
      color: #9ca3af;
      line-height: 1.5;
      margin: 0 0 28px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #3b82f6;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 15px 20px;
      border-radius: 16px;
      box-shadow: 0 4px 18px rgba(59, 130, 246, 0.4);
      margin-bottom: 14px;
      cursor: pointer;
      border: none;
      transition: background 0.2s;
    }
    .btn:active { background: #2563eb; }
    .secondary-link {
      color: #60a5fa;
      font-size: 13px;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="logo"><span>g</span>roundwork.</div>
    <h1>Welcome, ${displayName.replace(/</g, '&lt;')}</h1>
    <p id="status-text">Finalizing authentication and returning to Groundwork...</p>
    
    <a id="btn-open" href="${schemeUrl}" class="btn">
      🚀 Open Groundwork
    </a>
    <div>
      <a id="btn-fallback" href="${intentUrl}" class="secondary-link">
        Tap here if app does not open automatically
      </a>
    </div>
  </div>

  <script>
    (async function() {
      var userId = ${JSON.stringify(userId)};
      var email = ${JSON.stringify(email)};
      var name = ${JSON.stringify(name)};
      var baseToken = ${JSON.stringify(token)};
      var effectiveToken = baseToken;

      // 1. Fetch real authenticated JWT from Neon Auth using browser cookies
      try {
        var tokenRes = await fetch('https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/token', {
          credentials: 'include',
          headers: { 'Origin': window.location.origin }
        });
        if (tokenRes.ok) {
          var tokenJson = await tokenRes.json();
          if (tokenJson && tokenJson.token) {
            effectiveToken = tokenJson.token;
            // Bridge this JWT to mobile-session API so mobile app fallback has it
            try {
              await fetch('/api/auth/mobile-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: effectiveToken,
                  userId: userId,
                  email: email,
                  name: name
                })
              });
            } catch (_) {}
          }
        }
      } catch (e) {
        console.warn('JWT retrieval attempt completed:', e);
      }

      // 2. Build finalized URLs with the authenticated token
      var params = new URLSearchParams();
      if (effectiveToken) params.set('token', effectiveToken);
      if (userId) params.set('userId', userId);
      if (email) params.set('email', email);
      if (name) params.set('name', name);

      var qs = params.toString() ? ('?' + params.toString()) : '';
      var schemeTarget = 'groundwork://auth/callback' + qs;
      var intentTarget = 'intent://auth/callback' + qs + '#Intent;scheme=groundwork;package=com.baroklabs.groundwork;S.browser_fallback_url=https%3A%2F%2Fgroundwork.app;end;';

      var btnOpen = document.getElementById('btn-open');
      if (btnOpen) btnOpen.href = schemeTarget;
      var btnFallback = document.getElementById('btn-fallback');
      if (btnFallback) btnFallback.href = intentTarget;

      var statusText = document.getElementById('status-text');
      if (statusText) statusText.innerText = 'Returning to Groundwork...';

      // 3. Smoothly navigate to the app scheme
      setTimeout(function() {
        try {
          window.location.href = schemeTarget;
        } catch (_) {
          try {
            window.location.replace(schemeTarget);
          } catch (_) {}
        }
      }, 300);
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Google Callback] Error:', err);
    const fallbackUrl = 'groundwork://auth/callback';
    const errorHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Groundwork Sign-In</title></head>
<body style="background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div style="padding:24px;max-width:360px;">
    <h2>groundwork.</h2>
    <p style="color:#9ca3af;">Sign-in completed. Please return to the app.</p>
    <a href="${fallbackUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold;">Return to Groundwork</a>
  </div>
  <script>window.location.href = '${fallbackUrl}';</script>
</body>
</html>`;
    return new NextResponse(errorHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
