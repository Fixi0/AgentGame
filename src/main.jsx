import React from 'react';
import { createRoot } from 'react-dom/client';
import FootballAgentGame from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FootballAgentGame />
  </React.StrictMode>,
);
