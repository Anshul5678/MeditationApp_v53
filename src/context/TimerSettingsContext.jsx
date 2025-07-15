import React, { createContext, useContext, useState } from 'react';

const TimerSettingsContext = createContext();

export const useTimerSettings = () => {
  const context = useContext(TimerSettingsContext);
  if (!context) {
    throw new Error('useTimerSettings must be used within a TimerSettingsProvider');
  }
  return context;
};

export const TimerSettingsProvider = ({ children }) => {
  const [duration, setDuration] = useState({ hours: 0, minutes: 10, seconds: 0 });
  const [meditationType, setMeditationType] = useState('Meditation');
  const [isInfinity, setIsInfinity] = useState(false);
  const [bellInterval, setBellInterval] = useState(3);
  const [background, setBackground] = useState('Black');

  const value = {
    duration,
    setDuration,
    meditationType,
    setMeditationType,
    isInfinity,
    setIsInfinity,
    bellInterval,
    setBellInterval,
    background,
    setBackground,
  };

  return (
    <TimerSettingsContext.Provider value={value}>
      {children}
    </TimerSettingsContext.Provider>
  );
}; 