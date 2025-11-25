import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Crypto from 'expo-crypto';

import {
  getAutoLockMinutes,
  getLastUnlockedTimestamp,
  getWalletPasswordHash,
  setAutoLockMinutes as persistAutoLockMinutes,
  setLastUnlockedTimestamp,
  setWalletPasswordHash,
} from '@/services/walletStorage';
import { deleteWalletData } from './walletSlice';

const DEFAULT_AUTO_LOCK_MINUTES = 5;

interface SecurityState {
  passwordSet: boolean;
  locked: boolean;
  autoLockMinutes: number;
  lastUnlockedAt: number | null;
  initializing: boolean;
  error: string | null;
}

const initialState: SecurityState = {
  passwordSet: false,
  locked: false,
  autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
  lastUnlockedAt: null,
  initializing: false,
  error: null,
};

const isLocked = (passwordSet: boolean, lastUnlockedAt: number | null, autoLockMinutes: number) => {
  if (!passwordSet) {
    return false;
  }
  if (!lastUnlockedAt) {
    return true;
  }
  const elapsed = Date.now() - lastUnlockedAt;
  return elapsed >= autoLockMinutes * 60 * 1000;
};

export const initializeSecurity = createAsyncThunk('security/initialize', async () => {
  const [passwordHash, storedAutoLock, lastUnlocked] = await Promise.all([
    getWalletPasswordHash(),
    getAutoLockMinutes(),
    getLastUnlockedTimestamp(),
  ]);

  const passwordSet = Boolean(passwordHash);
  const autoLockMinutes = storedAutoLock ?? DEFAULT_AUTO_LOCK_MINUTES;
  const locked = isLocked(passwordSet, lastUnlocked, autoLockMinutes);

  return {
    passwordSet,
    autoLockMinutes,
    lastUnlockedAt: lastUnlocked,
    locked,
  };
});

export const refreshLockState = createAsyncThunk('security/refreshLockState', async () => {
  const [passwordHash, storedAutoLock, lastUnlocked] = await Promise.all([
    getWalletPasswordHash(),
    getAutoLockMinutes(),
    getLastUnlockedTimestamp(),
  ]);

  const passwordSet = Boolean(passwordHash);
  const autoLockMinutes = storedAutoLock ?? DEFAULT_AUTO_LOCK_MINUTES;
  const locked = isLocked(passwordSet, lastUnlocked, autoLockMinutes);

  return {
    passwordSet,
    autoLockMinutes,
    lastUnlockedAt: lastUnlocked,
    locked,
  };
});

export const setSecurityPassword = createAsyncThunk(
  'security/setPassword',
  async (password: string, { rejectWithValue }) => {
    try {
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
      await setWalletPasswordHash(hash);
      const now = Date.now();
      await setLastUnlockedTimestamp(now);

      return {
        lastUnlockedAt: now,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save password');
    }
  }
);

export const unlockWalletWithPassword = createAsyncThunk(
  'security/unlock',
  async (password: string, { rejectWithValue }) => {
    try {
      const storedHash = await getWalletPasswordHash();
      if (!storedHash) {
        return rejectWithValue('No password set. Please create one first.');
      }

      const candidateHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
      if (candidateHash !== storedHash) {
        return rejectWithValue('Incorrect password. Please try again.');
      }

      const now = Date.now();
      await setLastUnlockedTimestamp(now);
      return {
        lastUnlockedAt: now,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unlock wallet');
    }
  }
);

export const updateAutoLockDuration = createAsyncThunk(
  'security/updateAutoLock',
  async (minutes: number, { rejectWithValue }) => {
    try {
      await persistAutoLockMinutes(minutes);
      return minutes;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update auto-lock setting');
    }
  }
);

const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    forceLock(state) {
      if (state.passwordSet) {
        state.locked = true;
      }
    },
    clearSecurityState(state) {
      state.passwordSet = false;
      state.locked = false;
      state.autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES;
      state.lastUnlockedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeSecurity.pending, (state) => {
        state.initializing = true;
        state.error = null;
      })
      .addCase(initializeSecurity.fulfilled, (state, action) => {
        state.initializing = false;
        state.passwordSet = action.payload.passwordSet;
        state.autoLockMinutes = action.payload.autoLockMinutes;
        state.lastUnlockedAt = action.payload.lastUnlockedAt || null;
        state.locked = action.payload.locked;
      })
      .addCase(initializeSecurity.rejected, (state, action) => {
        state.initializing = false;
        state.error = action.error.message || 'Failed to initialize security';
      })
      .addCase(refreshLockState.fulfilled, (state, action) => {
        state.passwordSet = action.payload.passwordSet;
        state.autoLockMinutes = action.payload.autoLockMinutes;
        state.lastUnlockedAt = action.payload.lastUnlockedAt || null;
        state.locked = action.payload.locked;
      })
      .addCase(setSecurityPassword.pending, (state) => {
        state.error = null;
      })
      .addCase(setSecurityPassword.fulfilled, (state, action) => {
        state.passwordSet = true;
        state.locked = false;
        state.lastUnlockedAt = action.payload.lastUnlockedAt;
      })
      .addCase(setSecurityPassword.rejected, (state, action) => {
        state.error = (action.payload as string) || action.error.message || 'Failed to save password';
      })
      .addCase(unlockWalletWithPassword.pending, (state) => {
        state.error = null;
      })
      .addCase(unlockWalletWithPassword.fulfilled, (state, action) => {
        state.locked = false;
        state.lastUnlockedAt = action.payload.lastUnlockedAt;
      })
      .addCase(unlockWalletWithPassword.rejected, (state, action) => {
        state.error =
          (action.payload as string) || action.error.message || 'Failed to unlock wallet';
      })
      .addCase(updateAutoLockDuration.fulfilled, (state, action: PayloadAction<number>) => {
        state.autoLockMinutes = action.payload;
        state.locked = isLocked(state.passwordSet, state.lastUnlockedAt, state.autoLockMinutes);
      })
      .addCase(updateAutoLockDuration.rejected, (state, action) => {
        state.error =
          (action.payload as string) || action.error.message || 'Failed to update auto-lock';
      })
      .addCase(deleteWalletData.fulfilled, (state) => {
        state.passwordSet = false;
        state.locked = false;
        state.autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES;
        state.lastUnlockedAt = null;
      });
  },
});

export const { forceLock, clearSecurityState } = securitySlice.actions;
export default securitySlice.reducer;

