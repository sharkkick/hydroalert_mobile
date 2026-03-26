// app/_layout.tsx  (ROOT layout)

import { useEffect, useState }    from 'react';
import { Stack }                   from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged }      from 'firebase/auth';
import { auth }                    from './firebase';
import { AppProvider }             from './AppContext';

export default function RootLayout() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setIsLoggedIn(!!user);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#dbeafe' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="login"         options={{ headerShown: false }} />
        <Stack.Screen name="register"      options={{ headerShown: false }} />
        <Stack.Screen name="my-alerts"     options={{ headerShown: false }} />
        <Stack.Screen name="activity-log"  options={{ headerShown: false }} />
        <Stack.Screen name="profile"       options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}