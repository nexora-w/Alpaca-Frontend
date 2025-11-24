import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { walletApi } from '@/services/api';
import { saveWallet, getWallet, deleteWallet } from '@/services/walletStorage';

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
        // Save to secure storage
        await saveWallet({
          address: response.data.address,
          mnemonic: response.data.mnemonic,
          seed: response.data.seed,
          publicKey: response.data.publicKey,
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
        return {
          balance: response.data.totalBalance,
          tokens: response.data.tokens || [],
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

