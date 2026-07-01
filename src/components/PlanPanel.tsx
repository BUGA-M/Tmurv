import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { PomodoroState } from '../hooks/usePomodoro';

interface PlanPanelProps {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  updateWorkDuration: (val: number) => void;
  updateShortBreakDuration: (val: number) => void;
  updateLongBreakDuration: (val: number) => void;
  state: PomodoroState;
  timeLeft: number;
  cycles: number;
  isSoundPlaying: boolean;
}

interface TimelineStep {
  type: 'work' | 'break' | 'long-break';
  label: string;
  duration: number;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  updateWorkDuration,
  updateShortBreakDuration,
  updateLongBreakDuration,
  state,
  timeLeft,
  cycles,
  isSoundPlaying,
}) => {
  
  const handleDurationChange = (
    value: string, 
    updater: (val: number) => void
  ) => {
    const mins = parseInt(value, 10);
    if (!isNaN(mins) && mins > 0) {
      updater(mins * 60);
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
      // Transitioning from WORK to break
      if (cycles % 4 === 0) {
        activeIndex = 7; // LONG_BREAK
      } else {
        activeIndex = ((cycles - 1) % 4) * 2 + 1; // SHORT_BREAK
      }
    } else {
      // Transitioning from break to WORK
      activeIndex = (cycles % 4) * 2;
    }
  } else {
    // Normal state
    if (state === 'WORK') {
      activeIndex = (cycles % 4) * 2;
    } else if (state === 'SHORT_BREAK') {
      activeIndex = ((cycles - 1) % 4) * 2 + 1;
    } else if (state === 'LONG_BREAK') {
      activeIndex = 7;
    } else {
      // IDLE: point to the upcoming Work session
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

  return (
    <div className="panel-container">
      <div className="panel-header">
        <Calendar size={22} className="icon-gradient" />
        <h2>Pomodoro Plan</h2>
      </div>

      {/* Visual Timeline of Cycles */}
      <div className="timeline-card">
        <div className="timeline-title">Complete Cycle Schema</div>
        <div className="timeline-track">
          {steps.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isActive = index === activeIndex;
            const isLocked = index > activeIndex;

            let nodeClass = `timeline-node ${step.type}`;
            if (isCompleted) nodeClass += ' completed';
            else if (isActive) nodeClass += ' active';
            else if (isLocked) nodeClass += ' locked';

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
                <div className={nodeClass} title={`${step.label}: ${stepMins}m`}>
                  <span>{step.label}</span>
                  <span className="time-badge" style={badgeStyle}>
                    {stepMins}m
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={`timeline-connector ${isCompleted ? 'completed ' + step.type : ''}`} 
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="timeline-footer">
          {state === 'IDLE' ? 'Plan is ready to start' : `Current phase: ${steps[activeIndex]?.label || ''} (${Math.round(progressPercent)}% completed)`}
        </div>
      </div>

      {/* Input settings */}
      <div className="settings-group" style={{ marginTop: '24px' }}>
        <h3 className="group-title">
          <Clock size={16} />
          <span>Customize Durations (Minutes)</span>
        </h3>

        <div className="input-row">
          <div className="input-field">
            <label>Focus Duration</label>
            <input 
              type="number" 
              min="1"
              value={workMins}
              onChange={(e) => handleDurationChange(e.target.value, updateWorkDuration)}
            />
          </div>

          <div className="input-field">
            <label>Short Break</label>
            <input 
              type="number" 
              min="1"
              value={shortMins}
              onChange={(e) => handleDurationChange(e.target.value, updateShortBreakDuration)}
            />
          </div>

          <div className="input-field">
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
    </div>
  );
};
