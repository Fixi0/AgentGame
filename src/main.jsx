import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Temporarily disable service worker registration to avoid stale chunk/index mismatches
// that cause "importing a module script failed" on mobile browsers.

const rootEl = document.getElementById('root');
const bootFallback = document.getElementById('boot-fallback');
const bootLanguage = localStorage.getItem('agentFootLanguage') || ((navigator.languages?.[0] || navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
const showBootError = (error) => {
  if (!bootFallback) return;
  const isEn = bootLanguage === 'en';
  bootFallback.innerHTML = `
    <div style="max-width:360px;text-align:center;">
      <div style="width:46px;height:46px;border-radius:8px;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;line-height:1;margin:0 auto 12px;">!</div>
      <div style="font-size:18px;font-weight:900;letter-spacing:.08em;margin-bottom:6px;">Agent FC</div>
      <div style="font-size:13px;color:#b42318;line-height:1.6;margin-bottom:14px;">${isEn ? 'The game could not start.' : "Le jeu n'a pas pu démarrer."}</div>
      <pre style="margin:0;padding:12px;border-radius:8px;background:#fff5f5;color:#8b1c1c;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;">${String(error?.message ?? error ?? (isEn ? 'Unknown error' : 'Erreur inconnue'))}</pre>
    </div>
  `;
};

window.addEventListener('error', (event) => {
  if (event?.error) showBootError(event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  if (event?.reason) showBootError(event.reason);
});

(async () => {
  try {
    const [{ default: FootballAgentGame }, { default: ErrorBoundary }] = await Promise.all([
      import('./App.jsx'),
      import('./components/ErrorBoundary.jsx'),
    ]);
    const { installAutoTranslator } = await import('./utils/i18n.js');
    createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <FootballAgentGame />
        </ErrorBoundary>
      </React.StrictMode>,
    );
    installAutoTranslator();
    if (bootFallback) bootFallback.remove();
  } catch (error) {
    console.error('[AgentFoot] boot failed', error);
    showBootError(error);
  }
})();
