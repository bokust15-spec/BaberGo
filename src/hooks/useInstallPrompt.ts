import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Wraps the browser's native "install this site as an app" flow. Chrome/Edge/Android
// fire beforeinstallprompt and let us trigger the OS dialog directly from a button click.
// iOS Safari has no such API — Apple never exposes it — so there we can only detect
// "this is a real install candidate" and point the user to the manual Share menu steps.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canInstall = !isStandalone && (!!deferredPrompt || isIOS);

  const promptInstall = async (): Promise<'native' | 'ios-instructions' | 'unavailable'> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return 'native';
    }
    if (isIOS) return 'ios-instructions';
    return 'unavailable';
  };

  return { canInstall, isIOS, promptInstall };
}
