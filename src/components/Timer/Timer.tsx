import React, { useState } from 'react';
import { Play, Pause, Square, VolumeX, RotateCcw, Target, AlertTriangle } from 'lucide-react';
import logo from '../../assets/Tmurv-logo.png';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { startTimer, pauseTimer, resetTimer, stopTimer, updateDailySessions } from '../../store/pomodoroSlice';
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
    dailySessions,
    maxSessionsPerDay,
    isMiniMode,
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

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetDaily = () => {
    if (dailySessions > 0) {
      setShowResetConfirm(true);
    }
  };

  const confirmResetDaily = () => {
    dispatch(updateDailySessions(0));
    dispatch(resetTimer());
    setShowResetConfirm(false);
  };

  const cancelResetDaily = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className={`${styles.timerContainer} ${isMiniMode ? styles.miniMode : ''}`}>
      {!isMiniMode && (
        <div className={styles.timerLogoContainer}>
          <img 
            src={logo} 
            className={`${styles.timerLogoImg} ${isRunning ? styles.pulseSlow : ''}`} 
            alt="Tmurv Logo" 
          />
        </div>
      )}
      {!isMiniMode && <div className={styles.statusText}>{getStateText()}</div>}
      
      <div className={getTimerDisplayClass()}>
        {mins}:{secs}
      </div>

      {!isMiniMode && (
        <div className={styles.cycleDots}>
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`${styles.dot} ${i < (cycles % 4) ? styles.active : ''}`} 
            />
          ))}
        </div>
      )}

      {!isMiniMode && (
        <div className={styles.dailyProgressContainer}>
          <div className={styles.dailyText}>
            Sessions today: {dailySessions} / {maxSessionsPerDay}
            <button 
              className={styles.dailyResetBtn} 
              onClick={handleResetDaily}
              title="Reset daily sessions"
              disabled={dailySessions === 0}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}

      {isSoundPlaying ? (
        <div className={styles.btnGroup} style={{ marginTop: '32px' }}>
          <button 
            className={`${styles.btn} ${styles.btnDismissSound}`} 
            onClick={onDismissSound} 
            title="Stop sound"
          >
            <VolumeX size={28} />
            <span className={styles.dismissLabel}>Dismiss</span>
          </button>
        </div>
      ) : dailySessions >= maxSessionsPerDay ? (
        <div className={styles.goalReachedPopup}>
           <div className={styles.goalIconContainer}>
              <Target size={32} />
           </div>
           <h3>Daily Goal Reached!</h3>
           <p>The work for the day is finished. Take a well-deserved rest, or reset to start again.</p>
           <button onClick={handleResetDaily} className={styles.btnResetGoal}>
              <RotateCcw size={18} />
              Reset & Continue
           </button>
        </div>
      ) : (
        <div className={styles.btnGroup} style={{ marginTop: '32px' }}>
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
            onClick={() => dispatch(stopTimer())}
          >
            <Square size={24} />
          </button>
        </div>
      )}

      {showResetConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIconContainer}>
              <AlertTriangle size={24} />
            </div>
            <h3>Reset Progress?</h3>
            <p>This will reset your daily sessions and the timer. Are you sure you want to start from zero?</p>
            <div className={styles.modalBtnGroup}>
              <button onClick={cancelResetDaily} className={styles.btnCancel}>Cancel</button>
              <button onClick={confirmResetDaily} className={styles.btnConfirm}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
