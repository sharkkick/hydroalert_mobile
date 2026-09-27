import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { router }                         from 'expo-router';
import { Ionicons }                       from '@expo/vector-icons';
import { supabase }                       from '../lib/supabase';

const { width } = Dimensions.get('window');

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
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function supabaseErrorMessage(message: string): string {
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Database error')) {
    return 'Profile could not be saved. Please check your Supabase table setup.';
  }
  if (message.includes('Password')) {
    return message;
  }
  if (message.includes('Network')) {
    return 'Network error. Please check your internet connection.';
  }
  return 'Registration failed. Please try again.';
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, '0');
  const dayPart = String(day).padStart(2, '0');
  return `${year}-${month}-${dayPart}`;
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

// ── Dropdown Modal ────────────────────────────────────────────────────────────
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

// ── Terms and Conditions Modal ────────────────────────────────────────────────
function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tm.overlay}>
        <View style={tm.sheet}>
          <View style={tm.header}>
            <Text style={tm.title}>Terms and Conditions</Text>
            <TouchableOpacity onPress={onClose} style={tm.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={tm.scroll} showsVerticalScrollIndicator={false}>
            <Text style={tm.updated}>Last updated: March 2026</Text>

            <Text style={tm.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={tm.body}>
              By creating an account and using the HydroAlert mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use the application.
            </Text>

            <Text style={tm.sectionTitle}>2. Description of Service</Text>
            <Text style={tm.body}>
              HydroAlert is a flood monitoring and emergency alert system designed to help residents of Cavite monitor water levels, rainfall data, and send emergency rescue requests during flood events. The application provides real-time data from sensor stations installed in various barangays.
            </Text>

            <Text style={tm.sectionTitle}>3. User Responsibilities</Text>
            <Text style={tm.body}>
              You agree to:{'\n'}
              • Provide accurate and complete registration information.{'\n'}
              • Keep your account credentials confidential.{'\n'}
              • Use the SOS Emergency Alert feature only in genuine emergencies.{'\n'}
              • Not misuse or abuse the emergency alert system.{'\n'}
              • Update your profile information when necessary.
            </Text>

            <Text style={tm.sectionTitle}>4. Emergency SOS Feature</Text>
            <Text style={tm.body}>
              The SOS Emergency Alert feature is intended for use only in real emergency situations requiring rescue assistance. Sending false or prank emergency alerts is strictly prohibited and may result in account suspension and legal consequences. Always supplement app alerts by calling official emergency hotlines (911, NDRRMC, Red Cross).
            </Text>

            <Text style={tm.sectionTitle}>5. Data Collection and Privacy</Text>
            <Text style={tm.body}>
              HydroAlert collects personal information including your name, birthday, address, email, and phone number for the purpose of providing emergency services. Your location data may be shared with rescue teams when you activate the SOS feature. We do not sell your personal data to third parties.
            </Text>

            <Text style={tm.sectionTitle}>6. Accuracy of Information</Text>
            <Text style={tm.body}>
              While HydroAlert strives to provide accurate and timely flood monitoring data, sensor readings are for informational purposes only. Always follow official government advisories and instructions from local authorities during flood events. HydroAlert shall not be held liable for any damages arising from reliance on app data.
            </Text>

            <Text style={tm.sectionTitle}>7. Account Termination</Text>
            <Text style={tm.body}>
              HydroAlert reserves the right to suspend or terminate accounts that violate these terms, misuse the emergency alert system, or engage in any activity that compromises the safety and integrity of the platform.
            </Text>

            <Text style={tm.sectionTitle}>8. Changes to Terms</Text>
            <Text style={tm.body}>
              HydroAlert may update these Terms and Conditions from time to time. Continued use of the application after changes are posted constitutes your acceptance of the updated terms.
            </Text>

            <Text style={tm.sectionTitle}>9. Contact Information</Text>
            <Text style={tm.body}>
              For questions or concerns about these Terms and Conditions, please contact the HydroAlert administration team through the app or your local DRRMO office.
            </Text>

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={tm.closeFooterBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={tm.closeFooterText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const tm = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 24 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:          { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  scroll:         { marginTop: 12 },
  updated:        { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#1e3a8a', marginTop: 16, marginBottom: 6 },
  body:           { fontSize: 13, color: '#374151', lineHeight: 20 },
  closeFooterBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  closeFooterText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
});

// ── Privacy Policy Modal ──────────────────────────────────────────────────────
function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pp.overlay}>
        <View style={pp.sheet}>
          <View style={pp.header}>
            <Text style={pp.title}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} style={pp.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={pp.scroll} showsVerticalScrollIndicator={false}>
            <Text style={pp.updated}>Last updated: March 2026</Text>

            <Text style={pp.sectionTitle}>1. Information We Collect</Text>
            <Text style={pp.body}>
              HydroAlert collects the following personal information when you register and use the application:{'\n'}
              • Full name (first, middle, and last name){'\n'}
              • Date of birth{'\n'}
              • Residential address (province, city/municipality, barangay, street){'\n'}
              • Email address{'\n'}
              • Phone number{'\n'}
              • Device information and push notification tokens{'\n'}
              • Location data (when using SOS or map features)
            </Text>

            <Text style={pp.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={pp.body}>
              Your personal information is used to:{'\n'}
              • Create and manage your HydroAlert account.{'\n'}
              • Send flood alerts and emergency notifications relevant to your location.{'\n'}
              • Facilitate emergency rescue requests through the SOS feature.{'\n'}
              • Provide localized water level and rainfall monitoring data.{'\n'}
              • Communicate important service updates and safety advisories.{'\n'}
              • Improve and maintain the quality of the application.
            </Text>

            <Text style={pp.sectionTitle}>3. Data Sharing and Disclosure</Text>
            <Text style={pp.body}>
              We may share your information with:{'\n'}
              • Local government units (LGUs) and Disaster Risk Reduction and Management Offices (DRRMO) during emergency situations.{'\n'}
              • Rescue teams when you activate the SOS Emergency Alert feature.{'\n'}
              • Service providers who assist in operating the application (e.g., cloud hosting, notification services).{'\n\n'}
              We do NOT sell, trade, or rent your personal information to third parties for marketing purposes.
            </Text>

            <Text style={pp.sectionTitle}>4. Data Storage and Security</Text>
            <Text style={pp.body}>
              Your data is stored securely using industry-standard encryption and security measures. We use Supabase as our backend service, which provides enterprise-grade security, including encrypted data at rest and in transit. Access to personal data is restricted to authorized personnel only.
            </Text>

            <Text style={pp.sectionTitle}>5. Your Rights</Text>
            <Text style={pp.body}>
              You have the right to:{'\n'}
              • Access and review your personal information.{'\n'}
              • Update or correct inaccurate data through your profile settings.{'\n'}
              • Request deletion of your account and associated data.{'\n'}
              • Opt out of non-essential notifications.{'\n'}
              • Withdraw consent for data processing (note: this may limit app functionality).
            </Text>

            <Text style={pp.sectionTitle}>6. Data Retention</Text>
            <Text style={pp.body}>
              We retain your personal data for as long as your account is active or as needed to provide services. If you request account deletion, we will remove your personal data within 30 days, except where retention is required by law or for legitimate safety purposes (e.g., emergency response records).
            </Text>

            <Text style={pp.sectionTitle}>7. Cookies and Tracking</Text>
            <Text style={pp.body}>
              HydroAlert does not use cookies. We may collect anonymous usage analytics to improve app performance and user experience. This data cannot be used to identify individual users.
            </Text>

            <Text style={pp.sectionTitle}>8. Children's Privacy</Text>
            <Text style={pp.body}>
              HydroAlert is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will delete it promptly.
            </Text>

            <Text style={pp.sectionTitle}>9. Changes to This Policy</Text>
            <Text style={pp.body}>
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of significant changes through the application. Your continued use of HydroAlert after changes are posted constitutes your acceptance of the updated policy.
            </Text>

            <Text style={pp.sectionTitle}>10. Contact Us</Text>
            <Text style={pp.body}>
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact the HydroAlert administration team through the app or your local DRRMO office.
            </Text>

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={pp.closeFooterBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={pp.closeFooterText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pp = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 24 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:          { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  scroll:         { marginTop: 12 },
  updated:        { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#1e3a8a', marginTop: 16, marginBottom: 6 },
  body:           { fontSize: 13, color: '#374151', lineHeight: 20 },
  closeFooterBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  closeFooterText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
});

// ── Birthday Picker Modal ─────────────────────────────────────────────────────
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

  const monthRef = useRef<ScrollView>(null);
  const dayRef   = useRef<ScrollView>(null);
  const yearRef  = useRef<ScrollView>(null);

  const CHIP_W = 90;
  const CHIP_SM = 52;
  const YEAR_W  = 72;

  // Auto-scroll to selected values when modal opens
  const handleLayout = () => {
    setTimeout(() => {
      monthRef.current?.scrollTo({ x: month * (CHIP_W + 8), animated: false });
      dayRef.current?.scrollTo({ x: (day - 1) * (CHIP_SM + 8), animated: false });
      const yearIdx = years.indexOf(year);
      if (yearIdx >= 0) yearRef.current?.scrollTo({ x: yearIdx * (YEAR_W + 8), animated: false });
    }, 100);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={bp.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={bp.sheet} onLayout={handleLayout}>
            <View style={bp.header}>
              <Text style={bp.title}>Select Birthday</Text>
              <TouchableOpacity onPress={onClose} style={bp.closeBtn}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Month */}
            <Text style={bp.sectionLabel}>Month</Text>
            <ScrollView ref={monthRef} horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[bp.chip, { width: CHIP_W }, month === i && bp.chipActive]}
                  onPress={() => {
                    setMonth(i);
                    // Clamp day if new month has fewer days
                    const maxDay = getDaysInMonth(i, year);
                    if (day > maxDay) setDay(maxDay);
                  }}
                >
                  <Text style={[bp.chipText, month === i && bp.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Day */}
            <Text style={bp.sectionLabel}>Day</Text>
            <ScrollView ref={dayRef} horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
              {days.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[bp.chip, { width: CHIP_SM }, day === d && bp.chipActive]}
                  onPress={() => setDay(d)}
                >
                  <Text style={[bp.chipText, day === d && bp.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Year */}
            <Text style={bp.sectionLabel}>Year</Text>
            <ScrollView ref={yearRef} horizontal showsHorizontalScrollIndicator={false} style={bp.scroll}>
              {years.map(y => (
                <TouchableOpacity
                  key={y}
                  style={[bp.chip, { width: YEAR_W }, year === y && bp.chipActive]}
                  onPress={() => {
                    setYear(y);
                    // Clamp day for leap year changes
                    const maxDay = getDaysInMonth(month, y);
                    if (day > maxDay) setDay(maxDay);
                  }}
                >
                  <Text style={[bp.chipText, year === y && bp.chipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Preview */}
            <View style={bp.preview}>
              <Ionicons name="calendar-outline" size={16} color="#2563eb" />
              <Text style={bp.previewText}>
                {MONTHS[month]} {day}, {year}
              </Text>
            </View>

            <TouchableOpacity style={bp.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={bp.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const bp = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:          { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  sectionLabel:   { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8, marginTop: 14, letterSpacing: 0.5 },
  scroll:         { marginBottom: 4 },
  chip:           { paddingVertical: 9, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  chipActive:     { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipText:       { fontSize: 13, color: '#374151', textAlign: 'center' },
  chipTextActive: { color: '#2563eb', fontWeight: '700' },
  preview:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0f7ff', borderRadius: 10, padding: 12, marginTop: 18 },
  previewText:    { fontSize: 15, fontWeight: '600', color: '#1e3a8a' },
  confirmBtn:     { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  confirmText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
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
  const [termsModal,      setTermsModal]       = useState(false);
  const [privacyModal,    setPrivacyModal]     = useState(false);
  const [bdayYear,        setBdayYear]         = useState(2000);
  const [bdayMonth,       setBdayMonth]        = useState(0);
  const [bdayDay,         setBdayDay]          = useState(1);
  const [error,           setError]            = useState('');
  const [success,         setSuccess]          = useState('');
  const [fieldErrors,     setFieldErrors]      = useState<Record<string, string>>({});
  const [loading,         setLoading]          = useState(false);

  const barangays = city ? CAVITE_DATA[city] || [] : [];
  const handleCitySelect = (val: string) => { setCity(val); setBarangay(''); };

  // ── Input handlers with validation ─────────────────────────────────────────

  // Names: only letters, spaces, hyphens, apostrophes
  const handleNameChange = (setter: (v: string) => void, field: string) => (text: string) => {
    const cleaned = text.replace(/[^a-zA-ZÀ-ÿ\s'\-]/g, '');
    setter(cleaned);
    if (cleaned !== text) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Only letters are allowed' }));
    } else {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  // Phone: only digits
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhone(cleaned);
    if (cleaned !== text) {
      setFieldErrors(prev => ({ ...prev, phone: 'Only numbers are allowed' }));
    } else {
      setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
    }
  };

  // Email: validate format on blur
  const handleEmailBlur = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n; });
    }
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8)             return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pass))         return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/.test(pass))         return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must include at least one special character.';
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !city || !barangay || !birthday.trim() || !phone.trim()) {
      setError('Please fill in all required fields, including birthday and phone number.');
      return;
    }

    if (phone.trim().length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    const passError = validatePassword(password);
    if (passError) { setError(passError); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms and Conditions and Privacy Policy.'); return; }

    setLoading(true);
    try {
      const emailNormalized = email.trim().toLowerCase();
      const fullName   = `${firstName.trim()} ${middleName.trim() ? middleName.trim() + ' ' : ''}${lastName.trim()}`;
      const birthdayForDb = toIsoDate(bdayYear, bdayMonth, bdayDay);
      const [roleId, barangayId] = await Promise.all([
        lookupNamedId(['v_roles', 'roles'], 'role_id', 'role_name', 'Resident'),
        lookupNamedId(['v_barangays', 'barangays'], 'barangay_id', 'barangay_name', barangay),
      ]);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailNormalized,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            middle_name: middleName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            birthday: birthdayForDb,
            phone_number: phone.trim(),
            province: 'Cavite',
            city,
            barangay,
            street: street.trim(),
            role_id: roleId,
            barangay_id: barangayId,
          },
        },
      });

      if (signUpError) {
        setError(supabaseErrorMessage(signUpError.message));
        return;
      }

      const authUser = signUpData.user;
      if (!authUser) {
        setError('Account creation started, but no user was returned from Supabase.');
        return;
      }

      const profilePayload = {
        user_id: authUser.id,
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        birthday: birthdayForDb,
        email: emailNormalized,
        phone_number: phone.trim(),
        province: 'Cavite',
        city,
        barangay,
        street: street.trim(),
        role_id: roleId,
        barangay_id: barangayId,
        fcm_token: '',
      };

      if (signUpData.session) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert(profilePayload, { onConflict: 'user_id' });

        if (profileError) {
          setError(supabaseErrorMessage(profileError.message));
          return;
        }
      }

      // Force explicit login after signup, even when Supabase returns an active session.
      if (signUpData.session) {
        await supabase.auth.signOut();
      }

      setSuccess('Account created. Please sign in with your new credentials.');
      router.replace('/login');
    } catch (err: any) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={s.sectionHeader}>{title}</Text>
  );

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <Text style={s.fieldError}>⚠ {fieldErrors[field]}</Text>
    ) : null;

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

            {success ? (
              <View style={s.successBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={s.successText}>{success}</Text>
              </View>
            ) : null}

            {/* ── PERSONAL INFORMATION ── */}
            <SectionHeader title="PERSONAL INFORMATION" />

            <Text style={s.label}>First Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={[s.input, fieldErrors.firstName && s.inputError]}
              placeholder="e.g. Juan"
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={handleNameChange(setFirstName, 'firstName')}
            />
            <FieldError field="firstName" />

            <Text style={s.label}>Middle Name</Text>
            <TextInput
              style={[s.input, fieldErrors.middleName && s.inputError]}
              placeholder="e.g. Santos (optional)"
              placeholderTextColor="#9ca3af"
              value={middleName}
              onChangeText={handleNameChange(setMiddleName, 'middleName')}
            />
            <FieldError field="middleName" />

            <Text style={s.label}>Last Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={[s.input, fieldErrors.lastName && s.inputError]}
              placeholder="e.g. Dela Cruz"
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={handleNameChange(setLastName, 'lastName')}
            />
            <FieldError field="lastName" />

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
            <TextInput
              style={s.input}
              placeholder="e.g. Blk 5 Lot 12, Sampaguita St."
              placeholderTextColor="#9ca3af"
              value={street}
              onChangeText={setStreet}
            />

            {/* ── CONTACT INFORMATION ── */}
            <SectionHeader title="CONTACT INFORMATION" />

            <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
            <TextInput
              style={[s.input, fieldErrors.email && s.inputError]}
              placeholder="user@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n; });
              }}
              onBlur={handleEmailBlur}
            />
            <FieldError field="email" />

            <Text style={s.label}>Phone Number</Text>
            <TextInput
              style={[s.input, fieldErrors.phone && s.inputError]}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={11}
            />
            <FieldError field="phone" />

            {/* ── SECURITY ── */}
            <SectionHeader title="SECURITY" />

            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <View style={s.passwordWrapper}>
              <TextInput
                style={s.passwordInput}
                placeholder="Min. 8 chars, 1 uppercase, 1 number, 1 special"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
            <View style={s.passwordWrapper}>
              <TextInput
                style={s.passwordInput}
                placeholder="Re-enter password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPass}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(v => !v)} style={s.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showConfirmPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <View style={s.termsRow}>
              <TouchableOpacity onPress={() => setAgreed(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                  {agreed && <Text style={s.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={s.termsText}>
                I agree to the{' '}
                <Text style={s.termsLink} onPress={() => setTermsModal(true)}>
                  Terms and Conditions
                </Text>
                {' '}and{' '}
                <Text style={s.termsLink} onPress={() => setPrivacyModal(true)}>
                  Privacy Policy
                </Text>
                {' '}of HydroAlert. This field is required.
              </Text>
            </View>

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

      {/* Modals */}
      <DropdownModal visible={cityModal}     onClose={() => setCityModal(false)}     options={CITIES}    onSelect={handleCitySelect} title="Select City / Municipality" />
      <DropdownModal visible={barangayModal} onClose={() => setBarangayModal(false)} options={barangays} onSelect={setBarangay}      title="Select Barangay" />
      <TermsModal    visible={termsModal}    onClose={() => setTermsModal(false)} />
      <PrivacyPolicyModal visible={privacyModal} onClose={() => setPrivacyModal(false)} />
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
  successBox:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dcfce7', borderRadius: 8, padding: 10, marginBottom: 14 },
  successText:{ flex: 1, color: '#15803d', fontSize: 13, lineHeight: 18 },

  fieldError: { fontSize: 12, color: '#dc2626', marginTop: 4, marginLeft: 2 },

  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#2563eb', letterSpacing: 0.8, marginTop: 20, marginBottom: 4 },
  label:         { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  req:           { color: '#dc2626' },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 15, color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  selectBox: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  disabledBox:       { backgroundColor: '#f3f4f6' },
  selectValue:       { fontSize: 15, color: '#111827' },
  selectPlaceholder: { fontSize: 15, color: '#9ca3af' },
  chevron:           { fontSize: 14, color: '#6b7280' },
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
  termsLink:       { color: '#2563eb', fontWeight: '600', textDecorationLine: 'underline' },

  createBtn:         { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  createBtnDisabled: { backgroundColor: '#93c5fd' },
  createText:        { color: '#fff', fontSize: 16, fontWeight: '600' },

  backRow:  { alignItems: 'center', marginTop: 16, marginBottom: 4 },
  backText: { fontSize: 14, color: '#6b7280' },
  backLink: { color: '#2563eb', fontWeight: '600' },
});