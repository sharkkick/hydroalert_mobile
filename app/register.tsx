import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { router }                         from 'expo-router';
import { Ionicons }                       from '@expo/vector-icons';
import { createUserWithEmailAndPassword,
         updateProfile }                  from 'firebase/auth';
import { doc, setDoc, serverTimestamp }   from 'firebase/firestore';
import { auth, db }                       from './firebase';

const { width } = Dimensions.get('window');

// ── Cavite data ───────────────────────────────────────────────────────────────
const CAVITE_DATA: Record<string, string[]> = {
  'Bacoor': ['Alima', 'Aniban I', 'Aniban II', 'Aniban III', 'Aniban IV', 'Aniban V', 'Bayanan', 'Habay I', 'Habay II', 'Ligas I', 'Ligas II', 'Ligas III', 'Mabolo I', 'Mabolo II', 'Mabolo III', 'Maliksi I', 'Maliksi II', 'Maliksi III', 'Mambog I', 'Mambog II', 'Mambog III', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII', 'Niog I', 'Niog II', 'Niog III', 'Real I', 'Real II', 'Salinas I', 'Salinas II', 'Salinas III', 'Salinas IV', 'San Nicolas I', 'San Nicolas II', 'San Nicolas III', 'Talaba I', 'Talaba II', 'Talaba III', 'Talaba IV', 'Talaba V', 'Talaba VI', 'Talaba VII', 'Zapote I', 'Zapote II', 'Zapote III', 'Zapote IV', 'Zapote V'],
  'Carmona': ['Bancal', 'Cabilang Baybay', 'Lantic', 'Mabuhay', 'Maduya', 'Milagrosa', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V', 'Poblacion VI', 'Pueblos', 'Recodo', 'San Jose'],
  'Cavite City': ['Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII', 'Barangay VIII', 'Barangay IX', 'Barangay X', 'Barangay XI', 'Barangay XII', 'Barangay XIII', 'Barangay XIV', 'Barangay XV', 'Barangay XVI', 'Barangay XVII', 'Barangay XVIII', 'Barangay XIX', 'Barangay XX'],
  'Dasmariñas': ['Burol I', 'Burol II', 'Burol III', 'Fatima I', 'Fatima II', 'Fatima III', 'Fatima IV', 'Fatima V', 'Langkaan I', 'Langkaan II', 'Luzviminda I', 'Luzviminda II', 'Paliparan I', 'Paliparan II', 'Paliparan III', 'Sabang', 'Salawag', 'Salitran I', 'Salitran II', 'Salitran III', 'Salitran IV', 'San Agustin I', 'San Agustin II', 'San Agustin III', 'San Jose', 'Zone I', 'Zone II', 'Zone III', 'Zone IV'],
  'General Trias': ['Alingaro', 'Arnaldo', 'Bacao I', 'Bacao II', 'Bagumbayan', 'Biclatan', 'Buenavista I', 'Buenavista II', 'Buenavista III', 'Gov. Ferrer', 'Javalera', 'Manggahan', 'Navarro', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'San Francisco', 'San Gabriel', 'San Juan I', 'San Juan II', 'Santa Clara', 'Santiago', 'Tejero'],
  'Imus': ['Alapan I-A', 'Alapan I-B', 'Alapan I-C', 'Alapan II-A', 'Alapan II-B', 'Anabu I-A', 'Anabu I-B', 'Anabu I-C', 'Anabu II-A', 'Anabu II-B', 'Buhay na Tubig', 'Bucandala I', 'Bucandala II', 'Bucandala III', 'Magdalo', 'Maharlika', 'Malagasang I-A', 'Malagasang I-B', 'Malagasang II-A', 'Malagasang II-B', 'Medicion I-A', 'Medicion I-B', 'Medicion II-A', 'Medicion II-B', 'Pag-Asa I', 'Pag-Asa II', 'Pag-Asa III', 'Palico I', 'Palico II', 'Palico III', 'Palico IV', 'Pasong Buaya I', 'Pasong Buaya II', 'Poblacion I-A', 'Poblacion I-B', 'Poblacion II-A', 'Poblacion II-B', 'Tanzang Luma I', 'Tanzang Luma II', 'Tanzang Luma III', 'Toclong I-A', 'Toclong I-B', 'Toclong II-A'],
  'Silang': ['Adlas', 'Anahawan', 'Balite I', 'Balite II', 'Banaba', 'Buho', 'Bulihan', 'Inchican', 'Lalaan I', 'Lalaan II', 'Ligtong I', 'Ligtong II', 'Ligtong III', 'Ligtong IV', 'Lumil', 'Maguyam', 'Malabag', 'Mapagong', 'Marahan I', 'Marahan II', 'Munting Ilog', 'Narra I', 'Narra II', 'Narra III', 'Pasong Langka I', 'Pasong Langka II', 'Pooc I', 'Pooc II', 'San Miguel I', 'San Miguel II', 'San Vicente I', 'San Vicente II', 'Santa Rosa I', 'Santa Rosa II', 'Tartaria', 'Tibig', 'Tubuan I', 'Tubuan II', 'Tubuan III', 'Ulat', 'Yakal'],
  'Tagaytay': ['Asisan', 'Bagong Tubig', 'Calabuso', 'Guinhawa North', 'Guinhawa South', 'Iruhin Central', 'Iruhin East', 'Iruhin West', 'Kaybagal Central', 'Kaybagal East', 'Kaybagal North', 'Kaybagal South', 'Mag-asawang Ilat', 'Maharlika East', 'Maharlika West', 'Maitim 2nd Central', 'Maitim 2nd East', 'Maitim 2nd West', 'Neogan', 'Sambong', 'San Jose', 'Silang Junction North', 'Silang Junction South', 'Sungay East', 'Sungay West', 'Tolentino East', 'Tolentino West', 'Zambal'],
  'Trece Martires': ['Aguado', 'Cabezas', 'Cabuco', 'De Ocampo', 'Gregorio', 'Hugo Perez', 'Imelda', 'Isidro Poblacion', 'Osorio', 'Perez', 'San Agustin', 'Timothy'],
};

const CITIES = Object.keys(CAVITE_DATA).sort();

// ── Map Firebase error codes to friendly messages ─────────────────────────────
function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with uppercase, number, and special character.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return 'Registration failed. Please try again.';
  }
}

