import React, { useState, useEffect } from 'react';
import { Upload, Music, Bell, Monitor, Settings, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { readDir, exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { 
  updateActiveSound, 
  updateMinimizeToTray, 
  updateNotificationsEnabled 
} from '../../store/pomodoroSlice';
import styles from './SettingsPanel.module.css';

export const SettingsPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  
  const {
    activeSound,
    notificationsEnabled,
    minimizeToTray
  } = useAppSelector((state) => state.pomodoro);

  const [sounds, setSounds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSounds = async () => {
    try {
      const configDir = await appConfigDir();
      const soundsDir = await join(configDir, 'sounds');
      
      const soundsDirExists = await exists(soundsDir);
      if (!soundsDirExists) {
        await mkdir(soundsDir, { recursive: true });
      }
      
      const entries = await readDir(soundsDir);
      const audioFiles = entries
        .filter(e => e.isFile && (e.name?.endsWith('.mp3') || e.name?.endsWith('.wav')))
        .map(e => e.name as string);
      setSounds(audioFiles);
    } catch (e) {
      console.error("Failed to load sounds", e);
    }
  };

  useEffect(() => {
    loadSounds();
  }, []);

  const handleUpload = async () => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav']
        }]
      });

      if (selected && typeof selected === 'string') {
        const safeFileName = await invoke<string>('upload_sound', { filePath: selected });
        await loadSounds();
        dispatch(updateActiveSound(safeFileName));
      }
    } catch (e: any) {
      setError(e.toString());
      console.error("Upload error", e);
    }
  };

  const handleDelete = async (sound: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const configDir = await appConfigDir();
      const soundPath = await join(configDir, 'sounds', sound);
      await remove(soundPath);
      
      if (activeSound === sound) {
        dispatch(updateActiveSound(null));
      }
      await loadSounds();
    } catch (err: any) {
      setError(err.toString());
      console.error("Delete error", err);
    }
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <Settings size={22} className="icon-gradient" />
        <h2>Parameters</h2>
      </div>

      {/* System Settings */}
      <div className={styles.settingsGroup}>
        <div className={styles.settingsOption}>
          <div className={styles.optionLabel}>
            <Monitor size={18} />
            <div>
              <span>Minimize to System Tray</span>
              <p>Keep running in background when closed</p>
            </div>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={minimizeToTray}
              onChange={(e) => dispatch(updateMinimizeToTray(e.target.checked))}
            />
            <span className={`${styles.slider} ${styles.round}`}></span>
          </label>
        </div>

        <div className={styles.settingsOption}>
          <div className={styles.optionLabel}>
            <Bell size={18} />
            <div>
              <span>Desk Notifications</span>
              <p>Receive alert notifications when timer ends</p>
            </div>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={notificationsEnabled}
              onChange={(e) => dispatch(updateNotificationsEnabled(e.target.checked))}
            />
            <span className={`${styles.slider} ${styles.round}`}></span>
          </label>
        </div>
      </div>

      {/* Audio Alert Settings */}
      <div className={styles.settingsGroup} style={{ marginTop: '20px' }}>
        <h3 className={styles.groupTitle}>
          <Music size={16} />
          <span>Alert Sound</span>
        </h3>
        
        {error && <div className={styles.errorText}>{error}</div>}

        <div className={styles.soundList}>
          {sounds.length === 0 ? (
            <div className={styles.emptyListText}>
              No sounds available. Upload one below.
            </div>
          ) : (
            sounds.map(sound => (
              <div 
                key={sound} 
                className={`${styles.soundItem} ${activeSound === sound ? styles.selected : ''}`}
                onClick={() => dispatch(updateActiveSound(sound))}
              >
                <div className={styles.soundItemLeft}>
                  <span>{sound}</span>
                </div>
                <div className={styles.soundItemRight}>
                  {activeSound === sound && <div className={styles.dotActive} />}
                  <button 
                    className={styles.btnDeleteSound} 
                    onClick={(e) => handleDelete(sound, e)}
                    title="Delete this sound"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button className={styles.btnUpload} onClick={handleUpload}>
          <Upload size={16} />
          Upload Custom Sound
        </button>
      </div>
    </div>
  );
};
