import React from 'react';
import { Timer } from '../components/Timer/Timer';

interface TimerPageProps {
  onDismissSound: () => void;
}

export const TimerPage: React.FC<TimerPageProps> = ({ onDismissSound }) => {
  return <Timer onDismissSound={onDismissSound} />;
};
