import React from 'react';
import { Calendar, Clock, Target, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { 
  updateWorkDuration, 
  updateShortBreakDuration, 
  updateLongBreakDuration,
  updateMaxSessionsPerDay
} from '../../store/pomodoroSlice';
import styles from './PlanPanel.module.css';

interface TimelineStep {
  type: 'work' | 'break' | 'long-break';
  label: string;
  duration: number;
}

export const PlanPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  
  const {
    state,
    timeLeft,
    cycles,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    isSoundPlaying,
    maxSessionsPerDay,
  } = useAppSelector((state) => state.pomodoro);

  const handleDurationChange = (
    value: string, 
    updater: (val: number) => any
  ) => {
    const mins = parseInt(value, 10);
    if (!isNaN(mins) && mins > 0) {
      dispatch(updater(mins * 60));
    }
  };

  const workMins = Math.floor(workDuration / 60);
  const shortMins = Math.floor(shortBreakDuration / 60);
  const longMins = Math.floor(longBreakDuration / 60);

  const steps: TimelineStep[] = [
    { type: 'work', label: 'Work', duration: workDuration },
    { type: 'break', label: 'Short', duration: shortBreakDuration },
    { type: 'work', label: 'Work', duration: workDuration },
    { type: 'break', label: 'Short', duration: shortBreakDuration },
    { type: 'work', label: 'Work', duration: workDuration },
    { type: 'break', label: 'Short', duration: shortBreakDuration },
    { type: 'work', label: 'Work', duration: workDuration },
    { type: 'long-break', label: 'Long', duration: longBreakDuration },
  ];

  let activeIndex = -1;
  if (isSoundPlaying) {
    if (state === 'WORK') {
      if (cycles % 4 === 0) {
        activeIndex = 7;
      } else {
        activeIndex = ((cycles - 1) % 4) * 2 + 1;
      }
    } else {
      activeIndex = (cycles % 4) * 2;
    }
  } else {
    if (state === 'WORK') {
      activeIndex = (cycles % 4) * 2;
    } else if (state === 'SHORT_BREAK') {
      activeIndex = ((cycles - 1) % 4) * 2 + 1;
    } else if (state === 'LONG_BREAK') {
      activeIndex = 7;
    } else {
      activeIndex = (cycles % 4) * 2;
    }
  }

  const activeStep = steps[activeIndex];
  const progressPercent = activeStep && state !== 'IDLE'
    ? Math.min(100, Math.max(0, ((activeStep.duration - timeLeft) / activeStep.duration) * 100))
    : 0;

  const getStepColor = (type: 'work' | 'break' | 'long-break') => {
    switch (type) {
      case 'work': return 'var(--work-color)';
      case 'break': return 'var(--break-color)';
      case 'long-break': return 'var(--long-break-color)';
    }
  };

  const getConnectorClass = (isCompleted: boolean, type: string) => {
    let cls = styles.timelineConnector;
    if (isCompleted) {
      cls += ` ${styles.completed}`;
      if (type === 'work') cls += ` ${styles.work}`;
      else if (type === 'break') cls += ` ${styles.break}`;
      else if (type === 'long-break') cls += ` ${styles.longBreak}`;
    }
    return cls;
  };

  const getNodeClass = (isCompleted: boolean, isActive: boolean, isLocked: boolean, type: string) => {
    let cls = styles.timelineNode;
    if (type === 'work') cls += ` ${styles.work}`;
    else if (type === 'break') cls += ` ${styles.break}`;
    else if (type === 'long-break') cls += ` ${styles.longBreak}`;

    if (isCompleted) cls += ` ${styles.completed}`;
    else if (isActive) cls += ` ${styles.active}`;
    else if (isLocked) cls += ` ${styles.locked}`;

    return cls;
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <Calendar size={22} className="icon-gradient" />
        <h2>Pomodoro Plan</h2>
      </div>

      {/* Visual Timeline of Cycles */}
      <div className={styles.timelineCard}>
        <div className={styles.timelineTitle}>Complete Cycle Schema</div>
        <div className={styles.timelineTrack}>
          {steps.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isActive = index === activeIndex;
            const isLocked = index > activeIndex;

            // Calculate background style for badge
            let badgeStyle: React.CSSProperties = {};
            if (isCompleted) {
              badgeStyle.background = getStepColor(step.type);
            } else if (isActive) {
              badgeStyle.background = `linear-gradient(to right, ${getStepColor(step.type)} ${progressPercent}%, rgba(255, 255, 255, 0.08) ${progressPercent}%)`;
              badgeStyle.boxShadow = `0 0 12px ${getStepColor(step.type)}3f`;
            } else {
              badgeStyle.background = 'rgba(255, 255, 255, 0.05)';
              badgeStyle.color = 'var(--text-muted)';
            }

            const stepMins = Math.floor(step.duration / 60);

            return (
              <React.Fragment key={index}>
                <div 
                  className={getNodeClass(isCompleted, isActive, isLocked, step.type)} 
                  title={`${step.label}: ${stepMins}m`}
                >
                  <span>{step.label}</span>
                  <span className={styles.timeBadge} style={badgeStyle}>
                    {stepMins}m
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={getConnectorClass(isCompleted, step.type)} 
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className={styles.timelineFooter}>
          {state === 'IDLE' ? 'Plan is ready to start' : `Current phase: ${steps[activeIndex]?.label || ''} (${Math.round(progressPercent)}% completed)`}
        </div>
      </div>

      {/* Input settings */}
      <div className={styles.settingsGroup} style={{ marginTop: '24px' }}>
        <h3 className={styles.groupTitle}>
          <Clock size={16} />
          <span>Customize Durations (Minutes)</span>
        </h3>

        <div className={styles.inputRow}>
          <div className={styles.inputField}>
            <label>Focus Duration</label>
            <input 
              type="number" 
              min="1"
              value={workMins}
              onChange={(e) => handleDurationChange(e.target.value, updateWorkDuration)}
            />
          </div>

          <div className={styles.inputField}>
            <label>Short Break</label>
            <input 
              type="number" 
              min="1"
              value={shortMins}
              onChange={(e) => handleDurationChange(e.target.value, updateShortBreakDuration)}
            />
          </div>

          <div className={styles.inputField}>
            <label>Long Break</label>
            <input 
              type="number" 
              min="1"
              value={longMins}
              onChange={(e) => handleDurationChange(e.target.value, updateLongBreakDuration)}
            />
          </div>
        </div>
      </div>

      {/* Daily Goal Settings */}
      <div className={styles.settingsGroup} style={{ marginTop: '24px' }}>
        <h3 className={styles.groupTitle}>
          <Target size={16} />
          <span>Daily Goal (Max Sessions)</span>
        </h3>
        <div className={styles.cardsGrid}>
          <div 
            className={`${styles.goalCard} ${maxSessionsPerDay === 4 ? styles.selected : ''}`}
            onClick={() => dispatch(updateMaxSessionsPerDay(4))}
          >
            <div className={styles.cardHeader}>
              <span>4 Sessions</span>
              {maxSessionsPerDay === 4 && <CheckCircle2 size={16} />}
            </div>
            <div className={styles.cardDescription}>
              Ideal for a side project or a half-day of intense work. (1 full cycle)
            </div>
          </div>
          
          <div 
            className={`${styles.goalCard} ${maxSessionsPerDay === 8 ? styles.selected : ''}`}
            onClick={() => dispatch(updateMaxSessionsPerDay(8))}
          >
            <div className={styles.cardHeader}>
              <span>8 Sessions</span>
              {maxSessionsPerDay === 8 && <CheckCircle2 size={16} />}
            </div>
            <div className={styles.cardDescription}>
              Standard for productivity professionals. 4 to 5 hours of pure focus. (2 full cycles)
            </div>
          </div>

          <div 
            className={`${styles.goalCard} ${maxSessionsPerDay === 12 ? styles.selected : ''}`}
            onClick={() => dispatch(updateMaxSessionsPerDay(12))}
          >
            <div className={styles.cardHeader}>
              <span>12 Sessions</span>
              {maxSessionsPerDay === 12 && <CheckCircle2 size={16} />}
            </div>
            <div className={styles.cardDescription}>
              The absolute maximum recommended. Beware of exhaustion! (3 full cycles)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
