import React, { useState, useEffect } from 'react';
import { Upload, Music, Bell, Monitor, Settings, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { readDir, exists, mkdir, remove } from '@tauri-apps/plugin-fs';

interface SettingsPanelProps {
  activeSound: string | null;
  setActiveSound: (sound: string | null) => void;
  notificationsEnabled: boolean;
  updateNotificationsEnabled: (val: boolean) => void;
  minimizeToTray: boolean;
  updateMinimizeToTray: (val: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  activeSound,
  setActiveSound,
  notificationsEnabled,
  updateNotificationsEnabled,
  minimizeToTray,
  updateMinimizeToTray,
}) => {
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
        setActiveSound(safeFileName);
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
        setActiveSound(null);
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
      <div className="settings-group">
        <div className="settings-option">
          <div className="option-label">
            <Monitor size={18} />
            <div>
              <span>Minimize to System Tray</span>
              <p>Keep running in background when closed</p>
            </div>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={minimizeToTray}
              onChange={(e) => updateMinimizeToTray(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="settings-option">
          <div className="option-label">
            <Bell size={18} />
            <div>
              <span>Desk Notifications</span>
              <p>Receive alert notifications when timer ends</p>
            </div>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={notificationsEnabled}
              onChange={(e) => updateNotificationsEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* Audio Alert Settings */}
      <div className="settings-group" style={{ marginTop: '20px' }}>
        <h3 className="group-title">
          <Music size={16} />
          <span>Alert Sound</span>
        </h3>
        
        {error && <div className="error-text">{error}</div>}

        <div className="sound-list">
          {sounds.length === 0 ? (
            <div className="empty-list-text">
              No sounds available. Upload one below.
            </div>
          ) : (
            sounds.map(sound => (
              <div 
                key={sound} 
                className={`sound-item ${activeSound === sound ? 'selected' : ''}`}
                onClick={() => setActiveSound(sound)}
              >
                <div className="sound-item-left">
                  <span>{sound}</span>
                </div>
                <div className="sound-item-right">
                  {activeSound === sound && <div className="dot-active" />}
                  <button 
                    className="btn-delete-sound" 
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

        <button className="btn-upload" onClick={handleUpload}>
          <Upload size={16} />
          Upload Custom Sound
        </button>
      </div>
    </div>
  );
};
