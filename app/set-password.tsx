import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeSecurity, setSecurityPassword } from '@/store/slices/securitySlice';

type PasswordStrength = 'low' | 'middle' | 'high';

const evaluatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'low';

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));

  if (variety >= 3) score += 1;

  if (score >= 3) return 'high';
  if (score >= 2) return 'middle';
  return 'low';
};

export default function SetPasswordScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { passwordSet, initializing, error } = useAppSelector((state) => state.security);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const strengthLabel = passwordStrength === 'high' ? 'High (Perfect)' : passwordStrength === 'middle' ? 'Middle' : 'Low';
  const strengthColor =
    passwordStrength === 'high' ? 'text-green-600' : passwordStrength === 'middle' ? 'text-yellow-600' : 'text-red-600';

  useEffect(() => {
    dispatch(initializeSecurity());
  }, [dispatch]);

  useEffect(() => {
    if (!initializing && passwordSet) {
      router.replace('/wallet');
    }
  }, [passwordSet, initializing, router]);

  const handleSavePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Password too short', 'Please use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await dispatch(setSecurityPassword(password));
    setSubmitting(false);

    if (setSecurityPassword.rejected.match(result)) {
      Alert.alert('Error', (result.payload as string) || 'Failed to save password. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 80,
        }}
      >
        <Text className="text-3xl font-bold text-black mb-4">
          Secure your wallet
        </Text>
        <Text className="text-base text-gray-600 mb-8">
          Set a password to protect access to your wallet on this device. You&apos;ll be asked for it whenever the app locks.
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Password
          </Text>
          <View className="relative">
            <TextInput
              className="bg-white border border-gray-300 rounded-2xl py-4 px-4 pr-12 text-base text-gray-900"
              secureTextEntry={!showPassword}
              value={password}
              editable={!submitting && !initializing}
              onChangeText={setPassword}
              placeholder="Enter a strong password"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex-row items-center"
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-gray-500">
            Password strength
          </Text>
          <Text className={`text-xs font-semibold ${strengthColor}`}>
            {strengthLabel}
          </Text>
        </View>
        {passwordStrength !== 'high' && (
          <Text className="text-[11px] text-gray-500 mt-1">
            Use a mix of upper/lowercase, numbers, symbols, and 12+ characters for a perfect password.
          </Text>
        )}

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Confirm Password
          </Text>
          <View className="relative">
            <TextInput
              className="bg-white border border-gray-300 rounded-2xl py-4 px-4 pr-12 text-base text-gray-900"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              editable={!submitting && !initializing}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex-row items-center"
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <Text className="text-sm text-red-600 mb-4">
            {error}
          </Text>
        )}

        <TouchableOpacity
          className="bg-blue-500 py-4 px-8 rounded-2xl w-full items-center shadow-lg"
          onPress={handleSavePassword}
          disabled={submitting || initializing}
          style={{ opacity: submitting || initializing ? 0.6 : 1 }}
        >
          <Text className="text-white text-base font-semibold">
            {submitting ? 'Saving...' : 'Save Password'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

