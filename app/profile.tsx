import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform, Dimensions, Modal, FlatList, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './AppContext';

const { width } = Dimensions.get('window');

const CAVITE_DATA: Record<string, string[]> = {
  'Bacoor': ['Alima', 'Aniban I', 'Aniban II', 'Bayanan', 'Habay I', 'Habay II', 'Molino I', 'Molino II', 'Molino III', 'Talaba I', 'Talaba II', 'Zapote I'],
  'Carmona': ['Bancal', 'Cabilang Baybay', 'Lantic', 'Mabuhay', 'Maduya', 'Poblacion I', 'San Jose'],
  'Cavite City': ['Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V'],
  'Dasmariñas': ['Burol I', 'Burol II', 'Fatima I', 'Fatima II', 'Langkaan I', 'Paliparan I', 'Salawag', 'Salitran I', 'Zone I', 'Zone II'],
  'General Trias': ['Alingaro', 'Arnaldo', 'Bacao I', 'Bacao II', 'Biclatan', 'Gov. Ferrer', 'Javalera', 'Navarro', 'Tejero'],
  'Imus': ['Alapan I-A', 'Anabu I-A', 'Buhay na Tubig', 'Magdalo', 'Malagasang I-A', 'Medicion I-A', 'Palico I', 'Tanzang Luma I'],
  'Silang': ['Adlas', 'Balite I', 'Bulihan', 'Inchican', 'Lalaan I', 'Lumil', 'Maguyam', 'Malabag', 'Tartaria'],
  'Tagaytay': ['Asisan', 'Guinhawa North', 'Iruhin Central', 'Kaybagal Central', 'Neogan', 'Sungay East'],
  'Trece Martires': ['Aguado', 'Cabezas', 'Cabuco', 'De Ocampo', 'Osorio', 'Perez'],
};
const CITIES = Object.keys(CAVITE_DATA).sort();

function DropdownModal({ visible, onClose, options, onSelect, title }: {
  visible: boolean; onClose: () => void; options: string[]; onSelect: (v: string) => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={d.overlay} onPress={onClose} activeOpacity={1}>
        <View style={d.sheet}>
          <View style={d.sheetHeader}>
            <Text style={d.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={d.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <FlatList data={options} keyExtractor={i => i} renderItem={({ item }) => (
            <TouchableOpacity style={d.option} onPress={() => { onSelect(item); onClose(); }}>
              <Text style={d.optionText}>{item}</Text>
            </TouchableOpacity>
          )} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#6b7280' },
  option: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  optionText: { fontSize: 15, color: '#374151' },
});

export default function ProfileScreen() {
  const { user, setUser, logActivity } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });
  const [cityModal, setCityModal] = useState(false);
  const [barangayModal, setBarangayModal] = useState(false);

  const barangays = form.city ? CAVITE_DATA[form.city] || [] : [];

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'User';

  const handleSave = () => {
    setUser(form);
    setEditing(false);
    logActivity({ type: 'profile_updated', title: 'Profile Updated', description: 'Personal information was updated' });
    if (Platform.OS === 'web') {
      window.alert('Profile updated successfully!');
    } else {
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  const handleCancel = () => {
    setForm({ ...user });
    setEditing(false);
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        logActivity({ type: 'logout', title: 'Logged Out', description: 'User signed out' });
        router.replace('/login');
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => {
          logActivity({ type: 'logout', title: 'Logged Out', description: 'User signed out' });
          router.replace('/login');
        }},
      ]);
    }
  };

  const Field = ({ label, value, field, keyboardType = 'default', editable = true }: any) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, !editing && s.fieldInputDisabled]}
        value={form[field as keyof typeof form]}
        onChangeText={v => setForm(prev => ({ ...prev, [field]: v }))}
        editable={editing && editable}
        keyboardType={keyboardType}
        autoCapitalize="none"
        placeholderTextColor="#9ca3af"
      />
    </View>
  );

  const SelectField = ({ label, value, placeholder, onPress, enabled }: any) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.fieldInput, s.selectField, (!editing || !enabled) && s.fieldInputDisabled]}
        onPress={() => editing && enabled && onPress()}
        activeOpacity={0.7}
      >
        <Text style={value ? s.selectValue : s.selectPlaceholder}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Avatar Card */}
        <View style={s.avatarCard}>
          <View style={s.avatarCircle}>
            <Ionicons name="person" size={48} color="#ffffff" />
          </View>
          <Text style={s.fullName}>{fullName}</Text>
          <Text style={s.emailText}>{user.email || 'No email set'}</Text>
        </View>

        {/* Personal Info Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Personal Information</Text>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={s.editBtn}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.editActions}>
                <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={s.saveBtn}>
                  <Text style={s.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Field label="First Name"   field="firstName"  />
          <Field label="Middle Name"  field="middleName" />
          <Field label="Last Name"    field="lastName"   />
          <Field label="Phone"        field="phone"      keyboardType="phone-pad" />

          {/* Province - locked */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Province</Text>
            <View style={[s.fieldInput, s.selectField, s.fieldInputDisabled]}>
              <Text style={s.selectValue}>Cavite</Text>
              <Ionicons name="chevron-down" size={16} color="#9ca3af" />
            </View>
          </View>

          <SelectField
            label="City/Municipality"
            value={form.city}
            placeholder="Select City/Municipality"
            onPress={() => setCityModal(true)}
            enabled={true}
          />
          <SelectField
            label="Barangay"
            value={form.barangay}
            placeholder={form.city ? 'Select Barangay' : 'Select a city first'}
            onPress={() => setBarangayModal(true)}
            enabled={!!form.city}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <DropdownModal
        visible={cityModal}
        onClose={() => setCityModal(false)}
        options={CITIES}
        onSelect={v => { setForm(p => ({ ...p, city: v, barangay: '' })); }}
        title="Select City / Municipality"
      />
      <DropdownModal
        visible={barangayModal}
        onClose={() => setBarangayModal(false)}
        options={barangays}
        onSelect={v => setForm(p => ({ ...p, barangay: v }))}
        title="Select Barangay"
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#dbeafe' },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 14 : 4, paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  avatarCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  fullName: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emailText: { fontSize: 14, color: '#6b7280' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  editBtn: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, backgroundColor: '#2563eb' },
  saveBtnText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15, color: '#111827',
  },
  fieldInputDisabled: { backgroundColor: '#f3f4f6', borderColor: '#f3f4f6', color: '#6b7280' },
  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { fontSize: 15, color: '#111827' },
  selectPlaceholder: { fontSize: 15, color: '#9ca3af' },

  signOutBtn: {
    backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  signOutText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});