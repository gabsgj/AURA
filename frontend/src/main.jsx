import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { VoiceProvider } from './contexts/VoiceContext';
import { ToastProvider } from './contexts/ToastContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <VoiceProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </VoiceProvider>
    </ThemeProvider>
  </React.StrictMode>
);