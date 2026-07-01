import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { 
  loadSettings, 
  setTimeLeft, 
  setIsRunning, 
  setCycles, 
  setIsSoundPlaying, 
  setState,
  PomodoroState
} from '../store/pomodoroSlice';
import { appConfigDir, join, resolveResource } from '@tauri-apps/api/path';
import { readFile } from '@tauri-apps/plugin-fs';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export function usePomodoroTimer() {
  const dispatch = useAppDispatch();

  const {
    state,
    timeLeft,
    cycles,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    notificationsEnabled,
    activeSound,
    isRunning,
    isLoaded,
    volume
  } = useAppSelector((state) => state.pomodoro);

  // Refs for the timer loop
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
  const volumeRef = useRef(volume);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { cyclesRef.current = cycles; }, [cycles]);
  useEffect(() => { workDurationRef.current = workDuration; }, [workDuration]);
  useEffect(() => { shortBreakDurationRef.current = shortBreakDuration; }, [shortBreakDuration]);
  useEffect(() => { longBreakDurationRef.current = longBreakDuration; }, [longBreakDuration]);
  useEffect(() => { activeSoundRef.current = activeSound; }, [activeSound]);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Load settings on startup
  useEffect(() => {
    dispatch(loadSettings());
  }, [dispatch]);

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
    dispatch(setIsSoundPlaying(false));
  }, [dispatch]);

  const startNextPhase = useCallback(() => {
    const pending = pendingTransitionRef.current;
    if (!pending) return;
    pendingTransitionRef.current = null;

    dispatch(setState(pending.state));
    stateRef.current = pending.state;
    dispatch(setTimeLeft(pending.duration));
    expectedEndTimeRef.current = Date.now() + pending.duration * 1000;
    dispatch(setIsRunning(true));
    
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (tickRef.current) tickRef.current();
    }, 1000);
  }, [dispatch]);

  const dismissSound = useCallback(() => {
    cleanupAudio();
    startNextPhase();
  }, [cleanupAudio, startNextPhase]);

  const playSound = useCallback(async () => {
    const sound = activeSoundRef.current;
    dispatch(setIsSoundPlaying(true));
    
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
      audio.volume = volumeRef.current / 100;
      audio.loop = true;
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      console.error("Error playing sound", e);
    }
  }, [dispatch]);

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
  const tick = useCallback(function tickFn() {
    if (expectedEndTimeRef.current === null) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expectedEndTimeRef.current - now) / 1000));
    
    dispatch(setTimeLeft(remaining));

    if (remaining === 0) {
      expectedEndTimeRef.current = null;
      dispatch(setIsRunning(false));
      const currentState = stateRef.current;
      
      if (currentState === 'WORK') {
        const newCycles = cyclesRef.current + 1;
        dispatch(setCycles(newCycles));
        if (newCycles % 4 === 0) {
          pendingTransitionRef.current = { state: 'LONG_BREAK', duration: longBreakDurationRef.current };
          fireNotification("🏆 Tmurv • Milestone Unlocked", "4 focus sessions complete! You've earned a long, relaxing break. Unplug and recharge.");
        } else {
          pendingTransitionRef.current = { state: 'SHORT_BREAK', duration: shortBreakDurationRef.current };
          fireNotification("🎯 Tmurv • Focus Complete", "Great job staying in the zone! Step away for a quick break to refresh your mind.");
        }
      } else {
        pendingTransitionRef.current = { state: 'WORK', duration: workDurationRef.current };
        fireNotification("🔋 Tmurv • Break is Over", "Your break has ended. Ready to dive back in and crush your next goal? Let's go!");
      }
      // Play sound for ALL transitions
      playSound();
    } else {
      timerRef.current = window.setTimeout(tickFn, 1000);
    }
  }, [dispatch, fireNotification, playSound]);

  // Keep tickRef in sync
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // Sync Timer Running Effect
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      expectedEndTimeRef.current = null;
      return;
    }

    if (expectedEndTimeRef.current === null) {
      expectedEndTimeRef.current = Date.now() + timeLeft * 1000;
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(tick, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, tick]);

  // Sync document title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.title = `${mins}:${secs} - Tmurv`;
  }, [timeLeft]);

  // Adjust volume in real time if alert sound is already playing
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  return {
    isLoaded,
    dismissSound
  };
}
