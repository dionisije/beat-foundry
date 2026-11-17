import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowButton(false);
      setInstallPrompt(null);
    }
  }

  if (!showButton) return null;

  return (
    <div className="install-prompt">
      <button className="btn btn-primary" onClick={handleInstall}>
        <Download size={18} />
        Install App
      </button>
    </div>
  );
}
