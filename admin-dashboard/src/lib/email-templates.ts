export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  category: 'onboarding' | 'announcement' | 'marketing' | 'security' | 'system' | 'custom';
  description: string;
  body_html: string;
  body_text: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  template_id?: string;
  template_name?: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  sent_at: string;
  message_id?: string;
}

export const DEFAULT_VARIABLES: Record<string, string> = {
  user_name: 'Barok',
  user_email: 'barok.m.lakew@gmail.com',
  app_name: 'Groundwork',
  action_url: 'https://barok-labs.pro.et/open.html',
  support_email: 'barok.m.lakew@gmail.com',
  pro_plan: 'Groundwork Pro Annual',
  expiry_date: 'October 16, 2027',
  update_title: 'v1.3.0 Release - Cloud Sync & Widgets',
  announcement_body: 'We are thrilled to bring you our biggest update yet with real-time sync, customizable widgets, and sleek performance upgrades.',
  version: '1.3.0',
  completed_tasks: '28',
  streak_days: '14',
  focus_minutes: '320',
  summary_text: 'You crushed your goals this week and maintained your streak for 14 straight days!',
  device_name: 'Chrome on Windows 11',
  ip_address: '192.0.2.1',
  login_time: 'Today at 4:30 PM',
  message_subject: 'A personal note from the Groundwork Team',
  message_headline: 'Exciting news regarding your Groundwork account',
  message_content: 'We are always working to make your daily routine smoother and more rewarding.',
  button_text: 'Open Groundwork',
  year: new Date().getFullYear().toString(),
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_welcome',
    slug: 'welcome',
    name: 'Welcome to Groundwork',
    category: 'onboarding',
    description: 'Sent when a new user creates their account to welcome them and guide first steps.',
    subject: 'Welcome to Groundwork, {{user_name}}! 🚀 Let\'s build your rhythm',
    variables: ['user_name', 'user_email', 'app_name', 'action_url', 'support_email', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Hi {{user_name}},

Welcome to Groundwork! We are excited to have you join our community.

Groundwork is built to help you master your daily focus, track habits, and achieve meaningful progress every day without burnout.

Quick start steps:
1. Create your top 3 daily priorities
2. Set up 1 or 2 small daily habits
3. Run your first 25-minute focus session

Get started here: {{action_url}}

If you have questions, reach out to us at {{support_email}}.

Best regards,
The {{app_name}} Team`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Groundwork</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .logo-container { text-align: center; margin-bottom: 28px; }
    .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .badge { display: inline-block; background: rgba(0, 102, 255, 0.15); border: 1px solid rgba(0, 102, 255, 0.3); color: #0066FF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h1 { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px; }
    .feature-list { margin: 28px 0; padding: 0; list-style: none; }
    .feature-item { display: flex; align-items: flex-start; margin-bottom: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 14px 18px; border-radius: 14px; }
    .feature-icon { font-size: 18px; margin-right: 14px; line-height: 1.4; }
    .feature-title { font-size: 14px; font-weight: 700; color: #f9fafb; margin-bottom: 2px; }
    .feature-desc { font-size: 13px; color: #9ca3af; margin: 0; }
    .cta-container { text-align: center; margin: 34px 0 20px; }
    .cta-button { display: inline-block; background-color: #0066FF; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0, 102, 255, 0.35); transition: background-color 0.2s; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #6b7280; line-height: 1.6; }
    .footer a { color: #9ca3af; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card">
      <div style="text-align: center;">
        <span class="badge">Welcome Onboard</span>
        <h1>Welcome, {{user_name}}! 🚀</h1>
        <p>You have just taken the first step toward reclaiming your focus and building lasting daily momentum.</p>
      </div>

      <div class="feature-list">
        <div class="feature-item">
          <div class="feature-icon">🎯</div>
          <div>
            <div class="feature-title">Clear Daily Goals</div>
            <div class="feature-desc">Prioritize your core tasks each morning without clutter or overwhelm.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🔥</div>
          <div>
            <div class="feature-title">Consistent Habit Streaks</div>
            <div class="feature-desc">Track routines that compound into massive results over time.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⏱️</div>
          <div>
            <div class="feature-title">Deep Focus Sessions</div>
            <div class="feature-desc">Block out noise and measure your deep work sessions seamlessly.</div>
          </div>
        </div>
      </div>

      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">Open Your Dashboard</a>
      </div>

      <p style="text-align: center; font-size: 13px; color: #6b7280; margin: 0;">
        Questions? Reply to this email or contact us at <a href="mailto:{{support_email}}" style="color: #0066FF;">{{support_email}}</a>
      </p>
    </div>
    <div class="footer">
      © {{year}} {{app_name}}. All rights reserved.<br>
      You received this email because you signed up for {{app_name}} with {{user_email}}.
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_pro_upgrade',
    slug: 'pro-upgrade',
    name: 'Pro Subscription Activated',
    category: 'marketing',
    description: 'Sent when a user upgrades to Groundwork Pro to celebrate and highlight perks.',
    subject: '🌟 Welcome to Groundwork Pro, {{user_name}}! Your superpowers are live',
    variables: ['user_name', 'pro_plan', 'expiry_date', 'action_url', 'support_email', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Congratulations {{user_name}}!

Your Groundwork Pro membership is now fully active (Plan: {{pro_plan}}).

Everything included in your Pro tier:
- Custom App Launcher Icons (Logo Center)
- Architectural OLED themes & glowing accents
- Advanced focus velocity & compounding analytics
- Squad Leaderboard golden flair & XP multiplier
- Priority cloud sync & encrypted server backup

Your subscription is valid until {{expiry_date}}.

Jump in and customize your Pro workspace: {{action_url}}

Thank you for supporting Groundwork!
The {{app_name}} Team`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Groundwork Pro Activated</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0e17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background: linear-gradient(180deg, #131c2e 0%, #0d131f 100%); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 24px; padding: 42px 32px; box-shadow: 0 20px 45px rgba(0,0,0,0.5); }
    .logo-container { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 900; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .gold-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 8px 18px; border-radius: 9999px; margin-bottom: 20px; }
    h1 { font-size: 25px; font-weight: 800; color: #ffffff; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px; }
    .plan-box { background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(245, 158, 11, 0.35); border-radius: 16px; padding: 18px 22px; margin: 24px 0; text-align: left; }
    .plan-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .plan-label { color: #9ca3af; }
    .plan-value { color: #f9fafb; font-weight: 700; }
    .perks-grid { margin: 24px 0; text-align: left; }
    .perk-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 14px; color: #e5e7eb; }
    .perk-check { color: #10b981; font-weight: bold; margin-right: 10px; font-size: 16px; }
    .cta-container { text-align: center; margin: 32px 0 18px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #0066FF 0%, #0056b3 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 38px; border-radius: 14px; box-shadow: 0 6px 24px rgba(0, 102, 255, 0.4); }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card" style="text-align: center;">
      <div class="gold-badge">👑 Pro Member Active</div>
      <h1>You\'re now a Pro, {{user_name}}!</h1>
      <p>Thank you for leveling up with Groundwork Pro. Your account now has unrestricted access to all current and upcoming Pro features.</p>

      <div class="plan-box">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #fbbf24; margin-bottom: 10px; letter-spacing: 1px;">Subscription Details</div>
        <div class="plan-row"><span class="plan-label">Plan Tier:</span><span class="plan-value">{{pro_plan}}</span></div>
        <div class="plan-row" style="margin-bottom: 0;"><span class="plan-label">Renewal / Valid Until:</span><span class="plan-value">{{expiry_date}}</span></div>
      </div>

      <div class="perks-grid">
        <div class="perk-item"><span class="perk-check">✓</span> Exclusive Custom App Launcher Icons (Logo Center)</div>
        <div class="perk-item"><span class="perk-check">✓</span> Architectural OLED Themes & Glowing Accents</div>
        <div class="perk-item"><span class="perk-check">✓</span> Advanced Focus Velocity & Compounding Analytics</div>
        <div class="perk-item"><span class="perk-check">✓</span> Golden Squad Leaderboard Flair & Connect XP Boost</div>
        <div class="perk-item"><span class="perk-check">✓</span> Instant Cloud Backup & Multi-device Sync</div>
      </div>

      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">Explore Pro Features</a>
      </div>
    </div>
    <div class="footer">
      © {{year}} Groundwork. All rights reserved.<br>
      Manage your subscription anytime in your Groundwork Account Settings.
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_weekly_digest',
    slug: 'weekly-digest',
    name: 'Weekly Progress & Habits Digest',
    category: 'system',
    description: 'Weekly summary email sent to users with their stats, streak, and motivation.',
    subject: '📊 Your Weekly Progress Report: {{completed_tasks}} tasks completed!',
    variables: ['user_name', 'completed_tasks', 'streak_days', 'focus_minutes', 'summary_text', 'action_url', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Hey {{user_name}},

Here is your weekly Groundwork recap!

Your Weekly Stats:
- Completed Tasks: {{completed_tasks}}
- Current Streak: {{streak_days}} Days 🔥
- Focus Time: {{focus_minutes}} Minutes

{{summary_text}}

Keep the momentum rolling this week: {{action_url}}

Cheers,
Groundwork`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Progress Digest</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 36px 30px; }
    .logo-container { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 900; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .header-badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 5px 14px; border-radius: 9999px; margin-bottom: 16px; }
    .stats-table { width: 100%; margin: 24px 0; border-collapse: separate; border-spacing: 8px; }
    .stat-cell { background: #1a2234; border: 1px solid #28354f; border-radius: 14px; padding: 18px 12px; text-align: center; }
    .stat-num { font-size: 24px; font-weight: 900; color: #0066FF; margin-bottom: 4px; }
    .stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px; }
    .quote-box { background: rgba(0, 102, 255, 0.08); border-left: 3px solid #0066FF; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .cta-container { text-align: center; margin-top: 28px; }
    .cta-button { display: inline-block; background-color: #0066FF; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 14px; }
    .footer { text-align: center; margin-top: 28px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card">
      <div style="text-align: center;">
        <span class="header-badge">Weekly Digest</span>
        <h1 style="font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 10px;">Way to show up, {{user_name}}! 👏</h1>
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">Here is a snapshot of your accomplishments over the last 7 days.</p>
      </div>

      <table class="stats-table">
        <tr>
          <td class="stat-cell" style="width: 33%;">
            <div class="stat-num">{{completed_tasks}}</div>
            <div class="stat-label">Tasks Done</div>
          </td>
          <td class="stat-cell" style="width: 33%;">
            <div class="stat-num" style="color: #f59e0b;">{{streak_days}} 🔥</div>
            <div class="stat-label">Streak Days</div>
          </td>
          <td class="stat-cell" style="width: 33%;">
            <div class="stat-num" style="color: #10b981;">{{focus_minutes}}m</div>
            <div class="stat-label">Focus Time</div>
          </td>
        </tr>
      </table>

      <div class="quote-box">
        {{summary_text}}
      </div>

      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">Plan Upcoming Week</a>
      </div>
    </div>
    <div class="footer">
      © {{year}} Groundwork. Keep building, one day at a time.
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_announcement',
    slug: 'announcement',
    name: 'Product Update & Announcement',
    category: 'announcement',
    description: 'Broadcast email to announce new features, releases, or major maintenance.',
    subject: '📣 Groundwork Update: {{update_title}}',
    variables: ['user_name', 'update_title', 'announcement_body', 'version', 'action_url', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Hello {{user_name}},

{{update_title}} (Version {{version}})

{{announcement_body}}

Check out what's new in Groundwork today:
{{action_url}}

Thanks for being part of Groundwork!`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Announcement</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px 32px; }
    .logo-container { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 900; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .badge { display: inline-block; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); color: #a78bfa; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px; }
    .cta-container { text-align: center; margin: 32px 0 16px; }
    .cta-button { display: inline-block; background-color: #0066FF; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 14px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card">
      <div style="text-align: center;">
        <span class="badge">Version {{version}} Released</span>
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 16px;">{{update_title}}</h1>
      </div>
      <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin-bottom: 24px;">Hi {{user_name}},</p>
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px; padding: 22px; font-size: 15px; line-height: 1.7; color: #e5e7eb; margin-bottom: 24px;">
        {{announcement_body}}
      </div>
      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">See What's New</a>
      </div>
    </div>
    <div class="footer">
      © {{year}} Groundwork. Built for everyday focus.
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_security_alert',
    slug: 'security-alert',
    name: 'Security & Sign-in Alert',
    category: 'security',
    description: 'Triggered when suspicious sign-ins or password/account changes take place.',
    subject: '🔒 Security Alert: Sign-in from new device',
    variables: ['user_name', 'user_email', 'device_name', 'ip_address', 'login_time', 'action_url', 'support_email', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Security Alert for {{user_email}}

Hi {{user_name}},

We noticed a sign-in or critical account action with your Groundwork credentials.

Details:
- Device: {{device_name}}
- IP Address: {{ip_address}}
- Time: {{login_time}}

If this was you, you can safely ignore this email.

If you did not initiate this action, please secure your account immediately:
{{action_url}}

Contact our security team if you need assistance: {{support_email}}`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #111827; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 40px 32px; }
    .logo-container { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 900; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .alert-badge { display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px; }
    .details-box { background: rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px 22px; margin: 22px 0; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #9ca3af; }
    .detail-val { color: #f3f4f6; font-weight: 600; }
    .cta-container { text-align: center; margin: 28px 0 16px; }
    .cta-button { display: inline-block; background-color: #ef4444; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 12px; }
    .footer { text-align: center; margin-top: 28px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card">
      <div style="text-align: center;">
        <span class="alert-badge">Security Notice</span>
        <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px;">Sign-in from new device</h1>
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">We noticed an account access to <strong>{{user_email}}</strong></p>
      </div>

      <div class="details-box">
        <div class="detail-row"><span class="detail-label">Device / Browser</span><span class="detail-val">{{device_name}}</span></div>
        <div class="detail-row"><span class="detail-label">IP Address</span><span class="detail-val">{{ip_address}}</span></div>
        <div class="detail-row"><span class="detail-label">Timestamp</span><span class="detail-val">{{login_time}}</span></div>
      </div>

      <p style="font-size: 13px; color: #9ca3af; line-height: 1.6; text-align: center;">
        If this was you, no action is needed. If you did not make this request, secure your credentials immediately.
      </p>

      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">Review Security Settings</a>
      </div>
    </div>
    <div class="footer">
      © {{year}} Groundwork Security Team
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tpl_custom',
    slug: 'custom-message',
    name: 'Custom Admin Broadcast',
    category: 'custom',
    description: 'General purpose customizable broadcast email template.',
    subject: '{{message_subject}}',
    variables: ['user_name', 'message_subject', 'message_headline', 'message_content', 'button_text', 'action_url', 'year'],
    is_default: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    body_text: `Hi {{user_name}},

{{message_headline}}

{{message_content}}

{{button_text}}: {{action_url}}

Best,
Groundwork`,
    body_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{message_subject}}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .wrapper { width: 100%; max-width: 580px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px 32px; }
    .logo-container { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 900; color: #ffffff; text-decoration: none; }
    .logo-accent { color: #0066FF; }
    .cta-container { text-align: center; margin: 30px 0 16px; }
    .cta-button { display: inline-block; background-color: #0066FF; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 14px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">g</span>roundwork.</a>
    </div>
    <div class="card">
      <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 16px;">{{message_headline}}</h1>
      <p style="font-size: 15px; line-height: 1.65; color: #9ca3af; margin: 0 0 20px;">Hi {{user_name}},</p>
      <div style="font-size: 15px; line-height: 1.7; color: #e5e7eb; margin-bottom: 24px;">
        {{message_content}}
      </div>
      <div class="cta-container">
        <a href="{{action_url}}" class="cta-button">{{button_text}}</a>
      </div>
    </div>
    <div class="footer">
      © {{year}} Groundwork Team
    </div>
  </div>
</body>
</html>`
  }
];

/**
 * Replace all {{variable}} and {variable} placeholders with their respective values
 */
export function substituteVariables(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, p1, p2) => {
    const key = p1 || p2;
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Extract all unique {{variables}} found in a text/html string
 */
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  if (!matches) return [];
  const unique = new Set<string>();
  for (const m of matches) {
    const key = m.replace(/[\{\}\s]/g, '');
    if (key) unique.add(key);
  }
  return Array.from(unique);
}
