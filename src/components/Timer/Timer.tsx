import React from 'react';
import { Play, Pause, Square, VolumeX } from 'lucide-react';
import logo from '../../assets/Tmurv-logo.png';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { startTimer, pauseTimer, resetTimer } from '../../store/pomodoroSlice';
import styles from './Timer.module.css';

interface TimerProps {
  onDismissSound: () => void;
}

export const Timer: React.FC<TimerProps> = ({ onDismissSound }) => {
  const dispatch = useAppDispatch();
  
  const {
    state,
    timeLeft,
    cycles,
    isRunning,
    isSoundPlaying,
  } = useAppSelector((state) => state.pomodoro);

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

  const getTimerDisplayClass = () => {
    let cls = styles.timerDisplay;
    if (state === 'WORK') cls += ` ${styles.stateWork}`;
    else if (state === 'SHORT_BREAK') cls += ` ${styles.stateShortBreak}`;
    else if (state === 'LONG_BREAK') cls += ` ${styles.stateLongBreak}`;
    else cls += ` ${styles.stateIdle}`;
    return cls;
  };

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerLogoContainer}>
        <img 
          src={logo} 
          className={`${styles.timerLogoImg} ${isRunning ? styles.pulseSlow : ''}`} 
          alt="Tmurv Logo" 
        />
      </div>
      <div className={styles.statusText}>{getStateText()}</div>
      
      <div className={getTimerDisplayClass()}>
        {mins}:{secs}
      </div>

      <div className={styles.cycleDots}>
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`${styles.dot} ${i < (cycles % 4) ? styles.active : ''}`} 
          />
        ))}
      </div>

      <div className={styles.btnGroup} style={{ marginTop: '32px' }}>
        {isSoundPlaying ? (
          <button 
            className={`${styles.btn} ${styles.btnDismissSound}`} 
            onClick={onDismissSound} 
            title="Stop sound and start break"
          >
            <VolumeX size={28} />
            <span className={styles.dismissLabel}>Dismiss</span>
          </button>
        ) : (
          <>
            {isRunning ? (
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`} 
                onClick={() => dispatch(pauseTimer())}
              >
                <Pause size={32} />
              </button>
            ) : (
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`} 
                onClick={() => dispatch(startTimer())}
              >
                <Play size={32} style={{ marginLeft: '4px' }} />
              </button>
            )}
            
            <button 
              className={styles.btn} 
              onClick={() => dispatch(resetTimer())}
            >
              <Square size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
