import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { RefreshCw, Download, X, AlertCircle, CheckCircle2, ArrowUpCircle } from 'lucide-react';
import './UpdaterModal.css';

interface UpdaterContextType {
  checkForUpdates: (silent: boolean) => Promise<void>;
  checking: boolean;
  updateAvailable: boolean;
}

const UpdaterContext = createContext<UpdaterContextType | undefined>(undefined);

export const useUpdater = () => {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error('useUpdater must be used within an UpdaterProvider');
  }
  return context;
};

interface UpdaterProviderProps {
  children: ReactNode;
}

type ModalState = 'idle' | 'checking' | 'available' | 'no-update' | 'downloading' | 'finished' | 'error';

export const UpdaterProvider: React.FC<UpdaterProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const checkForUpdates = async (silent: boolean) => {
    if (checking) return;
    setChecking(true);
    setErrorMessage(null);

    if (!silent) {
      setModalState('checking');
    }

    try {
      const update = await check();
      
      if (update) {
        setUpdateInfo(update);
        setModalState('available');
      } else {
        setUpdateInfo(null);
        if (!silent) {
          setModalState('no-update');
        } else {
          setModalState('idle');
        }
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      setUpdateInfo(null);
      
      if (!silent) {
        // Human-friendly error translation and explanation
        let friendlyMessage = "Une erreur inconnue est survenue.";
        const errorStr = String(err);
        
        if (errorStr.includes('Failed to fetch') || errorStr.includes('network') || errorStr.includes('connection')) {
          friendlyMessage = "Impossible de contacter le serveur de mise à jour. Veuillez vérifier votre connexion Internet.";
        } else if (errorStr.includes('signature') || errorStr.includes('verify')) {
          friendlyMessage = "La vérification de la signature cryptographique de la mise à jour a échoué (clé publique invalide ou fichier corrompu).";
        } else {
          friendlyMessage = `Erreur : ${errorStr}`;
        }
        
        setErrorMessage(friendlyMessage);
        setModalState('error');
      } else {
        setModalState('idle');
      }
    } finally {
      setChecking(false);
    }
  };

  // Run automatically at startup
  useEffect(() => {
    // We delay the startup check slightly to let the application load smoothly
    const timer = setTimeout(() => {
      checkForUpdates(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadAndInstall = async () => {
    if (!updateInfo) return;
    setModalState('downloading');
    setDownloadProgress(0);
    setErrorMessage(null);

    let downloadedBytes = 0;
    let totalBytes = 0;

    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalBytes = event.data.contentLength || 0;
            downloadedBytes = 0;
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              const pct = Math.round((downloadedBytes / totalBytes) * 100);
              setDownloadProgress(pct);
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      // Installation finished successfully, update status
      setModalState('finished');
      
      // Delay slightly so the user can read the success message before relaunch
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (relaunchErr) {
          console.error("Failed to relaunch app:", relaunchErr);
          setErrorMessage("Mise à jour installée, mais impossible de redémarrer automatiquement. Veuillez relancer l'application manuellement.");
          setModalState('error');
        }
      }, 2500);

    } catch (err: any) {
      console.error('Download or install failed:', err);
      let friendlyMessage = "Le téléchargement ou l'installation a été interrompu.";
      const errorStr = String(err);
      
      if (errorStr.includes('signature') || errorStr.includes('verify') || errorStr.includes('Minisign')) {
        friendlyMessage = "Sécurité : La signature de la mise à jour téléchargée est invalide ou ne correspond pas à la clé publique enregistrée.";
      } else if (errorStr.includes('io') || errorStr.includes('write') || errorStr.includes('permission')) {
        friendlyMessage = "Impossible d'écrire les fichiers de mise à jour sur le disque. Vérifiez les permissions de l'application.";
      } else {
        friendlyMessage = `Erreur lors de l'installation : ${errorStr}`;
      }
      
      setErrorMessage(friendlyMessage);
      setModalState('error');
    }
  };

  const handleClose = () => {
    setModalState('idle');
    setErrorMessage(null);
  };

  const renderModal = () => {
    if (modalState === 'idle') return null;

    return (
      <div className="updater-overlay">
        <div className="updater-card">
          {/* Close button for non-critical states */}
          {modalState !== 'downloading' && modalState !== 'finished' && (
            <button className="updater-close" onClick={handleClose} aria-label="Fermer">
              <X size={16} />
            </button>
          )}

          {modalState === 'checking' && (
            <>
              <div className="updater-icon-container">
                <RefreshCw size={28} className="spinner" />
              </div>
              <h3 className="updater-title">Mise à jour</h3>
              <p className="updater-subtitle">Recherche de nouvelles versions...</p>
            </>
          )}

          {modalState === 'no-update' && (
            <>
              <div className="updater-icon-container success">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="updater-title">Déjà à jour !</h3>
              <p className="updater-subtitle">
                Vous utilisez déjà la dernière version de l'application.
              </p>
              <div className="updater-actions">
                <button className="updater-btn updater-btn-primary" onClick={handleClose}>
                  Super !
                </button>
              </div>
            </>
          )}

          {modalState === 'available' && updateInfo && (
            <>
              <div className="updater-icon-container">
                <ArrowUpCircle size={28} />
              </div>
              <h3 className="updater-title">Mise à jour disponible</h3>
              <p className="updater-subtitle">
                Une nouvelle version <strong>v{updateInfo.version}</strong> est disponible (v{updateInfo.currentVersion} installée).
              </p>
              
              {updateInfo.body && (
                <>
                  <div className="updater-changelog-title">Nouveautés :</div>
                  <div className="updater-changelog">{updateInfo.body}</div>
                </>
              )}
              
              <div className="updater-actions">
                <button className="updater-btn updater-btn-secondary" onClick={handleClose}>
                  Plus tard
                </button>
                <button className="updater-btn updater-btn-primary" onClick={handleDownloadAndInstall}>
                  Mettre à jour
                </button>
              </div>
            </>
          )}

          {modalState === 'downloading' && (
            <>
              <div className="updater-icon-container">
                <Download size={28} />
              </div>
              <h3 className="updater-title">Téléchargement</h3>
              <p className="updater-subtitle">
                Téléchargement et installation des fichiers de mise à jour. Ne fermez pas l'application.
              </p>
              <div className="updater-progress-container">
                <div className="updater-progress-bg">
                  <div 
                    className="updater-progress-bar" 
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="updater-progress-text">{downloadProgress}%</div>
              </div>
            </>
          )}

          {modalState === 'finished' && (
            <>
              <div className="updater-icon-container success">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="updater-title">Mise à jour prête !</h3>
              <p className="updater-subtitle">
                L'application a été mise à jour avec succès. Elle va redémarrer dans quelques instants...
              </p>
            </>
          )}

          {modalState === 'error' && (
            <>
              <div className="updater-icon-container error">
                <AlertCircle size={28} />
              </div>
              <h3 className="updater-title">Erreur de mise à jour</h3>
              <p className="updater-subtitle">{errorMessage}</p>
              <div className="updater-actions">
                <button className="updater-btn updater-btn-secondary" onClick={handleClose}>
                  Fermer
                </button>
                {updateInfo && (
                  <button className="updater-btn updater-btn-primary" onClick={handleDownloadAndInstall}>
                    Réessayer
                  </button>
                )}
                {!updateInfo && (
                  <button className="updater-btn updater-btn-primary" onClick={() => checkForUpdates(false)}>
                    Réessayer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <UpdaterContext.Provider value={{ checkForUpdates, checking, updateAvailable: updateInfo !== null }}>
      {children}
      {renderModal()}
    </UpdaterContext.Provider>
  );
};
