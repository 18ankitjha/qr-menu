import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './responsive.css';
import { installAlertSoundUnlock } from './utils/alert-sound';

// Unlock table-alert sound on the very first tap (even the login button), so waiters don't have to tap again
installAlertSoundUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
