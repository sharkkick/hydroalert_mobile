import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type TokenParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  tokenHash?: string;
  type?: string;
};

function readParamsFromFragment(hash: string): TokenParams {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const search = new URLSearchParams(fragment);
  return {
    accessToken: search.get('access_token') ?? undefined,
    refreshToken: search.get('refresh_token') ?? undefined,
    code: search.get('code') ?? undefined,
    tokenHash: search.get('token_hash') ?? undefined,
    type: search.get('type') ?? undefined,
  };
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tokenParams = useMemo<TokenParams>(() => {
    const accessToken = typeof params.access_token === 'string' ? params.access_token : undefined;
    const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;
    const code = typeof params.code === 'string' ? params.code : undefined;
    const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : undefined;
    const type = typeof params.type === 'string' ? params.type : undefined;
    return { accessToken, refreshToken, code, tokenHash, type };
  }, [params.access_token, params.refresh_token, params.code, params.token_hash, params.type]);

  useEffect(() => {
    let mounted = true;

    const prepareSession = async () => {
      setLoading(true);
      setError('');

      try {
        let accessToken = tokenParams.accessToken;
        let refreshToken = tokenParams.refreshToken;
        let code = tokenParams.code;
        let tokenHash = tokenParams.tokenHash;
        let flowType = tokenParams.type;

        if (Platform.OS === 'web' && typeof window !== 'undefined' && (!accessToken || !refreshToken)) {
          const fromHash = readParamsFromFragment(window.location.hash);
          accessToken = fromHash.accessToken;
          refreshToken = fromHash.refreshToken;
          code = code || fromHash.code;
          tokenHash = tokenHash || fromHash.tokenHash;
          flowType = flowType || fromHash.type;

          const search = new URLSearchParams(window.location.search);
          code = code || search.get('code') || undefined;
          tokenHash = tokenHash || search.get('token_hash') || undefined;
          flowType = flowType || search.get('type') || undefined;
        }

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            throw setSessionError;
          }
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash && flowType === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) {
            throw verifyError;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error('Reset link is invalid or has expired. Request a new password reset email.');
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(String(e?.message || 'Could not validate reset link.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void prepareSession();

    return () => {
      mounted = false;
    };
  }, [tokenParams.accessToken, tokenParams.refreshToken]);

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Unable to update password.');
        return;
      }

      setSuccess('Password updated successfully. You can now sign in.');
    } catch (e: any) {
      setError(String(e?.message || 'Unable to update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#dbeafe" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons name="key-outline" size={24} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>Set a new password for your account</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Validating reset link...</Text>
              </View>
            ) : (
              <>
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {!success ? (
                  <>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                    />

                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                    />

                    <TouchableOpacity
                      style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                      onPress={handleUpdatePassword}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
                    </TouchableOpacity>
                  </>
                ) : null}

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
                  <Text style={styles.secondaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#dbeafe' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: '#6b7280' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13, lineHeight: 18 },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dcfce7', borderRadius: 8, padding: 10, marginBottom: 12 },
  successText: { flex: 1, color: '#166534', fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15,
    color: '#111827',
  },
  primaryBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  primaryBtnDisabled: { backgroundColor: '#93c5fd' },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1.5, borderColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});
