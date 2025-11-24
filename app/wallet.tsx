import { useEffect, useState } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity, View, Text, Clipboard, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadWalletFromStorage, fetchAccountBalance, setRefreshing, deleteWalletData } from '@/store/slices/walletSlice';

export default function WalletScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { walletData, balance, tokens, loading, refreshing } = useAppSelector((state) => state.wallet);
  const address = walletData?.address || null;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    // Load wallet from storage first
    const result = await dispatch(loadWalletFromStorage());
    
    if (loadWalletFromStorage.fulfilled.match(result) && result.payload) {
      // Fetch balance and tokens
      await dispatch(fetchAccountBalance(result.payload.address));
    } else {
      Alert.alert('Error', 'No wallet found. Please create or import a wallet.');
      router.replace('/');
    }
  };

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
    } catch (error) {
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

  const handleShowAddress = () => {
    if (!address) {
      Alert.alert('No Wallet', 'Please create or import a wallet first.');
      return;
    }
    setAddressModalVisible(true);
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
    </View>
  );
}

