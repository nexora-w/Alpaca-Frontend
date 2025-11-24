import { useEffect } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity, View, Text, Clipboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadWalletFromStorage, fetchAccountBalance, setRefreshing } from '@/store/slices/walletSlice';

export default function WalletScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { walletData, balance, tokens, loading, refreshing } = useAppSelector((state) => state.wallet);
  const address = walletData?.address || null;

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
          <Text className="text-2xl font-bold text-black mb-2">
            Wallet
          </Text>
          {address ? (
            <TouchableOpacity
              onPress={() => copyToClipboard(address, 'Address')}
              className="flex-row items-center bg-white p-3 rounded-lg border border-gray-200"
            >
              <Text className="text-xs text-gray-600 font-mono flex-1">
                {formatAddress(address)}
              </Text>
              <Ionicons name="copy-outline" size={16} color="#666" />
            </TouchableOpacity>
          ) : null}
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
    </View>
  );
}

