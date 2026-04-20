import React from 'react';
import { createRoot } from 'react-dom/client';
import FootballAgentGame from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=20260420`, { updateViaCache: 'none' }).catch(() => {});
  });
}

const rootEl = document.getElementById('root');
createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FootballAgentGame />
    </ErrorBoundary>
  </React.StrictMode>,
);

const bootFallback = document.getElementById('boot-fallback');
if (bootFallback) bootFallback.remove();
