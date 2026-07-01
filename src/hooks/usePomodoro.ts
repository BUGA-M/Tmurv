import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { appConfigDir, join, resolveResource } from '@tauri-apps/api/path';
import { readFile, copyFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { Store } from '@tauri-apps/plugin-store';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export type PomodoroState = 'IDLE' | 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

const DEFAULT_SETTINGS = {
  workDuration: 25 * 60,       // 25 mins
  shortBreakDuration: 5 * 60,  // 5 mins
  longDuration: 15 * 60,       // 15 mins
  notificationsEnabled: true,
  minimizeToTray: true,
  activeSound: 'baraka_a_bnadeem.mp3' as string | null
};

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>('IDLE');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration);
  const [cycles, setCycles] = useState(0);
  
  // Settings state
  const [workDuration, setWorkDuration] = useState(DEFAULT_SETTINGS.workDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(DEFAULT_SETTINGS.shortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = useState(DEFAULT_SETTINGS.longDuration);
  const [notificationsEnabled, setNotificationsEnabled] = useState(DEFAULT_SETTINGS.notificationsEnabled);
  const [minimizeToTray, setMinimizeToTray] = useState(DEFAULT_SETTINGS.minimizeToTray);
  const [activeSound, setActiveSound] = useState<string | null>(DEFAULT_SETTINGS.activeSound);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Refs for the rAF timer loop
  const timerRef = useRef<number | null>(null);
  const expectedEndTimeRef = useRef<number | null>(null);

  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Pending break transition (set when work ends, consumed when sound stops)
  const pendingTransitionRef = useRef<{ state: PomodoroState; duration: number } | null>(null);

  // Ref to the tick function for use in startNextPhase (avoids circular dependency)
  const tickRef = useRef<(() => void) | null>(null);

  // Refs to latest values so the stable tick() can read them without stale closures
  const stateRef = useRef(state);
  const cyclesRef = useRef(cycles);
  const workDurationRef = useRef(workDuration);
  const shortBreakDurationRef = useRef(shortBreakDuration);
  const longBreakDurationRef = useRef(longBreakDuration);
  const activeSoundRef = useRef(activeSound);
  const notificationsEnabledRef = useRef(notificationsEnabled);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { cyclesRef.current = cycles; }, [cycles]);
  useEffect(() => { workDurationRef.current = workDuration; }, [workDuration]);
  useEffect(() => { shortBreakDurationRef.current = shortBreakDuration; }, [shortBreakDuration]);
  useEffect(() => { longBreakDurationRef.current = longBreakDuration; }, [longBreakDuration]);
  useEffect(() => { activeSoundRef.current = activeSound; }, [activeSound]);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);

  // Load settings on startup
  useEffect(() => {
    async function loadSettings() {
      try {
        // Ensure sounds directory and default sound exist
        const configDir = await appConfigDir();
        const soundsDir = await join(configDir, 'sounds');
        
        if (!(await exists(soundsDir))) {
          await mkdir(soundsDir, { recursive: true });
        }
        
        const defaultSoundName = 'baraka_a_bnadeem.mp3';
        const defaultSoundDest = await join(soundsDir, defaultSoundName);
        
        if (!(await exists(defaultSoundDest))) {
          try {
            const bundledSoundPath = await resolveResource(`resources/sounds/${defaultSoundName}`);
            await copyFile(bundledSoundPath, defaultSoundDest);
          } catch (e) {
            console.warn("Could not copy default sound from resources", e);
          }
        }

        const store = await Store.load('settings.json');
        
        const work = await store.get<number>('workDuration');
        if (work !== undefined && work !== null) setWorkDuration(work);
        
        const short = await store.get<number>('shortBreakDuration');
        if (short !== undefined && short !== null) setShortBreakDuration(short);
        
        const long = await store.get<number>('longBreakDuration');
        if (long !== undefined && long !== null) setLongBreakDuration(long);
        
        const notify = await store.get<boolean>('notificationsEnabled');
        if (notify !== undefined && notify !== null) setNotificationsEnabled(notify);
        
        const tray = await store.get<boolean>('minimizeToTray');
        if (tray !== undefined && tray !== null) {
          setMinimizeToTray(tray);
          await invoke('set_minimize_to_tray', { enabled: tray });
        }
        
        const sound = await store.get<string>('activeSound');
        if (sound !== undefined && sound !== null) setActiveSound(sound);
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
    loadSettings();
  }, []);

  // Update timeLeft when durations change if idle
  useEffect(() => {
    if (state === 'IDLE') {
      setTimeLeft(workDuration);
    }
  }, [workDuration, state]);

  // Save settings helpers
  const saveSetting = async (key: string, value: any) => {
    try {
      const store = await Store.load('settings.json');
      await store.set(key, value);
      await store.save();
    } catch (e) {
      console.error(`Failed to save setting ${key}`, e);
    }
  };

  const updateWorkDuration = (val: number) => {
    setWorkDuration(val);
    saveSetting('workDuration', val);
  };

  const updateShortBreakDuration = (val: number) => {
    setShortBreakDuration(val);
    saveSetting('shortBreakDuration', val);
  };

  const updateLongBreakDuration = (val: number) => {
    setLongBreakDuration(val);
    saveSetting('longBreakDuration', val);
  };

  const updateNotificationsEnabled = (val: boolean) => {
    setNotificationsEnabled(val);
    saveSetting('notificationsEnabled', val);
  };

  const updateMinimizeToTray = async (val: boolean) => {
    setMinimizeToTray(val);
    saveSetting('minimizeToTray', val);
    await invoke('set_minimize_to_tray', { enabled: val });
  };

  // --- Audio & transition helpers (all stable, use refs) ---

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsSoundPlaying(false);
  }, []);

  const startNextPhase = useCallback(() => {
    const pending = pendingTransitionRef.current;
    if (!pending) return;
    pendingTransitionRef.current = null;

    setState(pending.state);
    stateRef.current = pending.state;
    setTimeLeft(pending.duration);
    expectedEndTimeRef.current = Date.now() + pending.duration * 1000;
    setIsRunning(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (tickRef.current) tickRef.current();
    }, 1000);
  }, []);

  const dismissSound = useCallback(() => {
    cleanupAudio();
    startNextPhase();
  }, [cleanupAudio, startNextPhase]);

  const playSoundAndTransition = useCallback(async () => {
    const sound = activeSoundRef.current;
    setIsSoundPlaying(true);
    
    if (!sound) return;

    try {
      const configDir = await appConfigDir();
      const soundPath = await join(configDir, 'sounds', sound);
      const fileBytes = await readFile(soundPath);
      const mimeType = sound.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
      const blob = new Blob([fileBytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.loop = true;
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      console.error("Error playing sound", e);
    }
  }, []);

  const fireNotification = useCallback(async (title: string, body: string) => {
    if (!notificationsEnabledRef.current) return;
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        try {
          const iconPath = await resolveResource('icons/128x128.png');
          sendNotification({ title, body, icon: iconPath });
        } catch (err) {
          console.warn("Could not resolve icon, sending without icon", err);
          sendNotification({ title, body });
        }
      }
    } catch (e) {
      console.error("Error sending notification", e);
    }
  }, []);

  // --- Stable tick function (no deps — reads everything from refs) ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tick = useCallback(function tickFn() {
    if (expectedEndTimeRef.current === null) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expectedEndTimeRef.current - now) / 1000));
    
    setTimeLeft(remaining);

    if (remaining === 0) {
      expectedEndTimeRef.current = null;
      setIsRunning(false);
      const currentState = stateRef.current;
      
      if (currentState === 'WORK') {
        const newCycles = cyclesRef.current + 1;
        setCycles(newCycles);
        if (newCycles % 4 === 0) {
          pendingTransitionRef.current = { state: 'LONG_BREAK', duration: longBreakDurationRef.current };
          fireNotification("🏆 Tmurv • Milestone Unlocked", "4 focus sessions complete! You've earned a long, relaxing break. Unplug and recharge.");
        } else {
          pendingTransitionRef.current = { state: 'SHORT_BREAK', duration: shortBreakDurationRef.current };
          fireNotification("🎯 Tmurv • Focus Complete", "Great job staying in the zone! Step away for a quick break to refresh your mind.");
        }
      } else {
        // SHORT_BREAK or LONG_BREAK finished → next WORK session
        pendingTransitionRef.current = { state: 'WORK', duration: workDurationRef.current };
        fireNotification("🔋 Tmurv • Break is Over", "Your break has ended. Ready to dive back in and crush your next goal? Let's go!");
      }
      // Play sound for ALL transitions — next phase starts when sound ends/is dismissed
      playSoundAndTransition();
    } else {
      timerRef.current = window.setTimeout(tickFn, 1000);
    }
  }, [fireNotification, playSoundAndTransition]);

  // Keep tickRef in sync
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // --- Timer controls ---

  const start = useCallback(() => {
    if (stateRef.current === 'IDLE') {
      setState('WORK');
      stateRef.current = 'WORK';
      expectedEndTimeRef.current = Date.now() + workDurationRef.current * 1000;
    } else {
      // Resume: use the displayed timeLeft
      expectedEndTimeRef.current = Date.now() + timeLeft * 1000;
    }
    
    setIsRunning(true);
    
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(tick, 1000);
  }, [timeLeft, tick]);

  const pause = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    expectedEndTimeRef.current = null;
    setIsRunning(false);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    expectedEndTimeRef.current = null;
    pendingTransitionRef.current = null;
    setIsRunning(false);
    cleanupAudio();
    setState('IDLE');
    stateRef.current = 'IDLE';
    setTimeLeft(workDurationRef.current);
    setCycles(0);
  }, [cleanupAudio]);

  // Sync document title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.title = `${mins}:${secs} - Tmurv`;
  }, [timeLeft]);

  return {
    state,
    timeLeft,
    cycles,
    start,
    pause,
    stop,
    
    // Durations
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    updateWorkDuration,
    updateShortBreakDuration,
    updateLongBreakDuration,
    
    // Notifications & Tray
    notificationsEnabled,
    updateNotificationsEnabled,
    minimizeToTray,
    updateMinimizeToTray,
    
    // Sound
    activeSound,
    setActiveSound: (sound: string | null) => {
      setActiveSound(sound);
      saveSetting('activeSound', sound);
    },
    isSoundPlaying,
    dismissSound,
    
    isRunning
  };
}
