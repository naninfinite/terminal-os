import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.scss';
import { ThemeProvider } from './theme/ThemeProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);


