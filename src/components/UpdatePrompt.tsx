import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="toast" role="status">
      {needRefresh ? (
        <>
          <span>A new version is ready.</span>
          <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
          <button className="btn" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </>
      ) : (
        <>
          <span>The app now works offline.</span>
          <button className="btn" onClick={() => setOfflineReady(false)}>
            OK
          </button>
        </>
      )}
    </div>
  );
}
