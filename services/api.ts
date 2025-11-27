import axios from 'axios';

// Update this with your backend URL
// For mobile devices, use your computer's IP address instead of localhost
// Example: 'http://192.168.1.100:4000/api/v1'
// For Android emulator, use: 'http://10.0.2.2:4000/api/v1'
// For iOS simulator, use: 'http://localhost:4000/api/v1'
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:7060/api/v1' 
  : 'http://localhost:7060/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CreateWalletResponse {
  success: boolean;
  data: {
    address: string;
    publicKey: string;
    mnemonic: string; // BIP39 mnemonic phrase (12 words)
    seed: string; // Hex seed derived from mnemonic (for backward compatibility)
    privateKey?: string; // Raw private key (optional)
  };
  message: string;
}

export interface ImportWalletResponse {
  success: boolean;
  data: {
    address: string;
    publicKey: string;
    privateKey?: string;
    seed?: string;
  };
  message: string;
}

export interface AccountBalanceResponse {
  success: boolean;
  data: {
    address: string;
    balances: { [tokenAddress: string]: string };
    tokens: Array<{
      address: string;
      balance: string;
    }>;
    totalBalance: number;
  };
  message: string;
}

export interface AccountInfoResponse {
  success: boolean;
  data: {
    address: string;
    publicKey: string;
    info: any;
    representative: string | null;
    permissions: any;
  };
  message: string;
}

export interface GenerateTokenPayload {
  seed: string;
  name: string;
  symbol: string;
  initialSupply: string;
  description?: string;
  metadata?: Record<string, any>;
  network?: string;
}

export interface GenerateTokenResponse {
  success: boolean;
  data: {
    tokenAddress: string;
    initialSupply: string;
    blocks: any[];
    publish: any;
  };
  code?: string;
  message: string;
}

export const walletApi = {
  /**
   * Create a new wallet using KeetaNet SDK
   */
  createWallet: async (): Promise<CreateWalletResponse> => {
    const response = await api.post<CreateWalletResponse>('/wallet/create');
    return response.data;
  },

  /**
   * Import wallet from seed (KeetaNet primary method)
   */
  importWalletFromSeed: async (seed: string): Promise<ImportWalletResponse> => {
    const response = await api.post<ImportWalletResponse>('/wallet/import/seed', {
      seed,
    });
    return response.data;
  },

  /**
   * Import wallet from mnemonic (for backward compatibility)
   */
  importWalletFromMnemonic: async (mnemonic: string): Promise<ImportWalletResponse> => {
    const response = await api.post<ImportWalletResponse>('/wallet/import/mnemonic', {
      mnemonic,
    });
    return response.data;
  },

  /**
   * Import wallet from private key
   */
  importWalletFromPrivateKey: async (privateKey: string): Promise<ImportWalletResponse> => {
    const response = await api.post<ImportWalletResponse>('/wallet/import/private-key', {
      privateKey,
    });
    return response.data;
  },

  /**
   * Get account balance and tokens
   */
  getAccountBalance: async (address: string): Promise<AccountBalanceResponse> => {
    const response = await api.get<AccountBalanceResponse>(`/wallet/balance/${address}`);
    return response.data;
  },

  /**
   * Get account info
   */
  getAccountInfo: async (address: string): Promise<AccountInfoResponse> => {
    const response = await api.get<AccountInfoResponse>(`/wallet/info/${address}`);
    return response.data;
  },

  /**
   * Create a token on KeetaNet
   */
  createToken: async (payload: GenerateTokenPayload): Promise<GenerateTokenResponse> => {
    const response = await api.post<GenerateTokenResponse>('/wallet/token/create', payload);
    return response.data;
  },
};

export default api;

