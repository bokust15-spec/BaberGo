import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registers the service worker that makes BaberGo installable ("Add to Home Screen").
// Only in production — in dev it would keep serving a stale cached bundle across HMR.
//
// A new deploy means a new SW script; without the two blocks below, a pro who already
// had the installed PWA open (or backgrounded, on a phone that keeps it alive) would
// keep running the OLD JS in memory indefinitely — closing and reopening the app icon
// is not a real page reload, so it wouldn't pick up the new bundle on its own. This is
// the standard "auto-update" pattern: check for a new SW every time the app regains
// focus (covers "close and reopen"), and hard-reload the one time a new SW takes over.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    }).catch(() => {});
  });

  let reloadedForNewVersion = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForNewVersion) return;
    reloadedForNewVersion = true;
    window.location.reload();
  });
}
