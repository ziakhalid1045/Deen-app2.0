import React, { useEffect, useState } from 'react';

const InstallPwa = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<string>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall && notifyPerm !== 'default') return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 items-end">
      {showInstall && (
        <button 
          onClick={handleInstall}
          className="bg-teal-600 text-white p-3 rounded-full shadow-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
        >
          Install App
        </button>
      )}
      {notifyPerm === 'default' && (
        <button 
          onClick={async () => {
             const perm = await Notification.requestPermission();
             setNotifyPerm(perm);
             if (perm === 'granted') {
                new Notification('Deen App', { body: 'Notifications enabled successfully!', icon: '/icon-192.png' });
             }
          }}
          className="bg-purple-600 text-white p-3 rounded-full shadow-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
        >
          Enable Alerts
        </button>
      )}
    </div>
  );
};

export default InstallPwa;
