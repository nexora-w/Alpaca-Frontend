import { useState } from 'react';
import { ScrollView, Alert, ActivityIndicator, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { importWalletFromSeed, importWalletFromMnemonic } from '@/store/slices/walletSlice';
import { walletApi } from '@/services/api';
import { saveWallet } from '@/services/walletStorage';

type ImportMethod = 'seed' | 'mnemonic' | 'privateKey';

export default function ImportWalletScreen() {
  const dispatch = useAppDispatch();
  const { loading, error, walletData } = useAppSelector((state) => state.wallet);
  const [importMethod, setImportMethod] = useState<ImportMethod>('seed');
  const [seed, setSeed] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const router = useRouter();

  const handleImport = async () => {
    try {
      let result;

      if (importMethod === 'seed') {
        if (!seed.trim()) {
          Alert.alert('Error', 'Please enter your seed');
          return;
        }
        result = await dispatch(importWalletFromSeed(seed.trim()));
      } else if (importMethod === 'mnemonic') {
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
        return;
      }

      if (importWalletFromSeed.fulfilled.match(result) || importWalletFromMnemonic.fulfilled.match(result)) {
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
      } else if (importWalletFromSeed.rejected.match(result) || importWalletFromMnemonic.rejected.match(result)) {
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
    <View className="flex-1 bg-blue-50">
      <ScrollView 
        contentContainerStyle={{ 
          padding: 20, 
          flexGrow: 1, 
          justifyContent: 'center' 
        }}
      >
        <Text className="text-xl font-bold text-black text-center mb-2">
          Import Wallet
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6 leading-6">
          Import an existing KeetaNet wallet using your seed, mnemonic phrase, or private key.
        </Text>

        <View className="flex-row mb-5 gap-2">
          <TouchableOpacity
            className={`flex-1 py-3 px-4 rounded-xl items-center ${
              importMethod === 'seed' ? 'bg-blue-500' : 'bg-white border border-blue-500'
            }`}
            onPress={() => setImportMethod('seed')}
          >
            <Text
              className={`text-base font-semibold ${
                importMethod === 'seed' ? 'text-white' : 'text-blue-500'
              }`}
            >
              Seed
            </Text>
          </TouchableOpacity>
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

        {importMethod === 'seed' ? (
          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-2">
              Wallet Seed
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl p-3 text-base min-h-[100px] text-gray-900"
              value={seed}
              onChangeText={setSeed}
              placeholder="Enter your wallet seed"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              secureTextEntry
              textAlignVertical="top"
            />
            <Text className="text-xs text-gray-500 mt-2">
              Enter your KeetaNet wallet seed
            </Text>
          </View>
        ) : importMethod === 'mnemonic' ? (
          <View className="mb-5">
            <Text className="text-base font-semibold text-black mb-2">
              Mnemonic Phrase
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl p-3 text-base min-h-[100px] text-gray-900"
              value={mnemonic}
              onChangeText={setMnemonic}
              placeholder="Enter your mnemonic phrase"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              secureTextEntry
              textAlignVertical="top"
            />
            <Text className="text-xs text-gray-500 mt-2">
              Enter your mnemonic phrase (treated as seed)
            </Text>
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


