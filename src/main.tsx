import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary, reportError } from './components/ErrorBoundary.tsx';

// Catch unhandled JS errors
window.onerror = (_msg, _src, _line, _col, error) => {
  reportError(error ?? new Error(String(_msg)), 'window.onerror');
};

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, 'unhandledrejection');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
