import React from 'react';
import { Play, Pause, Square, VolumeX } from 'lucide-react';
import logo from '../assets/Tmurv-logo.png';
import { PomodoroState } from '../hooks/usePomodoro';

interface TimerProps {
  state: PomodoroState;
  timeLeft: number;
  cycles: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  isSoundPlaying: boolean;
  onDismissSound: () => void;
}

export const Timer: React.FC<TimerProps> = ({ state, timeLeft, cycles, isRunning, onStart, onPause, onStop, isSoundPlaying, onDismissSound }) => {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  const getStateText = () => {
    switch (state) {
      case 'WORK': return 'Focus Time';
      case 'SHORT_BREAK': return 'Short Break';
      case 'LONG_BREAK': return 'Long Break';
      default: return 'Ready to Focus';
    }
  };

  return (
    <div className="timer-container">
      <div className="timer-logo-container">
        <img src={logo} className={`timer-logo-img ${isRunning ? 'pulse-slow' : ''}`} alt="Tmurv Logo" />
      </div>
      <div className="status-text">{getStateText()}</div>
      
      <div className={`timer-display state-${state}`}>
        {mins}:{secs}
      </div>

      <div className="cycle-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`dot ${i < (cycles % 4) ? 'active' : ''}`} />
        ))}
      </div>

      <div className="btn-group" style={{ marginTop: '32px' }}>
        {isSoundPlaying ? (
          <button className="btn btn-dismiss-sound" onClick={onDismissSound} title="Arrêter le son et commencer la pause">
            <VolumeX size={28} />
            <span className="dismiss-label">Dismiss</span>
          </button>
        ) : (
          <>
            {isRunning ? (
              <button className="btn btn-primary" onClick={onPause}>
                <Pause size={32} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onStart}>
                <Play size={32} style={{ marginLeft: '4px' }} />
              </button>
            )}
            
            <button className="btn" onClick={onStop}>
              <Square size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
