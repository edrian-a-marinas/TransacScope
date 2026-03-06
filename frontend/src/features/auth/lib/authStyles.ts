import { S } from "./authConst";
/**
 * Shared CSS injected via <style> in both LoginPage and RegisterPage.
 *
 * rootClass    — the page-level wrapper class  (.login-root | .reg-root)
 * cardClass    — the card element class         (.login-card | .reg-card)
 * maxWidth     — card max-width (px)            (420 | 460)
 * extraPadding — tighter spacing for Register (more fields, less height)
 */
export function buildAuthStyles(
  rootClass:    string,
  cardClass:    string,
  maxWidth:     number,
  extraPadding = false,
): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .${rootClass} {
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${S.bgDeep};
      position: relative;
      overflow: hidden;
      ${extraPadding ? "padding: 1.25rem 0;" : ""}
    }
    .${rootClass}::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 15% 50%, hsl(199 89% 48% / 0.06) 0%, transparent 60%),
        radial-gradient(ellipse 60% 80% at 85% 20%, hsl(220 25% 20% / 0.4) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 75% 85%, hsl(160 60% 45% / 0.04) 0%, transparent 50%);
      pointer-events: none;
    }
    .${rootClass}::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(hsl(220 20% 18% / 0.3) 1px, transparent 1px),
        linear-gradient(90deg, hsl(220 20% 18% / 0.3) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
      mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%);
    }
    @keyframes floatOnce {
      0%   { transform: translateY(0);      opacity: 0; }
      8%   { opacity: 1; }
      88%  { opacity: 1; }
      100% { transform: translateY(-105vh); opacity: 0; }
    }
    .particle {
      position: absolute;
      bottom: -2%;
      font-family: 'DM Mono', monospace;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      letter-spacing: 0.02em;
      animation: floatOnce linear forwards;
    }
    .${cardClass} {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: ${maxWidth}px;
      margin: 1.5rem;
      background: ${S.surface};
      border: 1px solid ${S.border};
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow:
        0 0 0 1px hsl(220 20% 20% / 0.5),
        0 24px 64px hsl(220 28% 4% / 0.6),
        0 0 80px hsl(199 89% 48% / 0.04);
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .${cardClass}.mounted { opacity: 1; transform: translateY(0); }

    /* ── Logo ── */
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
    .logo-icon-wrap {
      width: 36px; height: 36px; border-radius: 10px;
      background: hsl(199 89% 48% / 0.12);
      border: 1px solid hsl(199 89% 48% / 0.25);
      display: flex; align-items: center; justify-content: center;
    }
    .logo-icon-wrap img { width: 20px; height: 20px; }
    .logo-name { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: ${S.foreground}; }

    /* ── Headings ── */
    .card-title {
      font-size: 24px; font-weight: 700; letter-spacing: -0.03em;
      color: ${S.accentFg}; margin-bottom: 6px; line-height: 1.15;
    }
    .card-subtitle { font-size: 13px; color: ${S.muted}; margin-bottom: 2rem; font-weight: 400; }
    .accent-line {
      width: 36px; height: 3px; border-radius: 2px;
      background: linear-gradient(90deg, ${S.primary}, hsl(199 89% 48% / 0.3));
      margin-bottom: 2rem;
    }

    /* ── Feedback ── */
    .error-box {
      background: hsl(0 72% 51% / 0.08); border: 1px solid hsl(0 72% 51% / 0.25);
      border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem;
    }
    .error-box p { font-size: 12.5px; color: hsl(0,72%,65%); line-height: 1.5; }
    .success-box {
      background: hsl(160 60% 45% / 0.08); border: 1px solid hsl(160 60% 45% / 0.25);
      border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem;
    }
    .success-box p { font-size: 12.5px; color: hsl(160,60%,60%); line-height: 1.5; }

    /* ── Form fields ── */
    .field-group { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
    .field-wrap  { display: flex; flex-direction: column; gap: 6px; }
    .field-label {
      font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: ${S.muted};
      display: flex; align-items: center; gap: 4px;
    }
    .field-input {
      width: 100%; background: ${S.accent}; border: 1px solid ${S.border};
      border-radius: 10px; padding: 11px 14px;
      font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${S.accentFg};
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-input::placeholder { color: hsl(220,10%,34%); }
    .field-input:focus { border-color: ${S.primary}; box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12); }
    .field-input:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Buttons ── */
    .submit-btn {
      width: 100%; padding: 12px 20px; border-radius: 10px; border: none; cursor: pointer;
      font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
      letter-spacing: 0.01em; color: hsl(220,28%,7%);
      background: linear-gradient(135deg, ${S.primary} 0%, hsl(199 89% 42%) 100%);
      box-shadow: 0 4px 16px hsl(199 89% 48% / 0.25), 0 1px 3px hsl(0 0% 0% / 0.2);
      transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
      position: relative; overflow: hidden;
    }
    .submit-btn::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, hsl(0 0% 100% / 0.1) 0%, transparent 60%);
      pointer-events: none;
    }
    .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px hsl(199 89% 48% / 0.35), 0 2px 6px hsl(0 0% 0% / 0.2); }
    .submit-btn:active:not(:disabled) { transform: translateY(0); }
    .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid hsl(220 28% 7% / 0.3); border-top-color: hsl(220 28% 7%);
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Footer / divider ── */
    .card-divider { height: 1px; background: ${S.border}; margin: 1.5rem 0; }
    .card-footer { text-align: center; font-size: 13px; color: ${S.muted}; }
    .card-footer a { color: ${S.primary}; text-decoration: none; font-weight: 600; transition: color 0.15s; }
    .card-footer a:hover { color: hsl(199,89%,62%); }

    /* ── Watch demo link (login page) ── */
    .watch-demo-wrap {
      position: absolute;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    ${extraPadding ? `
    /* ── Register compact overrides — tighter spacing to fit 1080p at 100% ── */
    .${cardClass} {
      padding: 1.75rem 2.5rem;
      margin: 1rem 1.5rem;
    }
    .logo-row        { margin-bottom: 1rem; }
    .card-title      { font-size: 22px; }
    .card-subtitle   { margin-bottom: 1.25rem; }
    .accent-line     { margin-bottom: 1.25rem; }
    .card-divider    { margin: 1rem 0; }
    ` : ""}
  `;
}