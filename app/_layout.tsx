import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="wallet" options={{ headerShown: false }} />
        <Stack.Screen name="backup-wallet" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="create-wallet" options={{ presentation: 'modal', title: 'Create Wallet' }} />
        <Stack.Screen name="import-wallet" options={{ presentation: 'modal', title: 'Import Wallet' }} />
        <Stack.Screen name="set-password" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="create-token" options={{ presentation: 'modal', title: 'Create Token' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </Provider>
  );
}
