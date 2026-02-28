import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { publishBootStage } from './boot/bootProgress';
import './styles/global.scss';
import { ThemeProvider } from './theme/ThemeProvider';

publishBootStage('react_bootstrap');

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

const root = createRoot(container);
publishBootStage('app_mounted');
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

window.requestAnimationFrame(() => {
  publishBootStage('landing_interactive');
});

