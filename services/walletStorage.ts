import * as SecureStore from 'expo-secure-store';

const WALLET_KEY = 'wallet_data';
const SEED_KEY = 'wallet_seed';
const MNEMONIC_KEY = 'wallet_mnemonic';
const PRIVATE_KEY_KEY = 'wallet_private_key';
const ADDRESS_KEY = 'wallet_address';
const PUBLIC_KEY_KEY = 'wallet_public_key';

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
  } catch (error) {
    console.error('Error deleting wallet:', error);
    throw new Error('Failed to delete wallet data');
  }
};

