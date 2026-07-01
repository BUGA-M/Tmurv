import { useState } from 'react';
import logo from './assets/Tmurv-logo.png';
import { Timer } from './components/Timer';
import { SettingsPanel } from './components/SettingsPanel';
import { PlanPanel } from './components/PlanPanel';
import { usePomodoro } from './hooks/usePomodoro';
import { Clock, Calendar, Settings as SettingsIcon, X, Minus } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

type Tab = 'timer' | 'plan' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const { 
    state, timeLeft, cycles, start, pause, stop, isRunning,
    workDuration, shortBreakDuration, longBreakDuration,
    updateWorkDuration, updateShortBreakDuration, updateLongBreakDuration,
    notificationsEnabled, updateNotificationsEnabled,
    minimizeToTray, updateMinimizeToTray,
    activeSound, setActiveSound,
    isSoundPlaying, dismissSound
  } = usePomodoro();

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error("Failed to minimize window", e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Failed to close window", e);
    }
  };

  const handleDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('.titlebar-controls')) {
      try {
        await getCurrentWindow().startDragging();
      } catch (err) {
        console.error("Failed to drag window", err);
      }
    }
  };

  return (
    <div className="app-container glass-panel">
      {/* Custom Title Bar for Borderless Window */}
      <div className="titlebar" onMouseDown={handleDrag} data-tauri-drag-region>
        <div className="titlebar-logo" data-tauri-drag-region>
          <img src={logo} className="titlebar-logo-img" alt="Tmurv Logo" />
          Tmurv
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn minimize" onClick={handleMinimize} title="Minimiser">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="Fermer">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Navigation Header */}
      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          <Clock size={18} />
          <span>Timer</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          <Calendar size={18} />
          <span>Plan</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={18} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="content-container">
        {activeTab === 'timer' && (
          <Timer 
            state={state}
            timeLeft={timeLeft}
            cycles={cycles}
            isRunning={isRunning}
            onStart={start}
            onPause={pause}
            onStop={stop}
            isSoundPlaying={isSoundPlaying}
            onDismissSound={dismissSound}
          />
        )}
        {activeTab === 'plan' && (
          <PlanPanel 
            workDuration={workDuration}
            shortBreakDuration={shortBreakDuration}
            longBreakDuration={longBreakDuration}
            updateWorkDuration={updateWorkDuration}
            updateShortBreakDuration={updateShortBreakDuration}
            updateLongBreakDuration={updateLongBreakDuration}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel 
            activeSound={activeSound}
            setActiveSound={setActiveSound}
            notificationsEnabled={notificationsEnabled}
            updateNotificationsEnabled={updateNotificationsEnabled}
            minimizeToTray={minimizeToTray}
            updateMinimizeToTray={updateMinimizeToTray}
          />
        )}
      </div>
    </div>
  );
}

export default App;
