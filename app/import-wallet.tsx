import { useState } from 'react';
import { ScrollView, Alert, ActivityIndicator, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { importWalletFromMnemonic, loadWalletFromStorage } from '@/store/slices/walletSlice';
import { walletApi } from '@/services/api';
import { saveWallet } from '@/services/walletStorage';

type ImportMethod = 'mnemonic' | 'privateKey';
const TOTAL_MNEMONIC_WORDS = 24;

export default function ImportWalletScreen() {
  const dispatch = useAppDispatch();
  const { loading, error, walletData } = useAppSelector((state) => state.wallet);
  const [importMethod, setImportMethod] = useState<ImportMethod>('mnemonic');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(TOTAL_MNEMONIC_WORDS).fill(''));
  const [privateKey, setPrivateKey] = useState('');
  const router = useRouter();

  const handleWordChange = (index: number, value: string) => {
    setMnemonicWords((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleImport = async () => {
    try {
      let result;

      if (importMethod === 'mnemonic') {
        const selectedWords = mnemonicWords.map((word) => word.trim());
        const hasEmpty = selectedWords.some((word) => word.length === 0);
        if (hasEmpty) {
          Alert.alert('Error', 'Please fill in every mnemonic word.');
          return;
        }
        const mnemonic = selectedWords.join(' ');
        if (!mnemonic.trim()) {
          Alert.alert('Error', 'Please enter your mnemonic phrase');
          return;
        }
        result = await dispatch(importWalletFromMnemonic(mnemonic.trim()));
      } else {
        // Private key import - still using direct API call for now
        if (!privateKey.trim()) {
          Alert.alert('Error', 'Please enter your private key');
          return;
        }
        const response = await walletApi.importWalletFromPrivateKey(privateKey.trim());
        if (response.success && response.data) {
          await saveWallet({
            address: response.data.address,
            publicKey: response.data.publicKey,
          });
          Alert.alert(
            'Success',
            'Wallet imported successfully!',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/wallet'),
              },
            ]
          );
        }
        await dispatch(loadWalletFromStorage());
        router.replace('/wallet');
        return;
      }

      if (importWalletFromMnemonic.fulfilled.match(result)) {
        router.replace('/wallet');
      } else if (importWalletFromMnemonic.rejected.match(result)) {
        Alert.alert(
          'Error',
          (result.payload as string) || 'Failed to import wallet. Please check your credentials and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error importing wallet:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to import wallet. Please check your credentials and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View className="flex-1 bg-blue-50 min-h-screen">
      <ScrollView 
        contentContainerStyle={{ 
          padding: 20, 
          flexGrow: 1, 
          justifyContent: 'flex-start' 
        }}
      >

        <View className="flex-row mb-5 gap-2">
          <TouchableOpacity
            className={`flex-1 py-3 px-4 rounded-xl items-center ${
              importMethod === 'mnemonic' ? 'bg-blue-500' : 'bg-white border border-blue-500'
            }`}
            onPress={() => setImportMethod('mnemonic')}
          >
            <Text
              className={`text-base font-semibold ${
                importMethod === 'mnemonic' ? 'text-white' : 'text-blue-500'
              }`}
            >
              Mnemonic
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 px-4 rounded-xl items-center ${
              importMethod === 'privateKey' ? 'bg-blue-500' : 'bg-white border border-blue-500'
            }`}
            onPress={() => setImportMethod('privateKey')}
          >
            <Text
              className={`text-base font-semibold ${
                importMethod === 'privateKey' ? 'text-white' : 'text-blue-500'
              }`}
            >
              Private Key
            </Text>
          </TouchableOpacity>
        </View>

        {importMethod === 'mnemonic' ? (
          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-3">
              Mnemonic Phrase
            </Text>
            <Text className="text-xs text-gray-500 mb-3">
              Enter each word in order exactly as provided in your 24-word recovery phrase.
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {mnemonicWords.map((word, index) => (
                <View key={index} className="w-[32%] rounded-lg p-2 mb-1 mx-auto">
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                    value={word}
                    onChangeText={(text) => handleWordChange(index, text)}
                    placeholder={`Word ${index + 1}`}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-2">
              Private Key
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl p-3 text-base min-h-[50px] text-gray-900"
              value={privateKey}
              onChangeText={setPrivateKey}
              placeholder="Enter your private key"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              secureTextEntry
            />
            <Text className="text-xs text-gray-500 mt-2">
              Enter your private key (treated as seed)
            </Text>
          </View>
        )}

        {walletData?.address && (
          <View className="mt-5 mb-3">
            <Text className="text-lg font-semibold text-black mb-2">
              Imported Wallet Address
            </Text>
            <View className="bg-white p-3 rounded-xl border border-gray-200">
              <Text className="text-xs text-gray-700 font-mono">
                {walletData.address}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          className="bg-blue-500 py-4 px-8 rounded-xl w-full items-center mt-5 shadow-lg"
          onPress={handleImport}
          disabled={loading}
          style={{
            shadowColor: '#2196F3',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Import Wallet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


