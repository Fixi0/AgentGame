import React from 'react';
import { createRoot } from 'react-dom/client';

// Temporarily disable service worker registration to avoid stale chunk/index mismatches
// that cause "importing a module script failed" on mobile browsers.

const rootEl = document.getElementById('root');
const bootFallback = document.getElementById('boot-fallback');
const showBootError = (error) => {
  if (!bootFallback) return;
  bootFallback.innerHTML = `
    <div style="max-width:360px;text-align:center;">
      <div style="font-size:42px;line-height:1;margin-bottom:12px;">⚠️</div>
      <div style="font-size:18px;font-weight:900;letter-spacing:.08em;margin-bottom:6px;">Agent FC</div>
      <div style="font-size:13px;color:#b42318;line-height:1.6;margin-bottom:14px;">Le jeu n'a pas pu démarrer.</div>
      <pre style="margin:0;padding:12px;border-radius:8px;background:#fff5f5;color:#8b1c1c;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;">${String(error?.message ?? error ?? 'Erreur inconnue')}</pre>
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
    createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <FootballAgentGame />
        </ErrorBoundary>
      </React.StrictMode>,
    );
    if (bootFallback) bootFallback.remove();
  } catch (error) {
    console.error('[AgentFoot] boot failed', error);
    showBootError(error);
  }
})();
