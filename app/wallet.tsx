import { walletApi } from '@/services/api';
import { useToast } from '@/components/toast';
import { TokenSkeleton } from '@/components/skeleton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteWalletData, fetchAccountBalance, loadWalletFromStorage, setRefreshing } from '@/store/slices/walletSlice';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const { showToast, currentToast } = useToast();
  const { walletData, balance, tokens, loading, refreshing } = useAppSelector((state) => state.wallet);
  const { locked, passwordSet, autoLockMinutes, initializing: securityInitializing } = useAppSelector(
    (state) => state.security
  );
  const address = walletData?.address || null;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [autoLockSaving, setAutoLockSaving] = useState(false);
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTokenAddress, setSendTokenAddress] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ recipient?: string; amount?: string }>({});

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`${label} copied to clipboard`, 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  /**
   * Format balance for display
   * KeetaNetwork uses whole units, so we format as whole numbers with thousands separators
   */
  const formatBalance = (bal: number | string) => {
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    if (isNaN(num) || num === 0) return '0';
    // Format large numbers with commas for readability
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await dispatch(deleteWalletData()).unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('Wallet deleted successfully', 'success');
              router.replace('/');
            } catch (error: any) {
              const message = typeof error === 'string' ? error : error?.message;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showToast(message || 'Failed to delete wallet', 'error');
            }
          },
        },
      ]
    );
  };

  const handleUnlockWallet = async () => {
    if (!passwordInput.trim()) {
      setUnlockError('Enter your password to continue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setUnlockLoading(true);
    const result = await dispatch(unlockWalletWithPassword(passwordInput.trim()));
    setUnlockLoading(false);

    if (unlockWalletWithPassword.fulfilled.match(result)) {
      setPasswordInput('');
      setUnlockError('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Wallet unlocked', 'success');
    } else {
      const errorMsg = (result.payload as string) || 'Incorrect password. Please try again.';
      setUnlockError(errorMsg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    if (minutes === autoLockMinutes) {
      return;
    }

    setAutoLockSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await dispatch(updateAutoLockDuration(minutes));
    setAutoLockSaving(false);

    if (updateAutoLockDuration.fulfilled.match(result)) {
      showToast(`Auto-lock set to ${minutes} minute${minutes === 1 ? '' : 's'}`, 'success');
    } else if (updateAutoLockDuration.rejected.match(result)) {
      showToast((result.payload as string) || 'Failed to update auto-lock time.', 'error');
    }
  };

  const handleShowAddress = () => {
    if (!address) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Please create or import a wallet first', 'warning');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddressModalVisible(true);
  };

  const handleBackupWallet = () => {
    if (!walletData?.mnemonic && !walletData?.seed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('No seed phrase found for this wallet', 'warning');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettingsVisible(false);
    router.push('/backup-wallet');
  };

  const handleImmediateLock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSettingsVisible(false);
    dispatch(forceLock());
    showToast('Wallet locked', 'info');
  };

  const closeSendModal = () => {
    if (sending) {
      return;
    }
    setSendModalVisible(false);
    setSendRecipient('');
    setSendAmount('');
    setSendTokenAddress('');
    setSendError('');
    setValidationErrors({});
  };

  const handleOpenSendModal = () => {
    if (!address) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Please create or import a wallet first', 'warning');
      return;
    }
    const signerSecret = walletData?.seed || walletData?.privateKey;
    if (!signerSecret) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Unlock your wallet to send tokens', 'warning');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSendModalVisible(true);
  };

  const handlePrefillToken = (tokenAddr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSendTokenAddress(tokenAddr);
  };

  // Validate send form
  const validateSendForm = () => {
    const errors: { recipient?: string; amount?: string } = {};
    
    if (!sendRecipient.trim()) {
      errors.recipient = 'Recipient address is required';
    } else if (sendRecipient.trim().length < 10) {
      errors.recipient = 'Recipient address appears invalid';
    }

    if (!sendAmount.trim()) {
      errors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(sendAmount.trim());
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else {
        // Check if sending token or base token
        const selectedToken = tokens.find(t => t.address === sendTokenAddress);
        if (selectedToken) {
          const tokenBalance = parseFloat(selectedToken.balance);
          if (amountNum > tokenBalance) {
            errors.amount = `Insufficient balance. Available: ${formatBalance(tokenBalance)}`;
          }
        } else if (sendTokenAddress.trim() === '') {
          // Base token - check total balance
          if (amountNum > balance) {
            errors.amount = `Insufficient balance. Available: ${formatBalance(balance)}`;
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSend = async () => {
    const signerSecret = walletData?.seed || walletData?.privateKey;
    if (!signerSecret) {
      setSendError('Wallet seed is required to sign transfers.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!validateSendForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSending(true);
    setSendError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await walletApi.transferTokens({
        seed: signerSecret.trim(),
        recipient: sendRecipient.trim(),
        amount: sendAmount.trim(),
        tokenAddress: sendTokenAddress.trim() || undefined,
        network: "main"
      });

      if (!response.success) {
        throw new Error(response.message || 'Transfer failed');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        `Successfully sent ${formatBalance(response.data.amount)} units`,
        'success',
        4000
      );
      closeSendModal();
      if (address) {
        dispatch(fetchAccountBalance(address));
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send tokens';
      setSendError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      {currentToast}
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
            <View>
              <TokenSkeleton />
              <TokenSkeleton />
              <TokenSkeleton />
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
              {tokens.map((token: any, index: number) => {
                const tokenAddress = token.address || '';
                return (
                  <TouchableOpacity
                    key={`${tokenAddress}-${index}`}
                    className="bg-white rounded-lg p-4 border border-gray-200 flex-row items-center justify-between mb-3"
                    onPress={() => copyToClipboard(tokenAddress, 'Token Address')}
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                          <Text className="text-blue-600 font-bold text-sm">
                            {tokenAddress ? tokenAddress.slice(0, 2).toUpperCase() : '??'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-black font-semibold text-base">
                            Token {index + 1}
                          </Text>
                          <Text className="text-gray-500 text-xs font-mono">
                            {formatAddress(tokenAddress)}
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
                );
              })}
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
            onPress={handleOpenSendModal}
            disabled={!address}
            style={{ opacity: address ? 1 : 0.5 }}
          >
            <Ionicons name="arrow-up-outline" size={24} color="#2196F3" />
            <Text className="text-blue-500 font-semibold mt-2">Send</Text>
          </TouchableOpacity>
        </View>

        {/* Token tools */}
        <View className="bg-white rounded-2xl p-5 border border-gray-200 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-semibold text-black">Token Tools</Text>
              <Text className="text-sm text-gray-500">Create identifiers and manage supply</Text>
            </View>
            <Ionicons name="apps-outline" size={20} color="#111827" />
          </View>
          <TouchableOpacity
            className="flex-row items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl p-4"
            onPress={() => router.push('/create-token')}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="add-circle-outline" size={22} color="#2563eb" />
              </View>
              <View>
                <Text className="text-blue-600 font-semibold text-base">Create Token</Text>
                <Text className="text-gray-500 text-xs">Mint a fungible token via KeetaNet</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2563eb" />
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
        visible={sendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSendModal}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="flex-1 bg-black/40"
            activeOpacity={1}
            onPress={closeSendModal}
          />
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-black">
                Send Tokens
              </Text>
              <TouchableOpacity onPress={closeSendModal}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 mb-2">
                Recipient Address
              </Text>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-sm text-gray-900 ${
                  validationErrors.recipient ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="Enter recipient address"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                value={sendRecipient}
                onChangeText={(text) => {
                  setSendRecipient(text);
                  if (sendError) setSendError('');
                  if (validationErrors.recipient) {
                    setValidationErrors({ ...validationErrors, recipient: undefined });
                  }
                }}
                onBlur={validateSendForm}
                editable={!sending}
              />
              {validationErrors.recipient && (
                <Text className="text-xs text-red-600 mt-1">{validationErrors.recipient}</Text>
              )}
            </View>

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-gray-600">
                  Amount (whole units)
                </Text>
                {sendTokenAddress.trim() === '' && balance > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSendAmount(balance.toString());
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    disabled={sending}
                  >
                    <Text className="text-xs text-blue-500 font-semibold">Max</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                className={`border rounded-2xl px-4 py-3 text-sm text-gray-900 ${
                  validationErrors.amount ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={sendAmount}
                onChangeText={(text) => {
                  setSendAmount(text.replace(/[^0-9]/g, ''));
                  if (sendError) setSendError('');
                  if (validationErrors.amount) {
                    setValidationErrors({ ...validationErrors, amount: undefined });
                  }
                }}
                onBlur={validateSendForm}
                editable={!sending}
              />
              {validationErrors.amount && (
                <Text className="text-xs text-red-600 mt-1">{validationErrors.amount}</Text>
              )}
              {!validationErrors.amount && sendAmount && (
                <Text className="text-xs text-gray-500 mt-1">
                  Available: {formatBalance(
                    sendTokenAddress.trim() 
                      ? tokens.find(t => t.address === sendTokenAddress)?.balance || '0'
                      : balance.toString()
                  )}
                </Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-600 mb-2">
                Token Address (optional)
              </Text>
              <TextInput
                className="border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
                placeholder="Leave blank for base token"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                value={sendTokenAddress}
                onChangeText={(text) => {
                  setSendTokenAddress(text);
                  if (sendError) setSendError('');
                }}
                editable={!sending}
              />
              <Text className="text-xs text-gray-500 mt-2">
                Tap a token below to autofill or leave empty to send KTA.
              </Text>
            </View>

            {tokens.length > 0 && (
              <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {tokens.map((token: any) => {
                    const tokenAddress = token.address || '';
                    return (
                      <TouchableOpacity
                        key={tokenAddress}
                        className={`mr-3 px-3 py-2 rounded-2xl border ${
                          sendTokenAddress === tokenAddress ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}
                        onPress={() => handlePrefillToken(tokenAddress)}
                        disabled={sending}
                      >
                        <Text className="text-xs font-mono text-gray-700">
                          {formatAddress(tokenAddress)}
                        </Text>
                        <Text className="text-[10px] text-gray-500">
                          Bal: {formatBalance(token.balance)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {sendError ? (
              <Text className="text-xs text-red-600 mb-3">{sendError}</Text>
            ) : null}

            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${
                Object.keys(validationErrors).length > 0 || sending
                  ? 'bg-gray-400'
                  : 'bg-blue-500'
              }`}
              onPress={handleSubmitSend}
              disabled={sending || Object.keys(validationErrors).length > 0}
              style={{ opacity: sending || Object.keys(validationErrors).length > 0 ? 0.7 : 1 }}
            >
              {sending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white font-semibold text-base ml-2">
                    Sending...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">
                  Send Tokens
                </Text>
              )}
            </TouchableOpacity>
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

