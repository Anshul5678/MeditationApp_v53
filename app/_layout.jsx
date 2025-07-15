import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

function RootLayout() {
  return (
    <AuthProvider>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
    </AuthProvider>
  );
}

export default RootLayout; 