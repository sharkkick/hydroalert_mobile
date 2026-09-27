import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useApp } from './app-context';

const { width } = Dimensions.get('window');

function supabaseErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'No account found, incorrect password, or the account email is not confirmed yet.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (message.includes('Too many requests')) {
    return 'Too many failed attempts. Please wait a moment and try again.';
  }
  if (message.includes('Network')) {
    return 'Network error. Please check your internet connection.';
  }
  return 'Something went wrong. Please try again.';
}

async function lookupNamedId(
  tableNames: string[],
  idColumn: string,
  nameColumn: string,
  nameValue: string,
) {
  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select(idColumn)
      .eq(nameColumn, nameValue)
      .maybeSingle();

    if (!error && data && typeof data === 'object' && idColumn in data) {
      return (data as Record<string, any>)[idColumn] ?? null;
    }
  }

  return null;
}

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const handledRecoveryRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, logActivity } = useApp();

  const resolveResetRedirect = () => {
    const configured = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT?.trim();
    const isHttp = !!configured && /^https?:\/\//i.test(configured);
    const isLocalhost = !!configured && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured);
    const isExp = !!configured && /^exp:\/\//i.test(configured);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (configured && isHttp && !isLocalhost) {
        return configured;
      }
      return `${window.location.origin}/reset-password`;
    }

    if (configured && (isExp || !isHttp || (isHttp && !isLocalhost))) {
      return configured;
    }

    // In Expo Go/dev, createURL produces an exp:// link that the app can handle.
    return Linking.createURL('/reset-password');
  };

  useEffect(() => {
    if (handledRecoveryRef.current) return;

    let type = typeof params.type === 'string' ? params.type : undefined;
    let accessToken = typeof params.access_token === 'string' ? params.access_token : undefined;
    let refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const searchParams = new URLSearchParams(window.location.search);

      type = type || hashParams.get('type') || searchParams.get('type') || undefined;
      accessToken = accessToken || hashParams.get('access_token') || searchParams.get('access_token') || undefined;
      refreshToken = refreshToken || hashParams.get('refresh_token') || searchParams.get('refresh_token') || undefined;
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      handledRecoveryRef.current = true;
      router.replace({
        pathname: '/reset-password',
        params: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const searchParams = new URLSearchParams(window.location.search);
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

      if (errorCode === 'otp_expired') {
        handledRecoveryRef.current = true;
        setError('Reset link expired or already used. Request a new password reset email and open it immediately.');
        return;
      }

      if (errorDescription) {
        handledRecoveryRef.current = true;
        setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      }
    }
  }, [params.access_token, params.refresh_token, params.type]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(supabaseErrorMessage(authError.message));
        return;
      }

      const userId = authData.user?.id;
      const meta = authData.user?.user_metadata || {};

      if (!userId) {
        setError('Sign in succeeded, but no user profile was returned.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, middle_name, last_name, phone_number, city, barangay, role_id, barangay_id, fcm_token')
        .eq('user_id', userId)
        .maybeSingle();

      const profileBarangay = profile?.barangay || meta.barangay || '';
      const profileCity = profile?.city || meta.city || '';
      const resolvedBarangayId = profile?.barangay_id
        ?? (profileBarangay ? await lookupNamedId(['v_barangays', 'barangays'], 'barangay_id', 'barangay_name', profileBarangay) : null);
      const resolvedRoleId = profile?.role_id
        ?? (meta.role || meta.role_name ? await lookupNamedId(['v_roles', 'roles'], 'role_id', 'role_name', String(meta.role || meta.role_name)) : null);

      if (!profileError && profile) {
        setUser({
          firstName: profile.first_name || '',
          middleName: profile.middle_name || '',
          lastName: profile.last_name || '',
          email: authData.user?.email || email.trim(),
          phone: profile.phone_number || '',
          city: profileCity,
          barangay: profileBarangay,
          roleId: resolvedRoleId,
          barangayId: resolvedBarangayId,
          fcmToken: profile.fcm_token || meta.fcm_token || '',
        });
      } else {
        setUser({
          firstName: meta.first_name || '',
          middleName: meta.middle_name || '',
          lastName: meta.last_name || '',
          email: authData.user?.email || email.trim(),
          phone: meta.phone_number || '',
          city: meta.city || '',
          barangay: meta.barangay || '',
          roleId: meta.role_id ? Number(meta.role_id) : null,
          barangayId: meta.barangay_id ? Number(meta.barangay_id) : null,
          fcmToken: meta.fcm_token || '',
        });
      }

      // Log login activity
      logActivity({
        type: 'login',
        title: 'Logged In',
        description: 'Successfully signed in to HydroAlert',
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    const emailNormalized = email.trim().toLowerCase();
    if (!emailNormalized) {
      setError('Enter your email first, then tap Forgot Password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = resolveResetRedirect();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
        redirectTo,
      });

      if (resetError) {
        setError(supabaseErrorMessage(resetError.message));
        return;
      }

      setSuccess('Password reset email sent. Please check your inbox and spam folder.');
    } catch {
      setError('Could not send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#dbeafe" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>💧</Text>
              </View>
              <View>
                <Text style={styles.appName}>HydroAlert</Text>
                <Text style={styles.appSub}>Sign in to your Account</Text>
              </View>
            </View>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Success banner */}
            {success ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); setSuccess(''); }}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotRow}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.line} />
            </View>

            {/* Create Account */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/register')}
              activeOpacity={0.85}
            >
              <Text style={styles.createText}>Create Account</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#dbeafe' },
  flex:      { flex: 1 },
  container: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 40,
  },
  card: {
    backgroundColor: '#f9fafb', borderRadius: 20,
    padding: width < 380 ? 20 : 28, width: '100%', maxWidth: 480,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  logoEmoji:  { fontSize: 26 },
  appName:    { fontSize: width < 380 ? 20 : 24, fontWeight: '700', color: '#111827' },
  appSub:     { fontSize: 13, color: '#6b7280', marginTop: 2 },

  errorBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 14 },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13, lineHeight: 18 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 15, color: '#111827',
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 15, color: '#111827' },
  eyeBtn: { padding: 4 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 4 },
  forgotText:{ fontSize: 13, color: '#2563eb', fontWeight: '600' },

  signInBtn:         { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  signInBtnDisabled: { backgroundColor: '#93c5fd' },
  signInText:        { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  line:       { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText:     { fontSize: 13, color: '#9ca3af' },

  createBtn:  { borderWidth: 1.5, borderColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  createText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },

  successBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dcfce7', borderRadius: 8, padding: 10, marginBottom: 14 },
  successText: { flex: 1, color: '#16a34a', fontSize: 13, lineHeight: 18 },
});