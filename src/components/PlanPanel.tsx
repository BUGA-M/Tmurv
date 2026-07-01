import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface PlanPanelProps {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  updateWorkDuration: (val: number) => void;
  updateShortBreakDuration: (val: number) => void;
  updateLongBreakDuration: (val: number) => void;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  updateWorkDuration,
  updateShortBreakDuration,
  updateLongBreakDuration,
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
          <div className="timeline-node work" title={`Work: ${workMins}m`}>
            <span>Work</span>
            <span className="time-badge">{workMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node break" title={`Break: ${shortMins}m`}>
            <span>Short</span>
            <span className="time-badge">{shortMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node work" title={`Work: ${workMins}m`}>
            <span>Work</span>
            <span className="time-badge">{workMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node break" title={`Break: ${shortMins}m`}>
            <span>Short</span>
            <span className="time-badge">{shortMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node work" title={`Work: ${workMins}m`}>
            <span>Work</span>
            <span className="time-badge">{workMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node break" title={`Break: ${shortMins}m`}>
            <span>Short</span>
            <span className="time-badge">{shortMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node work" title={`Work: ${workMins}m`}>
            <span>Work</span>
            <span className="time-badge">{workMins}m</span>
          </div>
          <div className="timeline-connector" />
          <div className="timeline-node long-break" title={`Long Break: ${longMins}m`}>
            <span>Long</span>
            <span className="time-badge">{longMins}m</span>
          </div>
        </div>
        <div className="timeline-footer">After 4 Focus Sessions, get a Long Break</div>
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
