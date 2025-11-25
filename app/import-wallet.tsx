import { walletApi } from '@/services/api';
import { saveWallet } from '@/services/walletStorage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { importWalletFromMnemonic, loadWalletFromStorage } from '@/store/slices/walletSlice';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ImportMethod = 'mnemonic' | 'privateKey';
const TOTAL_MNEMONIC_WORDS = 24;

export default function ImportWalletScreen() {
  const dispatch = useAppDispatch();
  const { loading, walletData } = useAppSelector((state) => state.wallet);
  const [importMethod, setImportMethod] = useState<ImportMethod>('mnemonic');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(Array(TOTAL_MNEMONIC_WORDS).fill(''));
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const router = useRouter();

  const handleWordChange = (index: number, value: string) => {
    setMnemonicWords((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (!clipboardText || !clipboardText.trim()) {
        Alert.alert('Error', 'No text found in clipboard');
        return;
      }

      // Split by whitespace (spaces, tabs, newlines)
      const words = clipboardText.trim().split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === TOTAL_MNEMONIC_WORDS) {
        // Fill all 24 fields with the words
        setMnemonicWords(words);
        Alert.alert('Success', 'Mnemonic phrase pasted successfully!');
      } else if (words.length > TOTAL_MNEMONIC_WORDS) {
        Alert.alert('Error', `Found ${words.length} words, but expected ${TOTAL_MNEMONIC_WORDS} words.`);
      } else {
        Alert.alert('Error', `Found only ${words.length} words, but expected ${TOTAL_MNEMONIC_WORDS} words.`);
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      Alert.alert('Error', 'Failed to read from clipboard');
    }
  }, []);

  const handleClear = useCallback(() => {
    if (importMethod === 'mnemonic') {
      setMnemonicWords(Array(TOTAL_MNEMONIC_WORDS).fill(''));
    } else {
      setPrivateKey('');
    }
  }, [importMethod]);

  // Add keyboard shortcut support (Ctrl+V / Cmd+V) for web
  useEffect(() => {
    // Only add keyboard listener on web platform
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+V (Windows/Linux) or Cmd+V (Mac) is pressed
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        // Only handle paste if mnemonic method is selected
        if (importMethod === 'mnemonic') {
          event.preventDefault();
          handlePaste();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [importMethod, handlePaste]); // Re-run when importMethod or handlePaste changes

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
            privateKey: privateKey.trim(),
          });
          Alert.alert(
            'Success',
            'Wallet imported successfully! Create a password next to secure it.',
            [
              {
                text: 'Continue',
                onPress: () => router.replace('/set-password'),
              },
            ]
          );
        }
        await dispatch(loadWalletFromStorage());
        router.replace('/set-password');
        return;
      }

      if (importWalletFromMnemonic.fulfilled.match(result)) {
        router.replace('/set-password');
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
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-base font-semibold text-black">
                Mnemonic Phrase
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="bg-gray-500 py-2 px-4 rounded-lg"
                  onPress={handleClear}
                >
                  <Text className="text-white text-sm font-semibold">Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-500 py-2 px-4 rounded-lg"
                  onPress={handlePaste}
                >
                  <Text className="text-white text-sm font-semibold">Paste</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text className="text-xs text-gray-500 mb-3">
              Enter each word in order exactly as provided in your 24-word recovery phrase.
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {mnemonicWords.map((word, index) => (
                <View key={index} className="w-[32%] rounded-lg p-2 mb-1 mx-auto">
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                    value={word}
                    onChangeText={(text) => {
                      // Check if the pasted text contains multiple words (24 words)
                      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                      if (words.length === TOTAL_MNEMONIC_WORDS) {
                        // Auto-fill all fields
                        setMnemonicWords(words);
                        Alert.alert('Success', 'Mnemonic phrase pasted successfully!');
                      } else {
                        // Normal single word input
                        handleWordChange(index, text);
                      }
                    }}
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
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-base font-semibold text-black">
                Private Key
              </Text>
              <TouchableOpacity
                className="bg-gray-500 py-2 px-4 rounded-lg"
                onPress={handleClear}
              >
                <Text className="text-white text-sm font-semibold">Clear</Text>
              </TouchableOpacity>
            </View>
            <View className="relative">
              <TextInput
                className="bg-white border border-gray-300 rounded-xl py-3 pl-4 pr-12 text-base min-h-[50px] text-gray-900 font-mono"
                value={privateKey}
                onChangeText={setPrivateKey}
                placeholder="Enter your private key"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!privateKeyVisible}
              />
              <TouchableOpacity
                onPress={() => setPrivateKeyVisible((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex-row items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={privateKeyVisible ? 'Hide private key' : 'Show private key'}
              >
                <Ionicons name={privateKeyVisible ? 'eye-off' : 'eye'} size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>
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


