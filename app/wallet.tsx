import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteWalletData, fetchAccountBalance, loadWalletFromStorage, setRefreshing } from '@/store/slices/walletSlice';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Clipboard, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  forceLock,
  initializeSecurity,
  refreshLockState,
  unlockWalletWithPassword,
  updateAutoLockDuration,
} from '@/store/slices/securitySlice';

const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60];

export default function WalletScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { walletData, balance, tokens, loading, refreshing } = useAppSelector((state) => state.wallet);
  const { locked, passwordSet, autoLockMinutes, initializing: securityInitializing } = useAppSelector(
    (state) => state.security
  );
  const address = walletData?.address || null;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [autoLockSaving, setAutoLockSaving] = useState(false);

  const loadWalletData = useCallback(async () => {
    // Load wallet from storage first
    const result = await dispatch(loadWalletFromStorage());
    
    if (loadWalletFromStorage.fulfilled.match(result) && result.payload) {
      // Fetch balance and tokens
      await dispatch(fetchAccountBalance(result.payload.address));
    } else {
      Alert.alert('Error', 'No wallet found. Please create or import a wallet.');
      router.replace('/');
    }
  }, [dispatch, router]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  useEffect(() => {
    dispatch(initializeSecurity());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(refreshLockState());
    }, [dispatch])
  );

  useEffect(() => {
    if (!securityInitializing && !passwordSet) {
      router.replace('/set-password');
    }
  }, [passwordSet, securityInitializing, router]);

  const onRefresh = () => {
    if (address) {
      dispatch(setRefreshing(true));
      dispatch(fetchAccountBalance(address));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    try {
      Clipboard.setString(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const formatBalance = (bal: number | string) => {
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    if (isNaN(num)) return '0.00';
    return num.toFixed(4);
  };

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently remove your wallet from this device. Make sure you have a backup before continuing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSettingsVisible(false);
              await dispatch(deleteWalletData()).unwrap();
              Alert.alert('Wallet Deleted', 'Your wallet has been removed from this device.');
              router.replace('/');
            } catch (error: any) {
              const message = typeof error === 'string' ? error : error?.message;
              Alert.alert('Error', message || 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleUnlockWallet = async () => {
    if (!passwordInput.trim()) {
      setUnlockError('Enter your password to continue');
      return;
    }

    setUnlockLoading(true);
    const result = await dispatch(unlockWalletWithPassword(passwordInput.trim()));
    setUnlockLoading(false);

    if (unlockWalletWithPassword.fulfilled.match(result)) {
      setPasswordInput('');
      setUnlockError('');
    } else {
      setUnlockError(
        (result.payload as string) || 'Incorrect password. Please try again.'
      );
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    if (minutes === autoLockMinutes) {
      return;
    }

    setAutoLockSaving(true);
    const result = await dispatch(updateAutoLockDuration(minutes));
    setAutoLockSaving(false);

    if (updateAutoLockDuration.rejected.match(result)) {
      Alert.alert('Error', (result.payload as string) || 'Failed to update auto-lock time.');
    }
  };

  const handleShowAddress = () => {
    if (!address) {
      Alert.alert('No Wallet', 'Please create or import a wallet first.');
      return;
    }
    setAddressModalVisible(true);
  };

  const handleBackupWallet = () => {
    if (!walletData?.mnemonic && !walletData?.seed) {
      Alert.alert('Unavailable', 'No seed phrase found for this wallet.');
      return;
    }
    setSettingsVisible(false);
    router.push('/backup-wallet');
  };

  const handleImmediateLock = () => {
    setSettingsVisible(false);
    dispatch(forceLock());
  };

  return (
    <View className="flex-1 bg-blue-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          padding: 20,
          paddingTop: 60,
        }}
      >
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-black">
                Wallet
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Manage your KeetaNet funds securely
              </Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
              onPress={() => setSettingsVisible(true)}
            >
              <Ionicons name="settings-outline" size={20} color="#1f2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View className="bg-blue-500 rounded-xl p-6 mb-6 shadow-lg">
          <Text className="text-white text-sm mb-2">
            Total Balance
          </Text>
          <Text className="text-white text-3xl font-bold mb-1">
            {formatBalance(balance)} KTA
          </Text>
          <Text className="text-white text-xs">
            KeetaNet Token Amount
          </Text>
        </View>

        {/* Tokens Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-black mb-4">
            Tokens
          </Text>
          
          {loading ? (
            <View className="bg-white rounded-lg p-6 items-center">
              <Text className="text-gray-500">Loading tokens...</Text>
            </View>
          ) : tokens.length === 0 ? (
            <View className="bg-white rounded-lg p-6 items-center border border-gray-200">
              <Ionicons name="wallet-outline" size={48} color="#999" />
              <Text className="text-gray-500 mt-3 text-center">
                No tokens found
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Your token balances will appear here
              </Text>
            </View>
          ) : (
            <View>
              {tokens.map((token: any, index: number) => (
                <TouchableOpacity
                  key={`${token.address}-${index}`}
                  className="bg-white rounded-lg p-4 border border-gray-200 flex-row items-center justify-between mb-3"
                  onPress={() => copyToClipboard(token.address, 'Token Address')}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <Text className="text-blue-600 font-bold text-sm">
                          {token.address.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-black font-semibold text-base">
                          Token {index + 1}
                        </Text>
                        <Text className="text-gray-500 text-xs font-mono">
                          {formatAddress(token.address)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-black font-semibold text-base">
                      {formatBalance(token.balance)}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      Balance
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row justify-between mb-6">
          <TouchableOpacity
            className="flex-1 bg-white rounded-lg p-4 items-center mr-2 border border-gray-200"
            onPress={handleShowAddress}
            disabled={!address}
            style={{ opacity: address ? 1 : 0.5 }}
          >
            <Ionicons name="arrow-down-outline" size={24} color="#2196F3" />
            <Text className="text-blue-500 font-semibold mt-2">Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white rounded-lg p-4 items-center ml-2 border border-gray-200"
          >
            <Ionicons name="arrow-up-outline" size={24} color="#2196F3" />
            <Text className="text-blue-500 font-semibold mt-2">Send</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={addressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-black">
                Receive Tokens
              </Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            {address ? (
              <>
                <View className="bg-gray-50 rounded-2xl p-4 items-center mb-4">
                  <QRCode value={address} size={180} color="#111827" backgroundColor="#fff" />
                </View>
                <View className="bg-gray-100 rounded-2xl p-3 mb-4">
                  <Text className="text-xs text-gray-500 mb-1">
                    Wallet Address
                  </Text>
                  <Text className="text-sm text-gray-900 font-mono">
                    {address}
                  </Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-center bg-blue-500 rounded-xl py-3"
                  onPress={() => copyToClipboard(address, 'Address')}
                >
                  <Ionicons name="copy-outline" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Copy Address
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-center text-gray-500">
                No wallet address available. Please create or import a wallet.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={() => setSettingsVisible(false)}
          />
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-black">
                Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                Auto-lock after
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {AUTO_LOCK_OPTIONS.map((minutes) => {
                  const isSelected = minutes === autoLockMinutes;
                  return (
                    <TouchableOpacity
                      key={minutes}
                      className={`px-4 py-2 rounded-xl border ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'
                      }`}
                      onPress={() => handleAutoLockChange(minutes)}
                      disabled={autoLockSaving}
                      style={{ opacity: autoLockSaving && !isSelected ? 0.6 : 1 }}
                    >
                      <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                        {minutes} min
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text className="text-xs text-gray-500 mt-3">
                Wallet locks after {autoLockMinutes} minute{autoLockMinutes === 1 ? '' : 's'} of inactivity.
              </Text>
            </View>
            <TouchableOpacity
              className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex-row items-center mb-4"
              onPress={handleImmediateLock}
              disabled={!passwordSet}
              style={{ opacity: passwordSet ? 1 : 0.5 }}
            >
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                <Ionicons name="lock-closed-outline" size={20} color="#111827" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-semibold text-base">
                  Lock Wallet Now
                </Text>
                <Text className="text-gray-500 text-xs">
                  Require your password immediately
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex-row items-center mb-4"
              onPress={handleBackupWallet}
              disabled={loading}
            >
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="shield-checkmark-outline" size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-blue-600 font-semibold text-base">
                  Backup Wallet
                </Text>
                <Text className="text-gray-500 text-xs">
                  View and secure your seed phrase
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-center"
              onPress={handleDeleteWallet}
              disabled={loading}
            >
              <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-red-600 font-semibold text-base">
                  Delete Wallet
                </Text>
                <Text className="text-gray-500 text-xs">
                  Remove wallet data from this device
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(passwordSet && locked)}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-white rounded-3xl p-6">
            <View className="items-center mb-4">
              <Ionicons name="lock-closed-outline" size={32} color="#111827" />
              <Text className="text-xl font-semibold text-black mt-3">
                Wallet Locked
              </Text>
              <Text className="text-sm text-gray-500 mt-1 text-center">
                Enter your password to view balances and manage your wallet.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 mb-2">
                Password
              </Text>
              <TextInput
                className="border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-900"
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                value={passwordInput}
                onChangeText={(text) => {
                  setPasswordInput(text);
                  if (unlockError) {
                    setUnlockError('');
                  }
                }}
                editable={!unlockLoading}
              />
              {unlockError ? (
                <Text className="text-xs text-red-600 mt-2">{unlockError}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              className="bg-blue-500 rounded-2xl py-4 items-center"
              onPress={handleUnlockWallet}
              disabled={unlockLoading}
              style={{ opacity: unlockLoading ? 0.7 : 1 }}
            >
              <Text className="text-white font-semibold text-base">
                {unlockLoading ? 'Checking...' : 'Unlock Wallet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

