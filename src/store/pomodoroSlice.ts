import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/core';
import { appConfigDir, join, resolveResource } from '@tauri-apps/api/path';
import { copyFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { Store } from '@tauri-apps/plugin-store';

export type PomodoroState = 'IDLE' | 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

interface PomodoroSliceState {
  state: PomodoroState;
  timeLeft: number;
  cycles: number;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  notificationsEnabled: boolean;
  minimizeToTray: boolean;
  activeSound: string | null;
  isSoundPlaying: boolean;
  isRunning: boolean;
  isLoaded: boolean;
  volume: number;
  maxSessionsPerDay: number;
  dailySessions: number;
  lastSessionDate: string;
}

const initialState: PomodoroSliceState = {
  state: 'IDLE',
  timeLeft: 25 * 60,
  cycles: 0,
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  notificationsEnabled: true,
  minimizeToTray: true,
  activeSound: 'baraka_a_bnadeem.mp3',
  isSoundPlaying: false,
  isRunning: false,
  isLoaded: false,
  volume: 80,
  maxSessionsPerDay: 8,
  dailySessions: 0,
  lastSessionDate: new Date().toISOString().split('T')[0],
};

// Async Thunks
export const loadSettings = createAsyncThunk(
  'pomodoro/loadSettings',
  async () => {
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
    const short = await store.get<number>('shortBreakDuration');
    const long = await store.get<number>('longBreakDuration');
    const notify = await store.get<boolean>('notificationsEnabled');
    const tray = await store.get<boolean>('minimizeToTray');
    const sound = await store.get<string>('activeSound');
    const volume = await store.get<number>('volume');
    const maxSessionsPerDay = await store.get<number>('maxSessionsPerDay');
    const dailySessions = await store.get<number>('dailySessions');
    const lastSessionDate = await store.get<string>('lastSessionDate');

    return {
      workDuration: work ?? undefined,
      shortBreakDuration: short ?? undefined,
      longBreakDuration: long ?? undefined,
      notificationsEnabled: notify ?? undefined,
      minimizeToTray: tray ?? undefined,
      activeSound: sound ?? undefined,
      volume: volume ?? undefined,
      maxSessionsPerDay: maxSessionsPerDay ?? undefined,
      dailySessions: dailySessions ?? undefined,
      lastSessionDate: lastSessionDate ?? undefined,
    };
  }
);

export const updateWorkDuration = createAsyncThunk(
  'pomodoro/updateWorkDuration',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('workDuration', val);
    await store.save();
    return val;
  }
);

export const updateShortBreakDuration = createAsyncThunk(
  'pomodoro/updateShortBreakDuration',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('shortBreakDuration', val);
    await store.save();
    return val;
  }
);

export const updateLongBreakDuration = createAsyncThunk(
  'pomodoro/updateLongBreakDuration',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('longBreakDuration', val);
    await store.save();
    return val;
  }
);

export const updateNotificationsEnabled = createAsyncThunk(
  'pomodoro/updateNotificationsEnabled',
  async (val: boolean) => {
    const store = await Store.load('settings.json');
    await store.set('notificationsEnabled', val);
    await store.save();
    return val;
  }
);

export const updateMinimizeToTray = createAsyncThunk(
  'pomodoro/updateMinimizeToTray',
  async (val: boolean) => {
    const store = await Store.load('settings.json');
    await store.set('minimizeToTray', val);
    await store.save();
    await invoke('set_minimize_to_tray', { enabled: val });
    return val;
  }
);

export const updateActiveSound = createAsyncThunk(
  'pomodoro/updateActiveSound',
  async (sound: string | null) => {
    const store = await Store.load('settings.json');
    await store.set('activeSound', sound);
    await store.save();
    return sound;
  }
);

export const updateVolume = createAsyncThunk(
  'pomodoro/updateVolume',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('volume', val);
    await store.save();
    return val;
  }
);

export const updateMaxSessionsPerDay = createAsyncThunk(
  'pomodoro/updateMaxSessionsPerDay',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('maxSessionsPerDay', val);
    await store.save();
    return val;
  }
);

export const updateDailySessions = createAsyncThunk(
  'pomodoro/updateDailySessions',
  async (val: number) => {
    const store = await Store.load('settings.json');
    await store.set('dailySessions', val);
    await store.save();
    return val;
  }
);