// ── Dropdown modal ─────────────────────────────────────────────────────────────
function DropdownModal({ visible, onClose, options, onSelect, title }: {
  visible: boolean; onClose: () => void; options: string[];
  onSelect: (val: string) => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dd.overlay} onPress={onClose} activeOpacity={1}>
        <View style={dd.sheet}>
          <View style={dd.sheetHeader}>
            <Text style={dd.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={dd.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={dd.option} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={dd.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const dd = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn:    { fontSize: 18, color: '#6b7280', paddingHorizontal: 4 },
  option:      { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  optionText:  { fontSize: 15, color: '#374151' },
});

// ── Birthday Picker Modal ─────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function BirthdayPickerModal({ visible, onClose, onConfirm, year, month, day, setYear, setMonth, setDay }: {
  visible: boolean; onClose: () => void; onConfirm: () => void;
  year: number; month: number; day: number;
  setYear: (v: number) => void; setMonth: (v: number) => void; setDay: (v: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days  = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={bp.overlay} onPress={onClose} activeOpacity={1}>
        <View style={bp.sheet}>
          <View style={bp.header}>
            <Text style={bp.title}>Select Birthday</Text>
            <TouchableOpacity onPress={onClose}><Text style={bp.close}>✕</Text></TouchableOpacity>
          </View>

          {/* Month */}
          <Text style={bp.sectionLabel}>Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity key={m} style={[bp.chip, month === i && bp.chipActive]} onPress={() => setMonth(i)}>
                <Text style={[bp.chipText, month === i && bp.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Day */}
          <Text style={bp.sectionLabel}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
            {days.map(d => (
              <TouchableOpacity key={d} style={[bp.chip, bp.chipSm, day === d && bp.chipActive]} onPress={() => setDay(d)}>
                <Text style={[bp.chipText, day === d && bp.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Year */}
          <Text style={bp.sectionLabel}>Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
            {years.map(y => (
              <TouchableOpacity key={y} style={[bp.chip, bp.chipSm, year === y && bp.chipActive]} onPress={() => setYear(y)}>
                <Text style={[bp.chipText, year === y && bp.chipTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={bp.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={bp.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const bp = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:         { fontSize: 16, fontWeight: '700', color: '#111827' },
  close:         { fontSize: 18, color: '#6b7280', paddingHorizontal: 4 },
  sectionLabel:  { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  scroll:        { marginBottom: 4 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  chipSm:        { paddingHorizontal: 10 },
  chipActive:    { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipText:      { fontSize: 13, color: '#374151' },
  chipTextActive:{ color: '#2563eb', fontWeight: '700' },
  confirmBtn:    { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  confirmText:   { color: '#fff', fontSize: 15, fontWeight: '600' },
});

// ── Register Screen ───────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const [firstName,       setFirstName]       = useState('');
  const [middleName,      setMiddleName]       = useState('');
  const [lastName,        setLastName]         = useState('');
  const [birthday,        setBirthday]         = useState('');
  const [city,            setCity]             = useState('');
  const [barangay,        setBarangay]         = useState('');
  const [street,          setStreet]           = useState('');
  const [email,           setEmail]            = useState('');
  const [phone,           setPhone]            = useState('');
  const [password,        setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword]  = useState('');
  const [showPass,        setShowPass]         = useState(false);
  const [showConfirmPass, setShowConfirmPass]  = useState(false);
  const [agreed,          setAgreed]           = useState(false);
  const [cityModal,       setCityModal]        = useState(false);
  const [barangayModal,   setBarangayModal]    = useState(false);
  const [birthdayModal,   setBirthdayModal]    = useState(false);
  const [bdayYear,        setBdayYear]         = useState(2000);
  const [bdayMonth,       setBdayMonth]        = useState(0);
  const [bdayDay,         setBdayDay]          = useState(1);
  const [error,           setError]            = useState('');
  const [loading,         setLoading]          = useState(false);

  const barangays = city ? CAVITE_DATA[city] || [] : [];

  const handleCitySelect = (val: string) => { setCity(val); setBarangay(''); };

  // ── Validate password strength ──────────────────────────────────────────────
  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8)              return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pass))          return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/.test(pass))          return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(pass))  return 'Password must include at least one special character.';
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    // Client-side validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !city || !barangay) {
      setError('Please fill in all required fields.');
      return;
    }
    const passError = validatePassword(password);
    if (passError) { setError(passError); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms and Conditions.'); return; }

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid        = credential.user.uid;
      const fullName   = `${firstName.trim()} ${middleName.trim() ? middleName.trim() + ' ' : ''}${lastName.trim()}`;

      // 2. Set display name on the Auth profile
      await updateProfile(credential.user, { displayName: fullName });

      // 3. Save full profile to Firestore under users/{uid}
      await setDoc(doc(db, 'users', uid), {
        uid,
        firstName:   firstName.trim(),
        middleName:  middleName.trim(),
        lastName:    lastName.trim(),
        fullName,
        birthday:    birthday.trim(),
        email:       email.trim(),
        phone:       phone.trim(),
        province:    'Cavite',
        city,
        barangay,
        street:      street.trim(),
        role:        'resident',          // default role
        createdAt:   serverTimestamp(),
      });

      // 4. Navigate to login (user must sign in after registering)
      router.replace('/login');

    } catch (err: any) {
      setError(firebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={s.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#dbeafe" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>

            {/* Header */}
            <View style={s.header}>
              <View style={s.logoCircle}>
                <Text style={s.logoEmoji}>💧</Text>
              </View>
              <View>
                <Text style={s.appName}>HydroAlert</Text>
                <Text style={s.appSub}>Create your Account</Text>
              </View>
            </View>

            {/* Error banner */}
            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── PERSONAL INFORMATION ── */}
            <SectionHeader title="PERSONAL INFORMATION" />

            <Text style={s.label}>First Name <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="e.g. Juan" placeholderTextColor="#9ca3af" value={firstName} onChangeText={setFirstName} />

            <Text style={s.label}>Middle Name</Text>
            <TextInput style={s.input} placeholder="e.g. Santos (optional)" placeholderTextColor="#9ca3af" value={middleName} onChangeText={setMiddleName} />

            <Text style={s.label}>Last Name <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="e.g. Dela Cruz" placeholderTextColor="#9ca3af" value={lastName} onChangeText={setLastName} />

            <Text style={s.label}>Birthday</Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setBirthdayModal(true)} activeOpacity={0.7}>
              <Text style={birthday ? s.selectValue : s.selectPlaceholder}>
                {birthday || 'Select your birthday'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            </TouchableOpacity>

            {/* ── ADDRESS ── */}
            <SectionHeader title="ADDRESS" />

            <Text style={s.label}>Province</Text>
            <View style={[s.selectBox, s.disabledBox]}>
              <Text style={s.selectValue}>Cavite</Text>
              <Text style={s.chevron}>▾</Text>
            </View>

            <Text style={s.label}>City / Municipality <Text style={s.req}>*</Text></Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setCityModal(true)} activeOpacity={0.7}>
              <Text style={city ? s.selectValue : s.selectPlaceholder}>{city || 'Select City/Municipality'}</Text>
              <Text style={s.chevron}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Barangay <Text style={s.req}>*</Text></Text>
            <TouchableOpacity style={[s.selectBox, !city && s.disabledBox]} onPress={() => city && setBarangayModal(true)} activeOpacity={0.7}>
              <Text style={barangay ? s.selectValue : s.selectPlaceholder}>{barangay || (city ? 'Select Barangay' : 'Select a city first')}</Text>
              <Text style={s.chevron}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Block and Lot / Street</Text>
            <TextInput style={s.input} placeholder="e.g. Blk 5 Lot 12, Sampaguita St." placeholderTextColor="#9ca3af" value={street} onChangeText={setStreet} />

            {/* ── CONTACT INFORMATION ── */}
            <SectionHeader title="CONTACT INFORMATION" />

            <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="user@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

            <Text style={s.label}>Phone Number</Text>
            <TextInput style={s.input} placeholder="09XXXXXXXXX" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={11} />

            {/* ── SECURITY ── */}
            <SectionHeader title="SECURITY" />

            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <View style={s.passwordWrapper}>
              <TextInput style={s.passwordInput} placeholder="Min. 8 chars, 1 uppercase, 1 number, 1 special" placeholderTextColor="#9ca3af" secureTextEntry={!showPass} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
            <View style={s.passwordWrapper}>
              <TextInput style={s.passwordInput} placeholder="Re-enter password" placeholderTextColor="#9ca3af" secureTextEntry={!showConfirmPass} value={confirmPassword} onChangeText={setConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPass(v => !v)} style={s.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showConfirmPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.7}>
              <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                {agreed && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.termsText}>
                I agree to the <Text style={s.termsLink}>Terms and Conditions</Text> of HydroAlert. This field is required.
              </Text>
            </TouchableOpacity>

            {/* Create Account button */}
            <TouchableOpacity
              style={[s.createBtn, loading && s.createBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={s.createText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={s.backRow}>
              <Text style={s.backText}>Already have an account? <Text style={s.backLink}>Sign In</Text></Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DropdownModal visible={cityModal}     onClose={() => setCityModal(false)}     options={CITIES}    onSelect={handleCitySelect} title="Select City / Municipality" />
      <DropdownModal visible={barangayModal} onClose={() => setBarangayModal(false)} options={barangays} onSelect={setBarangay}      title="Select Barangay" />
      <BirthdayPickerModal
        visible={birthdayModal}
        onClose={() => setBirthdayModal(false)}
        year={bdayYear} month={bdayMonth} day={bdayDay}
        setYear={setBdayYear} setMonth={setBdayMonth} setDay={setBdayDay}
        onConfirm={() => {
          setBirthday(`${MONTHS[bdayMonth]} ${bdayDay}, ${bdayYear}`);
          setBirthdayModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#dbeafe' },
  flex:      { flex: 1 },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  card: {
    backgroundColor: '#f9fafb', borderRadius: 20,
    padding: width < 380 ? 18 : 24, width: '100%', maxWidth: 480,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  logoCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  logoEmoji:  { fontSize: 24 },
  appName:    { fontSize: width < 380 ? 18 : 22, fontWeight: '700', color: '#111827' },
  appSub:     { fontSize: 13, color: '#6b7280', marginTop: 2 },

  errorBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 14 },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13, lineHeight: 18 },

  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#2563eb', letterSpacing: 0.8, marginTop: 20, marginBottom: 4 },
  label:         { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  req:           { color: '#dc2626' },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 15, color: '#111827',
  },
  selectBox: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  disabledBox:      { backgroundColor: '#f3f4f6' },
  selectValue:      { fontSize: 15, color: '#111827' },
  selectPlaceholder:{ fontSize: 15, color: '#9ca3af' },
  chevron:          { fontSize: 14, color: '#6b7280' },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 15, color: '#111827' },
  eyeBtn:        { padding: 4 },

  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, marginBottom: 4 },
  checkbox:        { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  termsText:       { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  termsLink:       { color: '#2563eb', fontWeight: '600' },

  createBtn:         { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  createBtnDisabled: { backgroundColor: '#93c5fd' },
  createText:        { color: '#fff', fontSize: 16, fontWeight: '600' },

  backRow:  { alignItems: 'center', marginTop: 16, marginBottom: 4 },
  backText: { fontSize: 14, color: '#6b7280' },
  backLink: { color: '#2563eb', fontWeight: '600' },
});