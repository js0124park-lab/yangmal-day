import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { GameProvider } from './game/state';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './auth/AuthProvider';
import { SyncProvider } from './sync/SyncProvider';
import { PwaUpdater } from './components/Pwa';
import './styles/app.css';
import './styles/motion.css';
import './styles/account.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PwaUpdater />
        <AuthProvider>
          <GameProvider>
            <SyncProvider>
              <App />
            </SyncProvider>
          </GameProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
