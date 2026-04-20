import React from 'react';
import { createRoot } from 'react-dom/client';
import FootballAgentGame from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FootballAgentGame />
    </ErrorBoundary>
  </React.StrictMode>,
);
