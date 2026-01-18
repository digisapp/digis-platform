/**
 * Unified Email Template System for Digis
 * All emails use consistent branding with gradient accents
 */

// Brand colors
const BRAND = {
  primary: '#00D4FF', // Cyan
  secondary: '#9D4EDD', // Purple
  accent: '#FF006E', // Pink
  background: '#0a0a0a',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#ffffff',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  textDark: '#6b7280',
  border: 'rgba(255, 255, 255, 0.1)',
};

const GRADIENT = `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 50%, ${BRAND.accent} 100%)`;

interface BaseTemplateOptions {
  preheader?: string;
  title: string;
  emoji?: string;
  greeting?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  showSocials?: boolean;
}

/**
 * Base HTML email template with Digis branding
 */
export function baseEmailTemplate(options: BaseTemplateOptions): string {
  const {
    preheader = '',
    title,
    emoji = '✨',
    greeting,
    body,
    ctaText,
    ctaUrl,
    footerNote,
    showSocials = true,
  } = options;

  const ctaHtml = ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; background: ${GRADIENT}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const footerNoteHtml = footerNote ? `
    <p style="margin: 24px 0 0; color: ${BRAND.textMuted}; font-size: 13px; line-height: 1.6; text-align: center;">
      ${footerNote}
    </p>
  ` : '';

  const socialsHtml = showSocials ? `
    <table cellpadding="0" cellspacing="0" style="margin: 16px auto 0;">
      <tr>
        <td style="padding: 0 8px;">
          <a href="https://instagram.com/diglobal.cc" style="color: ${BRAND.textDark}; text-decoration: none; font-size: 12px;">Instagram</a>
        </td>
        <td style="color: ${BRAND.textDark};">•</td>
        <td style="padding: 0 8px;">
          <a href="https://tiktok.com/@digis.cc" style="color: ${BRAND.textDark}; text-decoration: none; font-size: 12px;">TikTok</a>
        </td>
        <td style="color: ${BRAND.textDark};">•</td>
        <td style="padding: 0 8px;">
          <a href="https://x.com/diglobal_cc" style="color: ${BRAND.textDark}; text-decoration: none; font-size: 12px;">X</a>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: ${BRAND.background}; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid ${BRAND.border}; border-radius: 20px; overflow: hidden;">

          <!-- Header with gradient -->
          <tr>
            <td align="center" style="background: ${GRADIENT}; padding: 40px 32px;">
              <p style="margin: 0 0 12px; font-size: 48px; line-height: 1;">${emoji}</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; line-height: 1.3;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${greeting ? `<p style="margin: 0 0 20px; color: ${BRAND.textPrimary}; font-size: 18px; line-height: 1.6;">${greeting}</p>` : ''}

              <div style="color: ${BRAND.textSecondary}; font-size: 15px; line-height: 1.7;">
                ${body}
              </div>

              ${ctaHtml}
              ${footerNoteHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid ${BRAND.border};">
              <!-- Logo -->
              <img src="https://digis.cc/images/digis-logo-white.png" alt="Digis" width="80" style="margin-bottom: 16px; opacity: 0.8;" />

              ${socialsHtml}

              <p style="margin: 16px 0 0; color: ${BRAND.textDark}; font-size: 11px;">
                © ${new Date().getFullYear()} Digis. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: ${BRAND.textDark}; font-size: 11px;">
                <a href="https://digis.cc/settings" style="color: ${BRAND.textDark};">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Info box component for highlighting important information
 */
export function infoBox(items: { label: string; value: string }[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; border-bottom: 1px solid ${BRAND.border};">${item.label}</td>
        <td style="padding: 8px 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid ${BRAND.border};">${item.value}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
      ${rows}
    </table>
  `;
}

/**
 * Feature list component
 */
export function featureList(features: { icon: string; title: string; desc: string }[]): string {
  const rows = features
    .map(
      (f) => `
      <tr>
        <td style="padding: 12px 0;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="44" style="font-size: 24px; vertical-align: top; padding-right: 12px;">${f.icon}</td>
              <td style="vertical-align: top;">
                <p style="margin: 0 0 4px; color: ${BRAND.textPrimary}; font-size: 15px; font-weight: 600;">${f.title}</p>
                <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 13px;">${f.desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">${rows}</table>`;
}

/**
 * Alert/warning box component
 */
export function alertBox(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): string {
  const colors = {
    info: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)', icon: 'ℹ️' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', icon: '⚠️' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', icon: '❌' },
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', icon: '✅' },
  };

  const { bg, border, icon } = colors[type];

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: ${bg}; border: 1px solid ${border}; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 20px; padding-right: 12px; vertical-align: top;">${icon}</td>
              <td style="color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.5;">${message}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Code/verification code display
 */
export function codeBlock(code: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; padding: 20px 40px; background: rgba(255, 255, 255, 0.05); border: 2px dashed ${BRAND.border}; border-radius: 12px;">
            <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${BRAND.primary};">${code}</span>
          </div>
        </td>
      </tr>
    </table>
  `;
}
