import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// --- THIS IS THE CORRECTED IMPORT SECTION ---
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
    startNewStockTakeSession, 
    getActiveStockTakeSession, 
    finishStockTakeSession, 
    findInventoryItemById 
} from './firestoreAPI';
// ---
import { SessionScreen } from './components/SessionScreen';
import { ChecklistScreen } from './components/ChecklistScreen';
import { CountingModal } from './components/CountingModal';
import './App.css';
import tojemLogo from './assets/tojem-logo.png';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  const [currentView, setCurrentView] = useState('session');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 

  const [scanContext, setScanContext] = useState({ mode: 'general', expectedId: null });
  const scannerRef = useRef(null);

  useEffect(() => {
    const authenticateApp = async () => {
      try {
        const email = import.meta.env.VITE_SCANNER_USER_EMAIL;
        const password = import.meta.env.VITE_SCANNER_USER_PASSWORD;
        if (!email || !password) {
            throw new Error("Scanner credentials not configured.");
        }
        await signInWithEmailAndPassword(auth, email, password);
        setIsReady(true);
      } catch (err) {
        console.error("Initialization failed:", err);
        setError("App authentication failed. Please check credentials and redeploy.");
      }
    };
    
    authenticateApp();
  }, []);

  useEffect(() => {
    if (isScanning) {
      const onScanSuccess = async (decodedText) => {
        stopScanner();
        if (scanContext.mode === 'verify') {
            if (decodedText === scanContext.expectedId) {
                setSelectedItem(prev => ({ ...prev, isVerified: true }));
            } else {
                alert("Wrong item scanned! Please scan the QR code for the correct item.");
            }
        } else { 
            try {
                const item = await findInventoryItemById(decodedText);
                setSelectedItem(item);
            } catch (err) {
                alert(err.message);
            }
        }
      };
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 }};
      scannerRef.current = new Html5Qrcode("qr-reader-modal");
      scannerRef.current.start({ facingMode: "environment" }, config, onScanSuccess)
          .catch(err => {
              console.error("Scanner start error", err);
              stopScanner();
          });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup.", err));
      }
    };
  }, [isScanning, scanContext]);


  const startScanner = (context = { mode: 'general', expectedId: null }) => {
    setScanContext(context);
    setIsScanning(true);
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => {});
    }
    setIsScanning(false);
  };
  
  const handleStartNewSession = async () => {
      const newSessionId = await startNewStockTakeSession();
      setActiveSessionId(newSessionId);
      setCurrentView('checklist');
  };

  const handleContinueSession = (sessionId) => {
      setActiveSessionId(sessionId);
      setCurrentView('checklist');
  };

  const handleFinishSession = async (sessionId) => {
      await finishStockTakeSession(sessionId);
      setActiveSessionId(null);
      setCurrentView('session');
  };

  const handleModalClose = (wasUpdated) => {
      if (wasUpdated) {
          setRefreshKey(prev => prev + 1);
      }
      setSelectedItem(null);
  };

  const renderCurrentView = () => {
    if (!isReady) return <h1 style={{ color: 'white', textAlign: 'center' }}>Initializing Workshop App...</h1>;
    if (error) return <h1 style={{ color: '#f87171', textAlign: 'center' }}>{error}</h1>;

    switch (currentView) {
        case 'checklist':
            return <ChecklistScreen key={refreshKey} sessionId={activeSessionId} onSelectItem={setSelectedItem} onScanRequest={startScanner} onFinish={() => handleFinishSession(activeSessionId)} />;
        default:
            return <SessionScreen onStartNew={handleStartNewSession} onContinue={handleContinueSession} />;
    }
  };
  
  return (
    <div>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <img src={tojemLogo} alt="TOJEM Logo" style={{ height: '80px' }} />
      </header>

      <main>
        {renderCurrentView()}

        {selectedItem && (
            <CountingModal 
                item={selectedItem}
                sessionId={activeSessionId}
                onClose={handleModalClose}
                onVerifyScanRequest={() => startScanner({ mode: 'verify', expectedId: selectedItem.id })}
            />
        )}
        
        {isScanning && (
            <div className="modal-backdrop">
                <div className="card" style={{maxWidth: '500px', width: '100%'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2 style={{textAlign: 'center', marginTop: 0}}>Scan Item QR Code</h2>
                        <button className="button button-danger" style={{width: 'auto', padding: '0.5rem 1rem'}} onClick={stopScanner}>Cancel</button>
                    </div>
                    <div id="qr-reader-modal" style={{width: '100%', marginTop: '1rem', backgroundColor: 'black'}}></div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;