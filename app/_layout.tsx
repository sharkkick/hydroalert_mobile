// app/_layout.tsx  (ROOT layout)

import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { AppProvider } from './app-context';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="login"         options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="register"      options={{ headerShown: false }} />
        <Stack.Screen name="my-alerts"     options={{ headerShown: false }} />
        <Stack.Screen name="activity-log"  options={{ headerShown: false }} />
        <Stack.Screen name="profile"       options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}