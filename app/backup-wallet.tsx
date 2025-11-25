import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadWalletFromStorage } from '@/store/slices/walletSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Clipboard, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type RecoveryTab = 'phrase' | 'privateKey';

export default function BackupWalletScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { walletData } = useAppSelector((state) => state.wallet);
  const [phraseVisible, setPhraseVisible] = useState(false);
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<RecoveryTab>('phrase');

  useEffect(() => {
    dispatch(loadWalletFromStorage());
  }, [dispatch]);

  const phraseData = useMemo(() => {
    if (walletData?.mnemonic) {
      const normalized = walletData.mnemonic.trim().replace(/\s+/g, ' ');
      return {
        label: 'Seed Phrase (Mnemonic)',
        displayBlocks: normalized.split(' '),
        copyValue: normalized,
      };
    }
    if (walletData?.seed) {
      const normalized = walletData.seed.trim().replace(/\s+/g, ' ');
      return {
        label: 'Seed Phrase',
        displayBlocks: normalized.split(' '),
        copyValue: normalized,
      };
    }
    return null;
  }, [walletData]);

  const privateKeyValue = useMemo(() => walletData?.privateKey?.trim() || null, [walletData]);

  const availableTabs = useMemo<RecoveryTab[]>(() => {
    const tabs: RecoveryTab[] = [];
    if (phraseData) {
      tabs.push('phrase');
    }
    if (privateKeyValue) {
      tabs.push('privateKey');
    }
    return tabs;
  }, [phraseData, privateKeyValue]);

  const hasAnyRecovery = availableTabs.length > 0;

  useEffect(() => {
    if (!availableTabs.length) {
      return;
    }
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  const handleCopy = (value: string | null, label: string) => {
    if (!value) {
      Alert.alert('Unavailable', `No ${label.toLowerCase()} found for this wallet.`);
      return;
    }
    try {
      Clipboard.setString(value);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch {
      Alert.alert('Error', `Failed to copy ${label.toLowerCase()}`);
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
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center mr-3"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="#1f2937" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-black">
              Backup Wallet
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              View your recovery phrase securely
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
          <View className="flex-row items-center mb-4">
            <Ionicons name="warning-outline" size={20} color="#f97316" />
            <Text className="text-orange-500 font-semibold ml-2">
              Security reminder
            </Text>
          </View>
          <Text className="text-gray-600 mb-2">
            Anyone with your seed phrase can control your funds. Make sure you are in a private place before revealing it.
          </Text>
          <Text className="text-gray-600">
            Never share it digitally. Write it down and store it somewhere safe.
          </Text>
        </View>

        {!hasAnyRecovery ? (
          <View className="bg-white rounded-2xl p-6 border border-dashed border-gray-300 items-center">
            <Ionicons name="lock-closed-outline" size={36} color="#9ca3af" />
            <Text className="text-lg font-semibold text-black mt-4">
              No recovery phrase available
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              We could not find a stored recovery phrase or private key for this wallet.
            </Text>
            <TouchableOpacity
              className="mt-5 flex-row items-center"
              onPress={() => router.replace('/')}
            >
              <Ionicons name="home-outline" size={18} color="#2563eb" />
              <Text className="text-blue-600 font-semibold ml-2">
                Go to dashboard
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-6 border border-gray-200">
            {availableTabs.length > 1 && (
              <View className="flex-row mb-5 gap-2">
                {availableTabs.map((tab) => {
                  const isActive = activeTab === tab;
                  const label = tab === 'phrase' ? 'Seed Phrase' : 'Private Key';
                  return (
                    <TouchableOpacity
                      key={tab}
                      className={`flex-1 py-3 px-4 rounded-xl items-center ${
                        isActive ? 'bg-blue-500' : 'bg-white border border-blue-500'
                      }`}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isActive ? 'text-white' : 'text-blue-500'
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {activeTab === 'phrase' && phraseData && (
              <>
                <Text className="text-lg font-semibold text-black mb-2">
                  {phraseData.label}
                </Text>
                <Text className="text-xs text-gray-500 mb-4">
                  Tap the card to show or hide your phrase. Ensure no one else can see your screen.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPhraseVisible(!phraseVisible)}
                  className="relative mb-4"
                >
                  <View className="flex-row flex-wrap">
                    {phraseData.displayBlocks.map((block, index) => (
                      <View
                        key={`${block}-${index}`}
                        className="w-[32%] bg-gray-100 border border-gray-200 rounded-lg p-2 mb-2 mx-auto"
                      >
                        <Text className="text-xs text-gray-600">
                          {index + 1}. {phraseVisible ? block : '••••••'}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {!phraseVisible && (
                    <View className="flex items-center justify-center absolute top-0 bottom-0 left-0 right-0 bg-black/60 rounded-xl px-4">
                      <Ionicons name="eye" size={24} color="#fff" />
                      <Text className="text-xs text-white text-center mt-2">
                        Tap to reveal the full phrase
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center justify-center bg-blue-500 rounded-xl py-3"
                  onPress={() => handleCopy(phraseData.copyValue, phraseData.label)}
                >
                  <Ionicons name="copy-outline" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Copy {phraseData.label}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'privateKey' && privateKeyValue && (
              <>
                <Text className="text-lg font-semibold text-black mb-2">
                  Private Key
                </Text>
                <Text className="text-xs text-gray-500 mb-4">
                  Tap the eye icon to show or hide your private key. Anyone with it can control this wallet.
                </Text>

                <View className="mb-4">
                  <View className="relative">
                    <Text
                      className="bg-gray-100 border border-gray-200 rounded-xl py-3 pl-4 pr-12 font-mono text-sm text-gray-800"
                      selectable={privateKeyVisible}
                    >
                      {privateKeyVisible ? privateKeyValue : '••••••••••••••••••••••••••'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setPrivateKeyVisible((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex-row items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={privateKeyVisible ? 'Hide private key' : 'Show private key'}
                    >
                      <Ionicons name={privateKeyVisible ? 'eye-off' : 'eye'} size={20} color="#4b5563" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  className="flex-row items-center justify-center bg-blue-500 rounded-xl py-3"
                  onPress={() => handleCopy(privateKeyValue, 'Private Key')}
                >
                  <Ionicons name="copy-outline" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Copy Private Key
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}


