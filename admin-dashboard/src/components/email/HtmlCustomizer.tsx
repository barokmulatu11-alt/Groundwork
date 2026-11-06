'use client';

import React, { useState } from 'react';
import {
  Palette,
  Layout,
  Type,
  MousePointerClick,
  ShieldCheck,
  Check,
  Sparkles,
  Sliders,
  RotateCcw,
  Sun,
  Moon,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '@/lib/ThemeContext';

export interface EmailCustomizerConfig {
  logoText: string;
  logoAccentLetter: string;
  accentColor: string;
  outerBg: string;
  cardBg: string;
  textColor: string;
  secondaryTextColor: string;
  cardBorderRadius: number;
  hasCardBorder: boolean;
  borderColor: string;
  fontFamily: string;
  showBadge: boolean;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  showCtaButton: boolean;
  ctaText: string;
  ctaUrl: string;
  ctaRadius: number;
  ctaStyle: 'solid' | 'gradient' | 'outline';
  ctaGlow: boolean;
  companyName: string;
  supportEmail: string;
  showUnsubscribe: boolean;
  showSocials: boolean;
}

export const DEFAULT_CUSTOMIZER_CONFIG: EmailCustomizerConfig = {
  logoText: 'roundwork.',
  logoAccentLetter: 'g',
  accentColor: '#0066FF',
  outerBg: '#0b0f19',
  cardBg: '#111827',
  textColor: '#f3f4f6',
  secondaryTextColor: '#9ca3af',
  cardBorderRadius: 20,
  hasCardBorder: true,
  borderColor: '#1f2937',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  showBadge: true,
  badgeText: 'Groundwork Official',
  badgeBg: 'rgba(0, 122, 255, 0.15)',
  badgeColor: '#0066FF',
  showCtaButton: true,
  ctaText: 'Open Dashboard',
  ctaUrl: '{{action_url}}',
  ctaRadius: 14,
  ctaStyle: 'solid',
  ctaGlow: true,
  companyName: 'Groundwork',
  supportEmail: 'barok.m.lakew@gmail.com',
  showUnsubscribe: true,
  showSocials: true,
};

interface HtmlCustomizerProps {
  currentHtml: string;
  onApplyCustomization: (newHtml: string) => void;
  innerContent?: string;
}

export default function HtmlCustomizer({
  currentHtml,
  onApplyCustomization,
  innerContent = '<h1>Welcome, {{user_name}}!</h1><p>This is your customizable email body.</p>',
}: HtmlCustomizerProps) {
  const { isDark } = useTheme();
  const [config, setConfig] = useState<EmailCustomizerConfig>(DEFAULT_CUSTOMIZER_CONFIG);
  const [activeSection, setActiveSection] = useState<'theme' | 'branding' | 'button' | 'footer'>('theme');

  const presetAccents = [
    { name: 'Groundwork Blue', hex: '#0066FF' },
    { name: 'Emerald Focus', hex: '#10b981' },
    { name: 'Royal Purple', hex: '#8b5cf6' },
    { name: 'Pro Amber', hex: '#f59e0b' },
    { name: 'Ruby Alert', hex: '#ef4444' },
    { name: 'Vibrant Pink', hex: '#ec4899' },
    { name: 'Clean Cyan', hex: '#06b6d4' },
  ];

  const presetThemes = [
    {
      name: 'Groundwork Midnight',
      outerBg: '#0b0f19',
      cardBg: '#111827',
      textColor: '#f3f4f6',
      secondaryTextColor: '#9ca3af',
      borderColor: '#1f2937',
    },
    {
      name: 'OLED Pure Black',
      outerBg: '#000000',
      cardBg: '#0d0d0d',
      textColor: '#ffffff',
      secondaryTextColor: '#a1a1aa',
      borderColor: '#27272a',
    },
    {
      name: 'Slate Tech',
      outerBg: '#0f172a',
      cardBg: '#1e293b',
      textColor: '#f8fafc',
      secondaryTextColor: '#94a3b8',
      borderColor: '#334155',
    },
    {
      name: 'Clean Light',
      outerBg: '#f8fafc',
      cardBg: '#ffffff',
      textColor: '#0f172a',
      secondaryTextColor: '#64748b',
      borderColor: '#e2e8f0',
    },
  ];

  /**
   * Generates a fully compiled, responsive email layout with the customized properties
   */
  const generateEmailHtml = (cfg: EmailCustomizerConfig): string => {
    // Extract inner content from currentHtml if available
    let bodySnippet = innerContent;
    const cardMatch = currentHtml.match(/<div class="card"[^>]*>([\s\S]*?)<\/div>\s*<div class="footer"/i);
    if (cardMatch && cardMatch[1]) {
      // Remove any previously inserted logo/badge/cta to avoid duplicate header elements
      bodySnippet = cardMatch[1]
        .replace(/<div class="logo-container"[\s\S]*?<\/div>/gi, '')
        .replace(/<span class="badge"[\s\S]*?<\/span>/gi, '')
        .replace(/<div class="cta-container"[\s\S]*?<\/div>/gi, '')
        .trim();
    }

    let ctaButtonCss = `background-color: ${cfg.accentColor}; color: #ffffff !important;`;
    if (cfg.ctaStyle === 'gradient') {
      ctaButtonCss = `background: linear-gradient(135deg, ${cfg.accentColor} 0%, #004fb3 100%); color: #ffffff !important;`;
    } else if (cfg.ctaStyle === 'outline') {
      ctaButtonCss = `background-color: transparent; border: 2px solid ${cfg.accentColor}; color: ${cfg.accentColor} !important;`;
    }

    const ctaShadow = cfg.ctaGlow
      ? `box-shadow: 0 4px 20px ${cfg.accentColor}40;`
      : 'box-shadow: none;';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.companyName} Notification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${cfg.outerBg};
      font-family: ${cfg.fontFamily};
      color: ${cfg.textColor};
    }
    .wrapper {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
      padding: 36px 20px;
    }
    .logo-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 26px;
      font-weight: 900;
      color: ${cfg.textColor};
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .logo-accent {
      color: ${cfg.accentColor};
    }
    .card {
      background-color: ${cfg.cardBg};
      border: ${cfg.hasCardBorder ? `1px solid ${cfg.borderColor}` : 'none'};
      border-radius: ${cfg.cardBorderRadius}px;
      padding: 40px 32px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.35);
    }
    .badge {
      display: inline-block;
      background: ${cfg.badgeBg};
      border: 1px solid ${cfg.accentColor}40;
      color: ${cfg.badgeColor};
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 9999px;
      margin-bottom: 18px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: ${cfg.textColor};
      margin: 0 0 16px;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      line-height: 1.65;
      color: ${cfg.secondaryTextColor};
      margin: 0 0 20px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .cta-button {
      display: inline-block;
      ${ctaButtonCss}
      ${ctaShadow}
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: ${cfg.ctaRadius}px;
      transition: all 0.2s ease;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: ${cfg.secondaryTextColor};
      line-height: 1.6;
    }
    .footer a {
      color: ${cfg.accentColor};
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <a href="{{action_url}}" class="logo"><span class="logo-accent">${cfg.logoAccentLetter}</span>${cfg.logoText}</a>
    </div>

    <div class="card">
      ${cfg.showBadge ? `<div style="text-align: center;"><span class="badge">${cfg.badgeText}</span></div>` : ''}

      ${bodySnippet}

      ${
        cfg.showCtaButton
          ? `<div class="cta-container">
        <a href="${cfg.ctaUrl}" class="cta-button">${cfg.ctaText}</a>
      </div>`
          : ''
      }
    </div>

    <div class="footer">
      © {{year}} ${cfg.companyName}. All rights reserved.<br>
      ${
        cfg.showUnsubscribe
          ? `You received this email because you have a ${cfg.companyName} account.<br>`
          : ''
      }
      Contact support at <a href="mailto:${cfg.supportEmail}">${cfg.supportEmail}</a>
      ${
        cfg.showSocials
          ? `<div style="margin-top: 12px;">
        <a href="https://groundwork.app" style="margin: 0 8px;">Website</a> •
        <a href="https://twitter.com" style="margin: 0 8px;">Updates</a> •
        <a href="mailto:${cfg.supportEmail}" style="margin: 0 8px;">Help Center</a>
      </div>`
          : ''
      }
    </div>
  </div>
</body>
</html>`;
  };

  const handleApply = () => {
    const compiled = generateEmailHtml(config);
    onApplyCustomization(compiled);
  };

  return (
    <div className={clsx('rounded-2xl border glass p-5 space-y-5', isDark ? 'border-gray-800' : 'border-slate-200')}>
      {/* Top Header & Apply Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-[#0066FF]" />
          <div>
            <h3 className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              HTML Visual Customizer
            </h3>
            <p className="text-[11px] text-gray-400">
              Customize colors, branding, CTA button, and container dimensions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0066dd] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
        >
          <Sparkles size={13} />
          Apply Styling to Template
        </button>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/5 w-fit">
        {[
          { id: 'theme', label: 'Color & Theme', icon: Palette },
          { id: 'branding', label: 'Brand & Badge', icon: ShieldCheck },
          { id: 'button', label: 'CTA Button', icon: MousePointerClick },
          { id: 'footer', label: 'Footer & Meta', icon: Layout },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                activeSection === tab.id
                  ? 'bg-[#0066FF] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: THEME & COLOR PALETTE */}
      {activeSection === 'theme' && (
        <div className="space-y-4">
          {/* Preset Theme Palettes */}
          <div>
            <label className="text-[11px] font-bold uppercase text-gray-400 block mb-2">
              Preset Color Themes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presetThemes.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      outerBg: preset.outerBg,
                      cardBg: preset.cardBg,
                      textColor: preset.textColor,
                      secondaryTextColor: preset.secondaryTextColor,
                      borderColor: preset.borderColor,
                    }))
                  }
                  className={clsx(
                    'p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02]',
                    config.outerBg === preset.outerBg && config.cardBg === preset.cardBg
                      ? 'border-[#0066FF] ring-1 ring-[#0066FF]'
                      : 'border-gray-800'
                  )}
                  style={{ backgroundColor: preset.outerBg }}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-1.5 border flex items-center justify-center font-bold text-[10px]"
                    style={{
                      backgroundColor: preset.cardBg,
                      color: preset.textColor,
                      borderColor: preset.borderColor,
                    }}
                  >
                    Card
                  </div>
                  <span className="text-[10px] font-bold block truncate" style={{ color: preset.textColor }}>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Presets */}
          <div>
            <label className="text-[11px] font-bold uppercase text-gray-400 block mb-2">
              Brand Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {presetAccents.map((acc) => (
                <button
                  key={acc.hex}
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      accentColor: acc.hex,
                      badgeColor: acc.hex,
                      badgeBg: `${acc.hex}25`,
                    }))
                  }
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                    config.accentColor === acc.hex
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  )}
                  style={{ backgroundColor: `${acc.hex}20` }}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: acc.hex }} />
                  <span>{acc.name}</span>
                </button>
              ))}

              <input
                type="color"
                value={config.accentColor}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    accentColor: e.target.value,
                    badgeColor: e.target.value,
                  }))
                }
                className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0"
                title="Custom color picker"
              />
            </div>
          </div>

          {/* Card Border Radius & Borders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-300">Card Corner Radius</span>
                <span className="font-mono text-[#0066FF]">{config.cardBorderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="36"
                step="4"
                value={config.cardBorderRadius}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, cardBorderRadius: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-[#0066FF]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Card Border</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, hasCardBorder: true }))}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg border text-xs font-semibold',
                    config.hasCardBorder ? 'bg-[#0066FF]/20 border-[#0066FF] text-white' : 'border-gray-800 text-gray-400'
                  )}
                >
                  Visible
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, hasCardBorder: false }))}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg border text-xs font-semibold',
                    !config.hasCardBorder ? 'bg-[#0066FF]/20 border-[#0066FF] text-white' : 'border-gray-800 text-gray-400'
                  )}
                >
                  None
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BRANDING & BADGE */}
      {activeSection === 'branding' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                Logo Brand Text
              </label>
              <input
                type="text"
                value={config.logoText}
                onChange={(e) => setConfig((prev) => ({ ...prev, logoText: e.target.value }))}
                className={clsx(
                  'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                  isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                )}
                placeholder="roundwork."
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                Accent Initial Letter
              </label>
              <input
                type="text"
                maxLength={2}
                value={config.logoAccentLetter}
                onChange={(e) => setConfig((prev) => ({ ...prev, logoAccentLetter: e.target.value }))}
                className={clsx(
                  'w-full px-3 py-2 rounded-xl border text-xs font-bold text-[#0066FF] outline-none',
                  isDark ? 'bg-black/30 border-gray-700' : 'bg-slate-50 border-slate-300'
                )}
                placeholder="g"
              />
            </div>
          </div>

          {/* Header Badge */}
          <div className="pt-2 border-t border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300">Header Highlight Badge</label>
              <input
                type="checkbox"
                checked={config.showBadge}
                onChange={(e) => setConfig((prev) => ({ ...prev, showBadge: e.target.checked }))}
                className="w-4 h-4 accent-[#0066FF]"
              />
            </div>

            {config.showBadge && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={config.badgeText}
                    onChange={(e) => setConfig((prev) => ({ ...prev, badgeText: e.target.value }))}
                    className={clsx(
                      'w-full px-3 py-1.5 rounded-lg border text-xs outline-none',
                      isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                    )}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={config.badgeColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          badgeColor: e.target.value,
                          badgeBg: `${e.target.value}20`,
                        }))
                      }
                      className={clsx(
                        'flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono outline-none',
                        isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                      )}
                    />
                    <input
                      type="color"
                      value={config.badgeColor}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          badgeColor: e.target.value,
                          badgeBg: `${e.target.value}20`,
                        }))
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: CTA BUTTON */}
      {activeSection === 'button' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Include Call to Action Button</span>
            <input
              type="checkbox"
              checked={config.showCtaButton}
              onChange={(e) => setConfig((prev) => ({ ...prev, showCtaButton: e.target.checked }))}
              className="w-4 h-4 accent-[#0066FF]"
            />
          </div>

          {config.showCtaButton && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={config.ctaText}
                    onChange={(e) => setConfig((prev) => ({ ...prev, ctaText: e.target.value }))}
                    className={clsx(
                      'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                      isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                    )}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                    Action URL
                  </label>
                  <input
                    type="text"
                    value={config.ctaUrl}
                    onChange={(e) => setConfig((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                    className={clsx(
                      'w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none',
                      isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                    )}
                  />
                </div>
              </div>

              {/* Button Style Variants */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {(['solid', 'gradient', 'outline'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, ctaStyle: style }))}
                    className={clsx(
                      'py-2 rounded-xl border text-xs font-bold capitalize transition-all',
                      config.ctaStyle === style
                        ? 'border-[#0066FF] bg-[#0066FF]/20 text-white'
                        : 'border-gray-800 text-gray-400'
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Glow and Corner Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-300">Button Corner Radius</span>
                    <span className="font-mono text-[#0066FF]">{config.ctaRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="2"
                    value={config.ctaRadius}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, ctaRadius: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-[#0066FF]"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start sm:gap-4 pt-3">
                  <span className="text-xs font-semibold text-gray-300">Glow Shadow</span>
                  <input
                    type="checkbox"
                    checked={config.ctaGlow}
                    onChange={(e) => setConfig((prev) => ({ ...prev, ctaGlow: e.target.checked }))}
                    className="w-4 h-4 accent-[#0066FF]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: FOOTER & META */}
      {activeSection === 'footer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig((prev) => ({ ...prev, companyName: e.target.value }))}
                className={clsx(
                  'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                  isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                )}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig((prev) => ({ ...prev, supportEmail: e.target.value }))}
                className={clsx(
                  'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                  isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300'
                )}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Display Unsubscribe Note</span>
              <input
                type="checkbox"
                checked={config.showUnsubscribe}
                onChange={(e) => setConfig((prev) => ({ ...prev, showUnsubscribe: e.target.checked }))}
                className="w-4 h-4 accent-[#0066FF]"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Show Social Links in Footer</span>
              <input
                type="checkbox"
                checked={config.showSocials}
                onChange={(e) => setConfig((prev) => ({ ...prev, showSocials: e.target.checked }))}
                className="w-4 h-4 accent-[#0066FF]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
