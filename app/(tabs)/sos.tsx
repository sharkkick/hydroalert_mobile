import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useApp } from '../AppContext';

const { width } = Dimensions.get('window');

const PEOPLE_OPTIONS = ['1', '2-5', '6-10', '10+'];
const SITUATION_OPTIONS = [
  'Trapped in building',
  'Flood rising rapidly',
  'Medical emergency',
  'Stranded on rooftop',
  'Vehicle submerged',
  'Other emergency',
];

const HOTLINES = [
  { label: 'National Emergency', number: '911' },
  { label: 'NDRRMC Hotline',     number: '911-1406' },
  { label: 'Red Cross',          number: '143' },
];

export default function SOSScreen() {
  const { addAlert, logActivity } = useApp();
  const [showDetails, setShowDetails]               = useState(false);
  const [selectedPeople, setSelectedPeople]         = useState<string | null>(null);
  const [selectedSituation, setSelectedSituation]   = useState<string | null>(null);
  const [showSituationDropdown, setShowSituationDropdown] = useState(false);

  // ── One-time SOS lock ──────────────────────────────────────────────────
  const [sosPressed, setSosPressed]   = useState(false); // true = already sent
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // ───────────────────────────────────────────────────────────────────────

  const handleSOSPress = () => {
    // Block repeat presses
    if (sosPressed) return;

    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    // Lock the button immediately
    setSosPressed(true);
    setShowDetails(true);

    const id = Date.now().toString();
    addAlert({
      id,
      time: new Date().toLocaleString(),
      timeAgo: 'Just now',
      people: selectedPeople,
      situation: selectedSituation,
      location: 'Detected',
      status: 'sent',
    });
    logActivity({
      type: 'sos_sent',
      title: 'SOS Sent',
      description: 'Emergency rescue request sent to rescue teams',
    });

    Alert.alert(
      '🚨 SOS Sent',
      'Your location has been sent to rescue teams. Please also call the emergency hotlines below.',
      [{ text: 'OK' }],
    );
  };

  // Update alert details without re-sending a new SOS
  const handleSendDetailed = () => {
    if (!selectedPeople) {
      Alert.alert('Required', 'Please select how many people need rescue.');
      return;
    }
    const id = Date.now().toString();
    addAlert({
      id,
      time: new Date().toLocaleString(),
      timeAgo: 'Just now',
      people: selectedPeople,
      situation: selectedSituation,
      location: 'Detected',
      status: 'sent',
    });
    logActivity({
      type: 'alert_created',
      title: 'Alert Updated',
      description: `Updated SOS details: ${selectedPeople} people${selectedSituation ? ` — ${selectedSituation}` : ''}`,
    });
    Alert.alert('✅ Details Updated', 'Rescue teams have been notified with your updated details.');
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Emergency Banner */}
      <View style={s.banner}>
        <View style={s.bannerIcon}>
          <Ionicons name="warning" size={26} color="#ffffff" />
        </View>
        <View style={s.bannerText}>
          <Text style={s.bannerTitle}>EMERGENCY RESCUE REQUEST</Text>
          <Text style={s.bannerSub}>Use this only if you or others are trapped and need immediate rescue</Text>
        </View>
      </View>

      {/* SOS Button Card */}
      <View style={s.sosCard}>

        {/* Big SOS Button — disabled after first press */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            style={[s.sosButton, sosPressed && s.sosButtonSent]}
            onPress={handleSOSPress}
            activeOpacity={sosPressed ? 1 : 0.85}
            disabled={sosPressed}          // ← prevents any further tap events
          >
            <View style={s.sosInner}>
              {sosPressed ? (
                // Show checkmark once sent
                <Ionicons name="checkmark" size={80} color="#ffffff" />
              ) : (
                <Ionicons name="warning" size={72} color="#ffffff" />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Status label under button */}
        {sosPressed ? (
          <View style={s.sosSentBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={s.sosSentText}>SOS Sent — Location shared with rescue teams</Text>
          </View>
        ) : (
          <Text style={s.sosTapHint}>Tap to send emergency alert</Text>
        )}

        {/* One-time lock notice */}
        {sosPressed && (
          <View style={s.lockNotice}>
            <Ionicons name="lock-closed-outline" size={14} color="#6b7280" />
            <Text style={s.lockText}>Button locked to prevent duplicate alerts. You can still update your details below.</Text>
          </View>
        )}

        {/* Details Toggle — always available */}
        <TouchableOpacity
          style={s.detailsToggle}
          onPress={() => setShowDetails(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.detailsToggleText}>
            {showDetails ? 'Hide details (optional)' : 'Add details (optional)'}
          </Text>
          <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color="#374151" />
        </TouchableOpacity>

        {/* Expandable Details — always editable */}
        {showDetails && (
          <View style={s.detailsSection}>
            <View style={s.divider} />

            {/* People Count */}
            <Text style={s.detailLabel}>
              How many people need rescue? <Text style={s.required}>*</Text>
            </Text>
            <View style={s.peopleGrid}>
              {PEOPLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.peopleBtn, selectedPeople === opt && s.peopleBtnSelected]}
                  onPress={() => setSelectedPeople(opt)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="people"
                    size={22}
                    color={selectedPeople === opt ? '#2563eb' : '#6b7280'}
                  />
                  <Text style={[s.peopleBtnText, selectedPeople === opt && s.peopleBtnTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Situation Dropdown */}
            <Text style={[s.detailLabel, { marginTop: 16 }]}>Emergency Situation</Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setShowSituationDropdown(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={selectedSituation ? s.dropdownValue : s.dropdownPlaceholder}>
                {selectedSituation || 'Select situation…'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>

            {showSituationDropdown && (
              <View style={s.dropdownList}>
                {SITUATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={s.dropdownItem}
                    onPress={() => { setSelectedSituation(opt); setShowSituationDropdown(false); }}
                  >
                    <Text style={s.dropdownItemText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.detailHint}>Be specific: building type, floor level, landmarks nearby</Text>

            {/* Update details button — label changes after first send */}
            <TouchableOpacity
              style={[s.sendBtn, !selectedPeople && s.sendBtnDisabled]}
              onPress={handleSendDetailed}
              activeOpacity={0.85}
            >
              <Ionicons name={sosPressed ? 'refresh' : 'send'} size={16} color={selectedPeople ? '#ffffff' : '#9ca3af'} />
              <Text style={[s.sendBtnText, !selectedPeople && s.sendBtnTextDisabled]}>
                {sosPressed ? 'UPDATE DETAILS' : 'SEND DETAILED REQUEST'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Hotlines Card */}
      <View style={s.hotlineCard}>
        <Text style={s.hotlineTitle}>CALL THESE NUMBERS NOW:</Text>
        {HOTLINES.map((h, i) => (
          <View key={h.label}>
            {i > 0 && <View style={s.divider} />}
            <View style={s.hotlineRow}>
              <Text style={s.hotlineLabel}>{h.label}</Text>
              <View style={s.hotlineRight}>
                <Text style={s.hotlineNumber}>{h.number}</Text>
                <Ionicons name="call" size={18} color="#dc2626" />
              </View>
            </View>
          </View>
        ))}

        <View style={s.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color="#dc2626" />
          <Text style={s.infoText}>
            This app sends your location to rescue teams. Always call emergency hotlines as well for fastest response.
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dbeafe' },
  scroll: { padding: 14, gap: 14, paddingBottom: 32 },

  // Banner
  banner: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 3, lineHeight: 17 },

  // SOS Card
  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },

  // SOS Button — red when ready, grey-green when sent
  sosButton: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#dc2626',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },
  // Sent state: muted green to show success, clearly different from active red
  sosButtonSent: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    elevation: 4,
  },
  sosInner: { alignItems: 'center', justifyContent: 'center' },

  sosTapHint: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },

  sosSentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6,
  },
  sosSentText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  // Lock notice
  lockNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#f9fafb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4, marginTop: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  lockText: { flex: 1, fontSize: 11.5, color: '#6b7280', lineHeight: 17 },

  // Details toggle
  detailsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingVertical: 14, marginTop: 4,
  },
  detailsToggleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#f3f4f6', width: '100%', marginBottom: 14 },

  // Details section
  detailsSection: { width: '100%', gap: 0 },
  detailLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  required: { color: '#dc2626' },

  peopleGrid: { flexDirection: 'row', gap: 8 },
  peopleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', gap: 6, backgroundColor: '#f9fafb',
  },
  peopleBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  peopleBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  peopleBtnTextSelected: { color: '#2563eb' },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#f9fafb',
  },
  dropdownValue: { fontSize: 14, color: '#111827' },
  dropdownPlaceholder: { fontSize: 14, color: '#9ca3af' },
  dropdownList: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#ffffff', marginTop: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },

  detailHint: { fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 14 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#2563eb', borderRadius: 12,
    paddingVertical: 14, width: '100%',
  },
  sendBtnDisabled: { backgroundColor: '#e5e7eb' },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  sendBtnTextDisabled: { color: '#9ca3af' },

  // Hotlines
  hotlineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  hotlineTitle: { fontSize: 13, fontWeight: '800', color: '#dc2626', letterSpacing: 0.4, marginBottom: 12 },
  hotlineRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 13,
  },
  hotlineLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  hotlineRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hotlineNumber: { fontSize: 16, fontWeight: '700', color: '#dc2626' },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    padding: 12, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 18 },
});