export const updateLastSessionDate = createAsyncThunk(
  'pomodoro/updateLastSessionDate',
  async (val: string) => {
    const store = await Store.load('settings.json');
    await store.set('lastSessionDate', val);
    await store.save();
    return val;
  }
);

const pomodoroSlice = createSlice({
  name: 'pomodoro',
  initialState,
  reducers: {
    setState(state, action: PayloadAction<PomodoroState>) {
      state.state = action.payload;
    },
    setTimeLeft(state, action: PayloadAction<number>) {
      state.timeLeft = action.payload;
    },
    setCycles(state, action: PayloadAction<number>) {
      state.cycles = action.payload;
    },
    setIsSoundPlaying(state, action: PayloadAction<boolean>) {
      state.isSoundPlaying = action.payload;
    },
    setIsRunning(state, action: PayloadAction<boolean>) {
      state.isRunning = action.payload;
    },
    startTimer(state) {
      if (state.state === 'IDLE') {
        state.state = 'WORK';
        state.timeLeft = state.workDuration;
      }
      state.isRunning = true;
    },
    pauseTimer(state) {
      state.isRunning = false;
    },
    resetTimer(state) {
      state.isRunning = false;
      state.isSoundPlaying = false;
      state.state = 'IDLE';
      state.timeLeft = state.workDuration;
      state.cycles = 0;
    },
    stopTimer(state) {
      state.isRunning = false;
      state.isSoundPlaying = false;
      state.state = 'IDLE';
      state.timeLeft = state.workDuration;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoaded = true;
        if (action.payload.workDuration !== undefined) {
          state.workDuration = action.payload.workDuration;
          if (state.state === 'IDLE') {
            state.timeLeft = action.payload.workDuration;
          }
        }
        if (action.payload.shortBreakDuration !== undefined) {
          state.shortBreakDuration = action.payload.shortBreakDuration;
        }
        if (action.payload.longBreakDuration !== undefined) {
          state.longBreakDuration = action.payload.longBreakDuration;
        }
        if (action.payload.notificationsEnabled !== undefined) {
          state.notificationsEnabled = action.payload.notificationsEnabled;
        }
        if (action.payload.minimizeToTray !== undefined) {
          state.minimizeToTray = action.payload.minimizeToTray;
        }
        if (action.payload.activeSound !== undefined) {
          state.activeSound = action.payload.activeSound;
        }
        if (action.payload.volume !== undefined) {
          state.volume = action.payload.volume;
        }
        if (action.payload.maxSessionsPerDay !== undefined) {
          state.maxSessionsPerDay = action.payload.maxSessionsPerDay;
        }
        if (action.payload.dailySessions !== undefined) {
          state.dailySessions = action.payload.dailySessions;
        }
        if (action.payload.lastSessionDate !== undefined) {
          state.lastSessionDate = action.payload.lastSessionDate;
        }
      })
      .addCase(updateWorkDuration.fulfilled, (state, action) => {
        state.workDuration = action.payload;
        if (state.state === 'IDLE') {
          state.timeLeft = action.payload;
        }
      })
      .addCase(updateShortBreakDuration.fulfilled, (state, action) => {
        state.shortBreakDuration = action.payload;
      })
      .addCase(updateLongBreakDuration.fulfilled, (state, action) => {
        state.longBreakDuration = action.payload;
      })
      .addCase(updateNotificationsEnabled.fulfilled, (state, action) => {
        state.notificationsEnabled = action.payload;
      })
      .addCase(updateMinimizeToTray.fulfilled, (state, action) => {
        state.minimizeToTray = action.payload;
      })
      .addCase(updateActiveSound.fulfilled, (state, action) => {
        state.activeSound = action.payload;
      })
      .addCase(updateVolume.fulfilled, (state, action) => {
        state.volume = action.payload;
      })
      .addCase(updateMaxSessionsPerDay.fulfilled, (state, action) => {
        state.maxSessionsPerDay = action.payload;
      })
      .addCase(updateDailySessions.fulfilled, (state, action) => {
        state.dailySessions = action.payload;
      })
      .addCase(updateLastSessionDate.fulfilled, (state, action) => {
        state.lastSessionDate = action.payload;
      });
  }
});

export const {
  setState,
  setTimeLeft,
  setCycles,
  setIsSoundPlaying,
  setIsRunning,
  startTimer,
  pauseTimer,
  resetTimer,
  stopTimer,
} = pomodoroSlice.actions;

export default pomodoroSlice.reducer;
