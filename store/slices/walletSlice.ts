import { walletApi } from '@/services/api';
import { deleteWallet, getWallet, saveWallet } from '@/services/walletStorage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WalletData {
  address: string;
  mnemonic?: string;
  seed?: string;
  publicKey?: string;
  privateKey?: string;
}

export interface Token {
  address: string;
  balance: string;
}

interface WalletState {
  walletData: WalletData | null;
  balance: number;
  tokens: Token[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

const initialState: WalletState = {
  walletData: null,
  balance: 0,
  tokens: [],
  loading: false,
  error: null,
  refreshing: false,
};

/**
 * Normalize balance value to string representation
 * KeetaNetwork uses whole units (BigInt) directly, not decimal-based units
 * @param balance - Balance value (string, number, or null)
 * @param balanceHex - Optional hex balance value
 * @returns String representation of the balance as whole units
 */
const normalizeBalanceValue = (balance?: string | number | null, balanceHex?: string): string => {
  const rawValue = balance ?? balanceHex;
  if (rawValue === undefined || rawValue === null) {
    return '0';
  }

  try {
    let bigintValue: bigint;
    if (typeof rawValue === 'number') {
      bigintValue = BigInt(Math.trunc(rawValue));
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        return '0';
      }
      // Handle hex values (0x prefix) or decimal strings
      bigintValue = trimmed.startsWith('0x') ? BigInt(trimmed) : BigInt(trimmed);
    } else if (typeof rawValue === 'bigint') {
      bigintValue = rawValue;
    } else {
      return '0';
    }

    // KeetaNetwork uses whole units directly, no decimal conversion needed
    return bigintValue.toString();
  } catch {
    return '0';
  }
};

// Async thunks
export const loadWalletFromStorage = createAsyncThunk(
  'wallet/loadFromStorage',
  async () => {
    const wallet = await getWallet();
    return wallet;
  }
);

export const createWallet = createAsyncThunk(
  'wallet/create',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletApi.createWallet();
      if (response.success && response.data) {
        console.log('response.data', response.data);
        // Save to secure storage
        await saveWallet({
          address: response.data.address,
          mnemonic: response.data.mnemonic,
          seed: response.data.seed,
          publicKey: response.data.publicKey,
          privateKey: response.data.privateKey,
        });
        return response.data;
      }
      throw new Error('Failed to create wallet');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create wallet');
    }
  }
);

export const importWalletFromSeed = createAsyncThunk(
  'wallet/importFromSeed',
  async (seed: string, { rejectWithValue }) => {
    try {
      const response = await walletApi.importWalletFromSeed(seed);
      if (response.success && response.data) {
        // Save to secure storage
        await saveWallet({
          address: response.data.address,
          publicKey: response.data.publicKey,
          seed: seed,
        });
        return response.data;
      }
      throw new Error('Failed to import wallet');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to import wallet');
    }
  }
);

export const importWalletFromMnemonic = createAsyncThunk(
  'wallet/importFromMnemonic',
  async (mnemonic: string, { rejectWithValue }) => {
    try {
      const response = await walletApi.importWalletFromMnemonic(mnemonic);
      if (response.success && response.data) {
        // Save to secure storage
        await saveWallet({
          address: response.data.address,
          publicKey: response.data.publicKey,
          mnemonic: mnemonic,
          seed: response.data.privateKey || response.data.seed,
          privateKey: response.data.privateKey || response.data.seed,
        });
        return response.data;
      }
      throw new Error('Failed to import wallet');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to import wallet');
    }
  }
);

export const fetchAccountBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (address: string, { rejectWithValue }) => {
    try {
      const response = await walletApi.getAccountBalance(address);
      if (response.success && response.data) {
        const normalizedTotal = normalizeBalanceValue(response.data.totalBalance);
        // Transform tokens from API format to our Token interface
        const transformedTokens = (response.data.tokens || []).map((token: any) => ({
          address: token.token || token.address,
          balance: normalizeBalanceValue(token.balance, token.balanceHex),
        }));
        // Parse as float for display, but keep as string in tokens array for precision
        // KeetaNetwork uses whole units, so we can safely parse for display
        const totalBalanceNum = parseFloat(normalizedTotal) || 0;
        return {
          balance: totalBalanceNum,
          tokens: transformedTokens,
        };
      }
      throw new Error('Failed to fetch balance');
    } catch (error: any) {
      // Don't reject, just return empty data
      return {
        balance: 0,
        tokens: [],
      };
    }
  }
);

export const deleteWalletData = createAsyncThunk(
  'wallet/delete',
  async (_, { rejectWithValue }) => {
    try {
      await deleteWallet();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete wallet');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWallet: (state) => {
      state.walletData = null;
      state.balance = 0;
      state.tokens = [];
      state.error = null;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load wallet from storage
    builder
      .addCase(loadWalletFromStorage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadWalletFromStorage.fulfilled, (state, action) => {
        state.loading = false;
        state.walletData = action.payload;
      })
      .addCase(loadWalletFromStorage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load wallet';
      });

    // Create wallet
    builder
      .addCase(createWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.walletData = {
          address: action.payload.address,
          mnemonic: action.payload.mnemonic,
          seed: action.payload.seed,
          publicKey: action.payload.publicKey,
          privateKey: action.payload.privateKey,
        };
      })
      .addCase(createWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Import from seed
    builder
      .addCase(importWalletFromSeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importWalletFromSeed.fulfilled, (state, action) => {
        state.loading = false;
        state.walletData = {
          address: action.payload.address,
          publicKey: action.payload.publicKey,
          seed: action.meta.arg,
        };
      })
      .addCase(importWalletFromSeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Import from mnemonic
    builder
      .addCase(importWalletFromMnemonic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importWalletFromMnemonic.fulfilled, (state, action) => {
        state.loading = false;
        state.walletData = {
          address: action.payload.address,
          publicKey: action.payload.publicKey,
          seed: action.payload.privateKey || action.payload.seed,
          mnemonic: action.meta.arg,
        };
      })
      .addCase(importWalletFromMnemonic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch balance
    builder
      .addCase(fetchAccountBalance.pending, (state) => {
        if (!state.refreshing) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchAccountBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.balance = action.payload.balance;
        state.tokens = action.payload.tokens;
      })
      .addCase(fetchAccountBalance.rejected, (state) => {
        state.loading = false;
        state.refreshing = false;
        // Don't set error, just keep existing balance
      });

    builder
      .addCase(deleteWalletData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWalletData.fulfilled, (state) => {
        state.loading = false;
        state.walletData = null;
        state.balance = 0;
        state.tokens = [];
      })
      .addCase(deleteWalletData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearWallet, setRefreshing, clearError } = walletSlice.actions;
export default walletSlice.reducer;

