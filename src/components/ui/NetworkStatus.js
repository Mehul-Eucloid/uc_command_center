import { useEffect, useState } from 'react';
import { checkApiHealth } from './services/api';

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    // Check API status every 30 seconds
    const interval = setInterval(async () => {
      const status = await checkApiHealth();
      setApiStatus(status);
    }, 30000);

    // Initial check
    checkApiHealth().then(setApiStatus);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!online) {
    return <div className="network-status offline">Offline - Working in limited mode</div>;
  }

  if (apiStatus && !apiStatus.online) {
    return <div className="network-status api-down">Server unavailable - Some features may not work</div>;
  }

  return null;
}