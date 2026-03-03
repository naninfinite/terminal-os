import React from 'react';
import { createRoot } from 'react-dom/client';
import './boot/fontAwesome';
import App from './App';
import './styles/global.scss';
import { ThemeProvider } from './theme/ThemeProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

const root = createRoot(container);
const initialEnterRequested = window.__TERMINAL_OS_LANDING__?.consumeEnterRequest() ?? false;

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App initialEnterRequested={initialEnterRequested} />
    </ThemeProvider>
  </React.StrictMode>
);
