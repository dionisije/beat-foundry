import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles.scss';

// Ask the browser not to evict IndexedDB under storage pressure.
// It may decline; the Settings tab shows the result.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
