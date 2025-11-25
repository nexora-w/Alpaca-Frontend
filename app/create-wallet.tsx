import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createWallet } from '@/store/slices/walletSlice';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function CreateWalletScreen() {
  const dispatch = useAppDispatch();
  const { loading, walletData, error } = useAppSelector((state) => state.wallet);
  const [seedVisible, setSeedVisible] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationPositions, setConfirmationPositions] = useState<Array<{
    position: number;
    correctWord: string;
    options: string[];
  }>>([]);
  const [selectedWords, setSelectedWords] = useState<{ [position: number]: string }>({});
  const router = useRouter();

  const handleCreateWallet = async () => {
    const result = await dispatch(createWallet());
    if (createWallet.rejected.match(result)) {
      Alert.alert(
        'Error',
        (result.payload as string) || 'Failed to create wallet. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNoteDownSeed = () => {
    setShowWarning(false);
    setSeedVisible(true);
  };

  const handleContinue = () => {
    const mnemonic = walletData?.mnemonic;
    if (mnemonic) {
      // Initialize confirmation screen
      const words = mnemonic.split(' ');
      const totalWords = words.length;
      
      // Select 3 random positions (typically positions like 2, 9, 11)
      const positions: number[] = [];
      while (positions.length < 3) {
        const pos = Math.floor(Math.random() * totalWords) + 1; // 1-based index
        if (!positions.includes(pos)) {
          positions.push(pos);
        }
      }
      positions.sort((a, b) => a - b);
      
      // Decoy words for generating options
      const decoyWords = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'academic', 'academy', 'accept', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic',
        'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict',
        'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid',
        'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm'
      ];
      
      const confirmationData = positions.map((pos) => {
        const correctWord = words[pos - 1];
        // Get 2 decoy words that aren't the correct word and aren't in the mnemonic
        const availableDecoys = decoyWords.filter(w => w !== correctWord && !words.includes(w));
        const shuffledDecoys = [...availableDecoys].sort(() => Math.random() - 0.5);
        const decoys = shuffledDecoys.slice(0, 2);
        
        // Create options array with correct word and 2 decoys, then shuffle
        const options = [correctWord, ...decoys].sort(() => Math.random() - 0.5);
        
        return {
          position: pos,
          correctWord,
          options,
        };
      });
      
      setConfirmationPositions(confirmationData);
      setSelectedWords({});
      setShowConfirmation(true);
    }
  };

  const handleWordSelect = (position: number, word: string) => {
    setSelectedWords({
      ...selectedWords,
      [position]: word,
    });
  };

  const handleConfirmSeed = () => {
    const mnemonic = walletData?.mnemonic;
    if (!mnemonic) {
      console.log('No wallet data');
      return;
    }
    
    // Check if all positions are selected
    const allSelected = confirmationPositions.every(item => selectedWords[item.position]);
    if (!allSelected) {
      console.log('Not all positions selected');
      Alert.alert('Error', 'Please select a word for each position.');
      return;
    }
    
    // Validate selections
    const allCorrect = confirmationPositions.every(item => {
      const selected = selectedWords[item.position];
      const correct = item.correctWord;
      console.log(`Position ${item.position}: selected="${selected}", correct="${correct}"`);
      return selected === correct;
    });
    
    console.log('All correct:', allCorrect);
    console.log('Selected words:', selectedWords);
    console.log('Confirmation positions:', confirmationPositions);
    
    if (allCorrect) {
      // Navigate to wallet page
      console.log('Validation successful, navigating to wallet...');
      router.replace('/wallet');
    } else {
      Alert.alert(
        'Incorrect',
        'One or more selected words are incorrect. Please try again.',
        [{ text: 'OK' }]
      );
      // Reset selections
      setSelectedWords({});
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
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
        {!walletData ? (
          <>
            <Text className="text-xl font-bold text-black text-center mb-2">
              Create Wallet
            </Text>
            <Text className="text-base text-gray-600 text-center mb-6 leading-6">
              Create a new KeetaNet wallet. You'll receive a recovery phrase that you must save securely.
            </Text>
            <TouchableOpacity
              className="bg-blue-500 py-4 px-8 rounded-xl w-full items-center mt-5 shadow-lg"
              onPress={handleCreateWallet}
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
                <Text className="text-white text-base font-semibold">Create New Wallet</Text>
              )}
            </TouchableOpacity>
          </>
        ) : showWarning ? (
          <View className="relative bg-gray-200 rounded-xl p-6">
            <Text className="text-xl font-bold text-black mb-6">
              Before noting down your seed phrase, you should
            </Text>

            <View className="mb-6">
              <View className="flex-row items-start mb-4">
                <Text className="text-black text-lg mr-3">✓</Text>
                <Text className="text-black flex-1">
                  Know it's the only way to recover your assets
                </Text>
              </View>
              <View className="flex-row items-start mb-4">
                <Text className="text-black text-lg mr-3">✓</Text>
                <Text className="text-black flex-1">
                  Never share your seed phrase with anyone
                </Text>
              </View>
              <View className="flex-row items-start mb-4">
                <Text className="text-black text-lg mr-3">✓</Text>
                <Text className="text-black flex-1">
                  Write it down by hand and store it safely
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-blue-500 py-4 px-8 rounded-xl w-full items-center mb-4"
              onPress={handleNoteDownSeed}
            >
              <Text className="text-white text-base font-semibold">Note down seed phrase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full items-center"
              onPress={() => router.replace('/')}
            >
              <Text className="text-gray-600">Maybe later</Text>
            </TouchableOpacity>
          </View>
        ) : showConfirmation ? (
          <View>
            <Text className="text-2xl font-bold text-black mb-2">
              Confirm seed phrase
            </Text>
            <Text className="text-base text-gray-600 mb-6">
              Select the right word for each position.
            </Text>

            {confirmationPositions.map((item) => (
              <View key={item.position} className="mb-6">
                <Text className="text-base font-semibold text-black mb-3">
                  Seed phrase #{item.position}
                </Text>
                <View className="flex-row justify-between">
                  {item.options.map((word, index) => {
                    const isSelected = selectedWords[item.position] === word;
                    return (
                      <TouchableOpacity
                        key={`${item.position}-${index}`}
                        onPress={() => handleWordSelect(item.position, word)}
                        className={`flex-1 mx-1 py-3 px-4 rounded-lg border ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-gray-200 border-gray-300'
                        }`}
                      >
                        <Text className={`text-center text-sm ${
                          isSelected ? 'text-white font-semibold' : 'text-black'
                        }`}>
                          {word}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity
              className={`py-4 px-8 rounded-xl w-full items-center mt-4 ${
                confirmationPositions.every(item => selectedWords[item.position])
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
              onPress={handleConfirmSeed}
              disabled={!confirmationPositions.every(item => selectedWords[item.position])}
            >
              <Text className={`text-base font-semibold ${
                confirmationPositions.every(item => selectedWords[item.position])
                  ? 'text-white'
                  : 'text-gray-500'
              }`}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-2xl font-bold text-black mb-4">
              Write down seed phrase
            </Text>

            <Text className="text-xs text-gray-600 mb-6">
              Write down the words in the sequence below and keep them safe. Don't share them with anyone, or you may permanently lose your assets.
            </Text>

            {walletData?.mnemonic && (
              <>
                <View className="flex-row justify-end mb-2">
                  <TouchableOpacity
                    className="flex-row items-center bg-blue-500 py-2 px-4 rounded-lg"
                    onPress={() => {
                      if (walletData?.mnemonic) {
                        copyToClipboard(walletData.mnemonic, 'Seed phrase');
                      }
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color="#fff" />
                    <Text className="text-white text-sm font-semibold ml-2">Copy</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setSeedVisible(!seedVisible)}
                  activeOpacity={0.7}
                  className="mb-6 relative"
                >
                  <View className="flex-row flex-wrap">
                    {walletData.mnemonic.split(' ').map((word: string, index: number) => (
                      <View
                        key={index}
                        className="w-[32%] bg-gray-200 border border-gray-300 rounded-lg p-2 mb-1 mx-auto"
                      >
                        <Text className="text-xs text-gray-500 mb-1 text-left">
                          {index + 1}. {seedVisible ? word : '••••••'}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {!seedVisible &&
                    <View className="flex justify-center items-center absolute bottom-0 left-0 right-0 top-0 bg-black/50 z-10 backdrop-blur-sm">
                      <Ionicons
                        name={seedVisible ? 'eye-off' : 'eye'}
                        size={24}
                        color="#000"
                      />
                      <Text className="text-sm text-white text-center mt-2 px-4">
                        Click on the seed phrase to show it in full or hide it. Make sure no one is looking at your screen.
                      </Text>
                    </View>
                  }
                </TouchableOpacity>
              </>
            )}


            <TouchableOpacity
              className="bg-blue-500 py-4 px-8 rounded-xl w-full items-center"
              onPress={handleContinue}
            >
              <Text className="text-white text-base font-semibold">I've noted it down</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


