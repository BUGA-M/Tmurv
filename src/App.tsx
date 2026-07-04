import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import logo from './assets/Tmurv-logo.png';
import { TimerPage } from './pages/TimerPage';
import { UpdaterProvider } from './context/UpdaterContext';
import { PlanPage } from './pages/PlanPage';
import { SettingsPage } from './pages/SettingsPage';
import { usePomodoroTimer } from './hooks/usePomodoroTimer';
import { Clock, Calendar, Settings as SettingsIcon, X, Minus, Pin, PinOff } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store/store';
import { setIsMiniMode } from './store/pomodoroSlice';

function AppContent() {
  const { isLoaded, dismissSound } = usePomodoroTimer();
  const dispatch = useAppDispatch();
  const isMiniMode = useAppSelector((state) => state.pomodoro.isMiniMode);

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

  const toggleMiniMode = () => {
    dispatch(setIsMiniMode(!isMiniMode));
  };

  useEffect(() => {
    invoke('toggle_mini_mode', { enable: isMiniMode }).catch((e) => {
      console.error("Failed to toggle mini mode", e);
    });
  }, [isMiniMode]);

  if (!isLoaded) {
    return (
      <div className="app-container glass-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          Loading Settings...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container glass-panel">
      {/* Custom Title Bar for Borderless Window */}
      <div className="titlebar" onMouseDown={handleDrag} data-tauri-drag-region>
        <div className="titlebar-logo" data-tauri-drag-region>
          <img src={logo} className="titlebar-logo-img" alt="Tmurv Logo" />
          Tmurv
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn minimize" onClick={toggleMiniMode} title={isMiniMode ? "Exit Mini Player" : "Mini Player (Always on Top)"}>
            {isMiniMode ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button className="titlebar-btn minimize" onClick={handleMinimize} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Navigation Header */}
      {!isMiniMode && (
        <nav className="tab-navigation">
          <NavLink 
            to="/" 
            className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
            end
          >
            <Clock size={18} />
            <span>Timer</span>
          </NavLink>
          <NavLink 
            to="/plan" 
            className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
          >
            <Calendar size={18} />
            <span>Plan</span>
          </NavLink>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>
      )}

      {/* Main Content Area */}
      <div className="content-container">
        <Routes>
          <Route path="/" element={<TimerPage onDismissSound={dismissSound} />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UpdaterProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </UpdaterProvider>
  );
}
