import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { router }                          from 'expo-router';
import { Ionicons }                        from '@expo/vector-icons';
import { signInWithEmailAndPassword,
         sendPasswordResetEmail }          from 'firebase/auth';
import { auth }                            from './firebase';

const { width } = Dimensions.get('window');

// ── Map Firebase error codes to friendly messages ────────────────────────────
function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account found with this email. Please check and try again.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function LoginScreen() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [loading,      setLoading]      = useState(false);

  // ── Sign In ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged in _layout.tsx handles the redirect automatically
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(firebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first, then tap Forgot Password.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(`Password reset link sent to ${email.trim()}. Check your inbox and spam folder.`);
    } catch (err: any) {
      setError(firebaseErrorMessage(err.code));
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