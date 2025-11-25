import { useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Text, Linking, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadWalletFromStorage } from '@/store/slices/walletSlice';

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const walletData = useAppSelector((state) => state.wallet.walletData);

  useEffect(() => {
    dispatch(loadWalletFromStorage());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (walletData?.address) {
        router.replace('/wallet');
      }
    }, [walletData, router])
  );

  const handleTermsPress = () => {
    // Handle Terms & Conditions link
    Linking.openURL('https://example.com/terms');
  };

  const handlePrivacyPress = () => {
    // Handle Privacy Policy link
    Linking.openURL('https://example.com/privacy');
  };

  return (
    <View className="flex-1 bg-blue-50">
      {/* Illustration Section */}
      <View className="flex-1 relative overflow-hidden">
        <ImageBackground 
          source={require('@/assets/images/alpaca.webp')} 
          className="w-full h-full" 
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          imageStyle={{ resizeMode: 'contain' }}
        />
      </View>

      {/* Content Section */}
      <View className="p-5 pt-10 pb-2 items-center min-h-[50%]">
        <Text className="text-xl font-bold text-black text-center mb-2">
          Welcome to Alpaca Wallet
        </Text>

        <Text className="text-base text-gray-600 text-center mb-6 leading-6 px-5">
          Your secure gateway to the decentralized web.
        </Text>

        {/* Buttons */}
        <TouchableOpacity
          className="bg-blue-500 py-4 px-8 rounded-xl w-full items-center mb-3 shadow-lg"
          onPress={() => router.push('/create-wallet')}
          style={{
            shadowColor: '#2196F3',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white text-base font-semibold">Create New Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white py-4 px-8 rounded-xl w-full items-center mb-6 border border-blue-500"
          onPress={() => router.push('/import-wallet')}
        >
          <Text className="text-blue-500 text-base font-semibold">Import Existing Wallet</Text>
        </TouchableOpacity>

        {/* Legal Disclaimer */}
        <Text className="text-xs text-gray-500 text-center leading-2 px-5">
          By continuing, you agree to our{' '}
          <Text className="font-bold text-gray-800" onPress={handleTermsPress}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text className="font-bold text-gray-800" onPress={handlePrivacyPress}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );
}


