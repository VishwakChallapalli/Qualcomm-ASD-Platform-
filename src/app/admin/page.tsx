'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminPage() {
  const [adminUrl] = useState('http://127.0.0.1:8001');
  const [isAvailable, setIsAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if admin server is running
    const checkServer = async () => {
      setChecking(true);
      try {
        const response = await fetch(`${adminUrl}/index.html`, { 
          method: 'HEAD', 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        setIsAvailable(true);
      } catch (error) {
        setIsAvailable(false);
      } finally {
        setChecking(false);
      }
    };
    
    checkServer();
    // Re-check every 3 seconds
    const interval = setInterval(checkServer, 3000);
    return () => clearInterval(interval);
  }, [adminUrl]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/page4" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1 className={styles.title}>Admin Console</h1>
      </div>

      <div className={styles.content}>
        {checking ? (
          <div className={styles.checking}>
            <p>Checking if admin server is running...</p>
          </div>
        ) : isAvailable ? (
          <div className={styles.success}>
            <div className={styles.statusBox}>
              <p className={styles.statusText}>✅ Admin console is running</p>
              <p className={styles.statusNote}>
                Click the button below to open the admin console in a new tab.
                <br />
                <strong>Important:</strong> Camera access requires opening in a new tab (browser security restriction).
              </p>
            </div>
            <a 
              href={adminUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.launchButton}
              onClick={() => {
                // Force open in new tab
                window.open(adminUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              🚀 Open Admin Console in New Tab →
            </a>
            <div className={styles.infoBox}>
              <h3>Quick Access</h3>
              <p>Direct URL: <code className={styles.urlCode}>{adminUrl}</code></p>
              <p className={styles.infoNote}>
                The admin console includes:
                <br />• Camera controls for emotion detection
                <br />• Provider selection (Manual, Mock, Python + OpenCV)
                <br />• Mini-games (Identify, Mirror, Calm-down)
              </p>
            </div>
            <div className={styles.troubleshootingBox}>
              <h3>Camera Not Working?</h3>
              <ol>
                <li>Make sure you clicked "Allow" when the browser asks for camera permission</li>
                <li>Check that no other app is using your camera</li>
                <li>Try refreshing the admin console page</li>
                <li>Check browser console (F12) for any error messages</li>
                <li>Make sure you're accessing via <code>http://127.0.0.1:8000</code> (not localhost)</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className={styles.error}>
            <h2 className={styles.errorTitle}>Admin Console Not Running</h2>
            <p className={styles.errorText}>
              The admin console needs to be started separately.
            </p>
            <div className={styles.instructions}>
              <h3>Step 1: Start the Admin Console Server</h3>
              <p className={styles.stepNote}>
                Open a <strong>new terminal window</strong> and run:
              </p>
              <div className={styles.codeBlock}>
                <code>
                  cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web<br />
                  python3 -m http.server 8001 --bind 127.0.0.1
                </code>
              </div>
              
              <h3 className={styles.stepHeader}>Step 2: Verify Server is Running</h3>
              <p className={styles.stepNote}>
                You should see: <code className={styles.inlineCode}>Serving HTTP on 127.0.0.1 port 8000</code>
              </p>

              <h3 className={styles.stepHeader}>Step 3: Access the Admin Console</h3>
              <p className={styles.stepNote}>
                Once the server is running, click the button below or manually open:
              </p>
              <div className={styles.codeBlock}>
                <code>{adminUrl}</code>
              </div>
              
              <div className={styles.actionButtons}>
                <a 
                  href={adminUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.directLinkButton}
                >
                  Open {adminUrl} →
                </a>
                <button 
                  onClick={() => window.location.reload()} 
                  className={styles.refreshButton}
                >
                  ↻ Check Again
                </button>
              </div>

              <div className={styles.troubleshootingBox}>
                <h3>Still Not Working?</h3>
                <ul>
                  <li><strong>Port 8001 already in use?</strong> Use a different port: <code className={styles.inlineCode}>python3 -m http.server 8002 --bind 127.0.0.1</code></li>
                  <li><strong>Python not found?</strong> Try: <code className={styles.inlineCode}>python -m http.server 8000 --bind 127.0.0.1</code></li>
                  <li><strong>Permission denied?</strong> Make sure you're in the correct directory</li>
                  <li><strong>Camera not working?</strong> Make sure you allow camera permissions when prompted in the browser</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
