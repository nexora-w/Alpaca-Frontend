import { walletApi } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const NETWORK_OPTIONS: Array<'test' | 'main' | 'dev'> = ['test', 'main', 'dev'];
const TOKEN_NAME_REGEX = /^[A-Z_]{1,50}$/;
const TOKEN_SYMBOL_REGEX = /^[A-Z0-9_]{1,16}$/;

const FRIENDLY_ERROR_TEXT: Record<string, string> = {
  TOKEN_NAME_INVALID: 'Token names must use uppercase letters or underscores (max 50 characters).',
  TOKEN_SYMBOL_INVALID: 'Token symbols must use uppercase letters, digits, or underscores (max 16 characters).',
  INSUFFICIENT_FUNDS: 'Insufficient base token balance to pay the creation fee. Receive more funds and try again.',
  NETWORK_TIMEOUT: 'KeetaNet representatives did not respond in time. Please retry in a moment.',
  TOKEN_CREATE_ERROR: 'We could not create this token. Double-check your inputs and try again.',
};

const describeError = (code?: string, fallback?: string) => {
  if (code && FRIENDLY_ERROR_TEXT[code]) {
    return FRIENDLY_ERROR_TEXT[code];
  }
  if (fallback) {
    return fallback;
  }
  return 'Something went wrong while creating the token. Please try again.';
};

