import React from 'react';
import { createRoot } from 'react-dom/client';
import FootballAgentGame from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FootballAgentGame />
    </ErrorBoundary>
  </React.StrictMode>,
);
