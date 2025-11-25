import * as SecureStore from 'expo-secure-store';

const WALLET_KEY = 'wallet_data';
const SEED_KEY = 'wallet_seed';
const MNEMONIC_KEY = 'wallet_mnemonic';
const PRIVATE_KEY_KEY = 'wallet_private_key';
const ADDRESS_KEY = 'wallet_address';
const PUBLIC_KEY_KEY = 'wallet_public_key';
const PASSWORD_HASH_KEY = 'wallet_password_hash';
const AUTO_LOCK_MINUTES_KEY = 'wallet_auto_lock_minutes';
const LAST_UNLOCKED_AT_KEY = 'wallet_last_unlocked_at';

export interface WalletData {
  address: string;
  seed?: string;
  publicKey?: string;
  mnemonic?: string;
  privateKey?: string;
}

/**
 * Save wallet data securely
 */
export const saveWallet = async (walletData: WalletData): Promise<void> => {
  try {
    if (walletData.address) {
      await SecureStore.setItemAsync(ADDRESS_KEY, walletData.address);
    }
    if (walletData.seed) {
      await SecureStore.setItemAsync(SEED_KEY, walletData.seed);
    }
    if (walletData.publicKey) {
      await SecureStore.setItemAsync(PUBLIC_KEY_KEY, walletData.publicKey);
    }
    if (walletData.mnemonic) {
      await SecureStore.setItemAsync(MNEMONIC_KEY, walletData.mnemonic);
    }
    if (walletData.privateKey) {
      await SecureStore.setItemAsync(PRIVATE_KEY_KEY, walletData.privateKey);
    }
  } catch (error) {
    console.error('Error saving wallet:', error);
    throw new Error('Failed to save wallet data');
  }
};

/**
 * Get wallet address
 */
export const getWalletAddress = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(ADDRESS_KEY);
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
};

/**
 * Get wallet seed
 */
export const getWalletSeed = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SEED_KEY);
  } catch (error) {
    console.error('Error getting wallet seed:', error);
    return null;
  }
};

/**
 * Get wallet public key
 */
export const getWalletPublicKey = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(PUBLIC_KEY_KEY);
  } catch (error) {
    console.error('Error getting wallet public key:', error);
    return null;
  }
};

/**
 * Get wallet mnemonic
 */
export const getWalletMnemonic = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(MNEMONIC_KEY);
  } catch (error) {
    console.error('Error getting wallet mnemonic:', error);
    return null;
  }
};

/**
 * Get wallet private key
 */
export const getWalletPrivateKey = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  } catch (error) {
    console.error('Error getting wallet private key:', error);
    return null;
  }
};

/**
 * Get all wallet data
 */
export const getWallet = async (): Promise<WalletData | null> => {
  try {
    const address = await getWalletAddress();
    if (!address) {
      return null;
    }

    const seed = await getWalletSeed();
    const publicKey = await getWalletPublicKey();
    const mnemonic = await getWalletMnemonic();
    const privateKey = await getWalletPrivateKey();

    return {
      address,
      seed: seed || undefined,
      publicKey: publicKey || undefined,
      mnemonic: mnemonic || undefined,
      privateKey: privateKey || undefined,
    };
  } catch (error) {
    console.error('Error getting wallet:', error);
    return null;
  }
};

/**
 * Check if wallet exists
 */
export const hasWallet = async (): Promise<boolean> => {
  try {
    const address = await getWalletAddress();
    return address !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Delete wallet data
 */
export const deleteWallet = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ADDRESS_KEY);
    await SecureStore.deleteItemAsync(SEED_KEY);
    await SecureStore.deleteItemAsync(PUBLIC_KEY_KEY);
    await SecureStore.deleteItemAsync(MNEMONIC_KEY);
    await SecureStore.deleteItemAsync(PRIVATE_KEY_KEY);
    await clearSecurityData();
  } catch (error) {
    console.error('Error deleting wallet:', error);
    throw new Error('Failed to delete wallet data');
  }
};

/**
 * Save password hash (already hashed before calling)
 */
export const setWalletPasswordHash = async (hash: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(PASSWORD_HASH_KEY, hash);
  } catch (error) {
    console.error('Error saving wallet password:', error);
    throw new Error('Failed to save wallet password');
  }
};

export const getWalletPasswordHash = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(PASSWORD_HASH_KEY);
  } catch (error) {
    console.error('Error loading wallet password:', error);
    return null;
  }
};

export const clearWalletPassword = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(PASSWORD_HASH_KEY);
  } catch (error) {
    console.error('Error clearing wallet password:', error);
  }
};

export const setAutoLockMinutes = async (minutes: number): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTO_LOCK_MINUTES_KEY, minutes.toString());
  } catch (error) {
    console.error('Error saving auto-lock minutes:', error);
    throw new Error('Failed to save auto-lock setting');
  }
};

export const getAutoLockMinutes = async (): Promise<number | null> => {
  try {
    const value = await SecureStore.getItemAsync(AUTO_LOCK_MINUTES_KEY);
    return value ? parseInt(value, 10) : null;
  } catch (error) {
    console.error('Error loading auto-lock minutes:', error);
    return null;
  }
};

export const setLastUnlockedTimestamp = async (timestamp: number): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LAST_UNLOCKED_AT_KEY, timestamp.toString());
  } catch (error) {
    console.error('Error saving last unlocked timestamp:', error);
  }
};

export const getLastUnlockedTimestamp = async (): Promise<number | null> => {
  try {
    const value = await SecureStore.getItemAsync(LAST_UNLOCKED_AT_KEY);
    return value ? parseInt(value, 10) : null;
  } catch (error) {
    console.error('Error loading last unlocked timestamp:', error);
    return null;
  }
};

export const clearSecurityData = async (): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(PASSWORD_HASH_KEY),
      SecureStore.deleteItemAsync(AUTO_LOCK_MINUTES_KEY),
      SecureStore.deleteItemAsync(LAST_UNLOCKED_AT_KEY),
    ]);
  } catch (error) {
    console.error('Error clearing security data:', error);
  }
};