export default function CreateTokenScreen() {
  const router = useRouter();
  const { walletData } = useAppSelector((state) => state.wallet);
  const storedSeed = walletData?.seed || walletData?.privateKey || '';
  const [seedOverride, setSeedOverride] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('1000');
  const [description, setDescription] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [network, setNetwork] = useState<'test' | 'main' | 'dev'>('test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    tokenAddress: string;
    initialSupply: string;
  }>(null);

  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  const resolvedSeed = useMemo(() => {
    return (storedSeed || seedOverride).trim();
  }, [seedOverride, storedSeed]);

  const handleCopy = async (value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Copied', 'Token address copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const isNameValid = TOKEN_NAME_REGEX.test(name);
  const isSymbolValid = TOKEN_SYMBOL_REGEX.test(symbol);
  const isSupplyValid = /^[0-9]+$/.test(supply.trim());
  const isSeedPresent = Boolean(resolvedSeed);

  const showErrorAlert = (code?: string, fallback?: string) => {
    Alert.alert('Warning', describeError(code, fallback), [{ text: 'OK' }], { cancelable: true });
  };

  const handleSubmit = async () => {
    setError('');
    setErrorCode(undefined);

    if (!isSeedPresent) {
      setError('Seed is required. Paste your 64-character seed to continue.');
      return;
    }

    if (!isNameValid) {
      setError('Token name must be uppercase letters or underscores (max 50 chars).');
      return;
    }

    if (!isSymbolValid) {
      setError('Token symbol must be uppercase letters, numbers, or underscores (max 16 chars).');
      return;
    }

    if (!isSupplyValid) {
      setError('Initial supply must be a positive whole number.');
      return;
    }

    try {
      setLoading(true);
      const response = await walletApi.createToken({
        seed: resolvedSeed,
        name: name.trim(),
        symbol: symbol.trim(),
        initialSupply: supply.trim(),
        description: description.trim(),
        metadata: metadataUrl.trim() ? { metadataUrl: metadataUrl.trim() } : undefined,
        network,
      });

      if (response.success && response.data) {
        setResult({
          tokenAddress: response.data.tokenAddress,
          initialSupply: response.data.initialSupply,
        });
        Alert.alert('Success', 'Token submitted to KeetaNet representatives.');
      } else {
        setError(response.message || 'Failed to create token.');
        setErrorCode((response as any).code);
        showErrorAlert((response as any).code, response.message);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create token';
      const code = err.response?.data?.code;
      setError(message);
      setErrorCode(code);
       showErrorAlert(code, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: 60,
        }}
      >
        <TouchableOpacity className="flex-row items-center mb-6" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1f2937" />
          <Text className="text-base text-gray-700 ml-1">Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-black mb-2">Create Token</Text>
        <Text className="text-gray-600 mb-6">
          Generate a fungible token on KeetaNet using your wallet&apos;s seed. Refer to the KeetaNet guide for how tokens, permissions, and vote staples work.
        </Text>

        {!storedSeed && (
          <View className="bg-yellow-100 border border-yellow-300 rounded-2xl p-4 mb-5">
            <Text className="text-yellow-800 font-semibold mb-1">Seed required</Text>
            <Text className="text-yellow-800 text-sm">
              We couldn&apos;t find a seed for this wallet. Paste your 64-character seed below. It is used locally to sign the token transaction before sending it through the backend.
            </Text>
          </View>
        )}

        <View className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-black mb-4">Token details</Text>

          <Text className="text-xs font-semibold text-gray-500 mb-2">Name</Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3 mb-2 bg-gray-50 text-gray-900 ${
              isNameValid ? 'border-gray-200' : 'border-red-300'
            }`}
            placeholder="ALPACA_TOKEN"
            value={name}
            autoCapitalize="characters"
            onChangeText={(text) => setName(text.replace(/[^A-Za-z_]/g, '').toUpperCase())}
          />
          <Text className={`text-xs mb-4 ${isNameValid ? 'text-gray-400' : 'text-red-500'}`}>
            Use uppercase letters or underscores only (max 50 chars).
          </Text>

          <Text className="text-xs font-semibold text-gray-500 mb-2">Symbol</Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3 mb-2 bg-gray-50 text-gray-900 uppercase ${
              isSymbolValid ? 'border-gray-200' : 'border-red-300'
            }`}
            placeholder="ALPA"
            autoCapitalize="characters"
            value={symbol}
            onChangeText={(text) => setSymbol(text.replace(/[^A-Za-z0-9_]/g, '').toUpperCase().slice(0, 16))}
          />
          <Text className={`text-xs mb-4 ${isSymbolValid ? 'text-gray-400' : 'text-red-500'}`}>
            Uppercase letters, numbers, or underscores (max 16 chars).
          </Text>

          <Text className="text-xs font-semibold text-gray-500 mb-2">Initial Supply</Text>
          <TextInput
            className={`border rounded-2xl px-4 py-3 mb-1 bg-gray-50 text-gray-900 ${
              isSupplyValid ? 'border-gray-200' : 'border-red-300'
            }`}
            placeholder="1000"
            keyboardType="numeric"
            value={supply}
            onChangeText={setSupply}
          />
          <Text className="text-xs text-gray-400 mb-4">Whole number of base units to mint.</Text>

          <Text className="text-xs font-semibold text-gray-500 mb-2">Description</Text>
          <TextInput
            className="border border-gray-200 rounded-2xl px-4 py-3 mb-4 bg-gray-50 text-gray-900"
            placeholder="What does this token represent?"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <Text className="text-xs font-semibold text-gray-500 mb-2">Metadata URL (optional)</Text>
          <TextInput
            className="border border-gray-200 rounded-2xl px-4 py-3 mb-4 bg-gray-50 text-gray-900"
            placeholder="https://example.com/metadata.json"
            value={metadataUrl}
            onChangeText={setMetadataUrl}
          />

          <Text className="text-xs font-semibold text-gray-500 mb-2">Target Network</Text>
          <View className="flex-row gap-2 mb-4">
            {NETWORK_OPTIONS.map((option) => {
              const selected = option === network;
              return (
                <TouchableOpacity
                  key={option}
                  className={`px-4 py-2 rounded-xl border ${
                    selected ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'
                  }`}
                  onPress={() => setNetwork(option)}
                >
                  <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-700'}`}>
                    {option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-black mb-4">Signing seed</Text>
          <Text className="text-sm text-gray-600 mb-3">
            The KeetaNet SDK signs the token transaction with your seed. It never leaves your device unless you paste it here.
          </Text>
          <TextInput
            className="border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50 text-gray-900 font-mono"
            placeholder="Paste your 64-character seed"
            value={storedSeed ? 'Seed stored securely' : seedOverride}
            editable={!storedSeed}
            secureTextEntry={!storedSeed}
            onChangeText={setSeedOverride}
          />
          {storedSeed && (
            <Text className="text-xs text-green-600 mt-2">Using encrypted seed from secure storage.</Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-blue-500 rounded-2xl py-4 items-center"
          onPress={handleSubmit}
          disabled={loading || !isSeedPresent || !isNameValid || !isSymbolValid || !isSupplyValid}
          style={{ opacity: loading || !isSeedPresent || !isNameValid || !isSymbolValid || !isSupplyValid ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Create Token</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View className="bg-green-50 border border-green-200 rounded-3xl p-5 mt-6">
            <Text className="text-green-700 font-semibold mb-2">Token ready</Text>
            <Text className="text-sm text-green-700 mb-4">
              Share this token address with holders after the vote staple confirms on-chain.
            </Text>
            <View className="bg-white rounded-2xl p-4 border border-green-200 mb-3">
              <Text className="text-xs text-gray-500 mb-2">Token Address</Text>
              <Text className="text-sm text-gray-900 font-mono">{result.tokenAddress}</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center justify-center bg-green-600 rounded-2xl py-3 mb-3"
              onPress={() => handleCopy(result.tokenAddress)}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Copy Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-green-500 rounded-2xl py-3 items-center"
              onPress={() => router.replace('/wallet')}
            >
              <Text className="text-green-700 font-semibold">Back to Wallet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


