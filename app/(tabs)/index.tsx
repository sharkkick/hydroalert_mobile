import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

// ── Simulated current conditions (replace with real Firebase data) ──
const CURRENT = {
  waterLevel: 3.5,
  rainfallRate: 18,
  alertLevel: 'orange' as 'green' | 'yellow' | 'orange' | 'red',
};

const ALERT_LEVELS = [
  {
    key: 'green',
    label: 'Normal',
    color: '#16a34a',
    bg: '#dcfce7',
    border: '#86efac',
    icon: 'checkmark-circle' as const,
    waterRange: 'Below 2.0m',
    rainfallRange: 'Below 7.5mm/hr (Light)',
    meaning: 'Water levels are within safe range. No immediate threat to communities.',
    action: 'No action needed. Stay informed and monitor updates.',
  },
  {
    key: 'yellow',
    label: 'Advisory',
    color: '#ca8a04',
    bg: '#fef9c3',
    border: '#fde047',
    icon: 'alert-circle-outline' as const,
    waterRange: '2.0m – 2.9m',
    rainfallRange: '7.5 – 15mm/hr (Moderate)',
    meaning: 'Water is beginning to rise. Rainfall is sustained. Low-lying areas should monitor closely.',
    action: 'Prepare emergency bag. Check evacuation routes. Listen to official announcements.',
  },
  {
    key: 'orange',
    label: 'Warning',
    color: '#ea580c',
    bg: '#ffedd5',
    border: '#fb923c',
    icon: 'warning-outline' as const,
    waterRange: '3.0m – 3.9m',
    rainfallRange: '15 – 30mm/hr (Heavy)',
    meaning: 'Water level is rising significantly. Flooding in low-lying areas is likely. Heavy rainfall is ongoing.',
    action: 'Prepare to evacuate. Move valuables to higher ground. Avoid crossing flooded roads.',
  },
  {
    key: 'red',
    label: 'Danger',
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fca5a5',
    icon: 'alert' as const,
    waterRange: '4.0m and above',
    rainfallRange: 'Above 30mm/hr (Extreme)',
    meaning: 'Critical water levels reached or exceeded. Flooding is occurring or imminent. Life-threatening conditions.',
    action: 'EVACUATE IMMEDIATELY. Use the SOS button if trapped. Do not attempt to cross floodwaters.',
  },
];

const RAINFALL_GUIDE = [
  { label: 'Light',    range: 'Below 7.5mm/hr',  color: '#2563eb', bg: '#eff6ff',  desc: 'Gentle, steady rain. Streets may get wet but no flooding risk.' },
  { label: 'Moderate', range: '7.5 – 15mm/hr',   color: '#ca8a04', bg: '#fef9c3',  desc: 'Noticeable rainfall. Low-lying areas may start to accumulate water.' },
  { label: 'Heavy',    range: '15 – 30mm/hr',     color: '#ea580c', bg: '#ffedd5',  desc: 'Rapid accumulation. Drainage systems may overflow. Flash flood risk.' },
  { label: 'Extreme',  range: 'Above 30mm/hr',    color: '#dc2626', bg: '#fee2e2',  desc: 'Very intense. Severe flooding likely. Evacuation may be needed.' },
];

const SAFETY_TIPS = [
  { icon: 'bag-outline' as const,             tip: 'Prepare a "Go Bag" — water, food, documents, medicine, flashlight, phone charger.' },
  { icon: 'map-outline' as const,             tip: 'Know your nearest evacuation center and two routes to get there.' },
  { icon: 'phone-portrait-outline' as const,  tip: 'Keep your phone charged. Save local DRRMO and emergency numbers.' },
  { icon: 'water-outline' as const,           tip: 'Never cross floodwater on foot or by vehicle — 6 inches can knock you down.' },
  { icon: 'home-outline' as const,            tip: 'Move important items and documents to upper floors before flooding.' },
  { icon: 'people-outline' as const,          tip: 'Check on elderly neighbors and those with disabilities — they may need help evacuating.' },
];

function getCurrentAlertLevel() {
  return ALERT_LEVELS.find(a => a.key === CURRENT.alertLevel) || ALERT_LEVELS[0];
}

function getCurrentRainfallCategory() {
  const r = CURRENT.rainfallRate;
  if (r < 7.5) return RAINFALL_GUIDE[0];
  if (r < 15)  return RAINFALL_GUIDE[1];
  if (r < 30)  return RAINFALL_GUIDE[2];
  return RAINFALL_GUIDE[3];
}

export default function HomeScreen() {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const currentAlert    = getCurrentAlertLevel();
  const currentRainCat  = getCurrentRainfallCategory();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Current Conditions Banner */}
      <View style={[s.currentBanner, { backgroundColor: currentAlert.bg, borderColor: currentAlert.border }]}>
        <View style={s.bannerTop}>
          <Ionicons name={currentAlert.icon} size={22} color={currentAlert.color} />
          <Text style={[s.bannerTitle, { color: currentAlert.color }]}>
            Current Flood Alert: {currentAlert.label.toUpperCase()}
          </Text>
        </View>
        <View style={s.bannerStats}>
          <View style={s.bannerStat}>
            <Ionicons name="water-outline" size={14} color={currentAlert.color} />
            <Text style={[s.bannerStatText, { color: currentAlert.color }]}>Water: {CURRENT.waterLevel}m</Text>
          </View>
          <View style={s.bannerStat}>
            <MaterialCommunityIcons name="weather-rainy" size={14} color={currentAlert.color} />
            <Text style={[s.bannerStatText, { color: currentAlert.color }]}>Rain: {CURRENT.rainfallRate}mm/hr ({currentRainCat.label})</Text>
          </View>
        </View>
        <Text style={[s.bannerAction, { color: currentAlert.color }]}>{currentAlert.action}</Text>
      </View>

      {/* Alert Levels */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Flood Alert Levels</Text>
        <Text style={s.cardSub}>Tap each level to learn what it means and what to do</Text>
        {ALERT_LEVELS.map(level => {
          const isExpanded = expandedAlert === level.key;
          const isCurrent  = level.key === CURRENT.alertLevel;
          return (
            <TouchableOpacity
              key={level.key}
              style={[s.alertRow, isCurrent && { borderColor: level.color, borderWidth: 1.5 }]}
              onPress={() => setExpandedAlert(isExpanded ? null : level.key)}
              activeOpacity={0.7}
            >
              <View style={[s.alertDot, { backgroundColor: level.bg }]}>
                <Ionicons name={level.icon} size={18} color={level.color} />
              </View>
              <View style={s.alertInfo}>
                <View style={s.alertLabelRow}>
                  <Text style={[s.alertLabel, { color: level.color }]}>{level.label}</Text>
                  {isCurrent && (
                    <View style={[s.currentBadge, { backgroundColor: level.bg }]}>
                      <Text style={[s.currentBadgeText, { color: level.color }]}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={s.alertRange}>Water: {level.waterRange}</Text>
                {isExpanded && (
                  <View style={[s.alertExpanded, { backgroundColor: level.bg }]}>
                    <Text style={[s.alertExpandedTitle, { color: level.color }]}>What it means</Text>
                    <Text style={s.alertExpandedText}>{level.meaning}</Text>
                    <Text style={[s.alertExpandedTitle, { color: level.color, marginTop: 8 }]}>What to do</Text>
                    <Text style={s.alertExpandedText}>{level.action}</Text>
                    <Text style={[s.alertExpandedTitle, { color: level.color, marginTop: 8 }]}>Rainfall indicator</Text>
                    <Text style={s.alertExpandedText}>{level.rainfallRange}</Text>
                  </View>
                )}
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rainfall Intensity Guide */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Rainfall Intensity Guide</Text>
        <Text style={s.cardSub}>Understanding how rainfall intensity affects flood risk</Text>
        {RAINFALL_GUIDE.map(r => (
          <View key={r.label} style={[s.rainRow, { backgroundColor: r.bg }]}>
            <View style={s.rainLeft}>
              <Text style={[s.rainLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={[s.rainRange, { color: r.color }]}>{r.range}</Text>
            </View>
            <Text style={s.rainDesc}>{r.desc}</Text>
          </View>
        ))}
      </View>

      {/* Safety Reminders */}
      <View style={[s.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }]}>
        <View style={s.cardTitleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#2563eb" />
          <Text style={[s.cardTitle, { color: '#1e40af', marginBottom: 0 }]}>Safety Reminders</Text>
        </View>
        <Text style={[s.cardSub, { marginBottom: 12 }]}>Always be prepared, especially during rainy season</Text>
        {SAFETY_TIPS.map((tip, i) => (
          <View key={i} style={s.tipRow}>
            <View style={s.tipIcon}>
              <Ionicons name={tip.icon} size={16} color="#2563eb" />
            </View>
            <Text style={s.tipText}>{tip.tip}</Text>
          </View>
        ))}
      </View>

      {/* Emergency Hotlines */}
      <View style={[s.card, { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }]}>
        <View style={s.cardTitleRow}>
          <Ionicons name="call-outline" size={18} color="#dc2626" />
          <Text style={[s.cardTitle, { color: '#991b1b', marginBottom: 0 }]}>Emergency Hotlines</Text>
        </View>
        <Text style={[s.cardSub, { marginBottom: 12 }]}>Call these numbers in addition to using the SOS button</Text>
        {[
          { name: 'National Emergency',    number: '911'            },
          { name: 'NDRRMC Hotline',        number: '(02) 911-1406'  },
          { name: 'Red Cross Philippines', number: '143'            },
          { name: 'PAGASA Weather',        number: '(02) 8284-0800' },
        ].map((h, i) => (
          <View key={i} style={[s.hotlineRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: '#fecaca' }]}>
            <Text style={s.hotlineName}>{h.name}</Text>
            <Text style={s.hotlineNumber}>{h.number}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:    { padding: 14, gap: 14, paddingBottom: 32 },

  currentBanner: { borderRadius: 14, padding: 16, borderWidth: 1.5, gap: 8 },
  bannerTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle:   { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  bannerStats:   { flexDirection: 'row', gap: 16 },
  bannerStat:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bannerStatText:{ fontSize: 13, fontWeight: '600' },
  bannerAction:  { fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 2 },

  card:         { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub:      { fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 17 },

  alertRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4, backgroundColor: '#f9fafb', borderWidth: 0, borderColor: 'transparent' },
  alertDot:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertInfo:     { flex: 1 },
  alertLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  alertLabel:    { fontSize: 14, fontWeight: '700' },
  alertRange:    { fontSize: 11, color: '#6b7280' },
  currentBadge:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  currentBadgeText: { fontSize: 10, fontWeight: '700' },
  alertExpanded: { marginTop: 10, borderRadius: 10, padding: 12 },
  alertExpandedTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  alertExpandedText:  { fontSize: 12, color: '#374151', lineHeight: 18 },

  rainRow:  { flexDirection: 'row', gap: 10, borderRadius: 10, padding: 10, marginBottom: 6, alignItems: 'flex-start' },
  rainLeft: { width: 80 },
  rainLabel:{ fontSize: 13, fontWeight: '700' },
  rainRange:{ fontSize: 9, marginTop: 1 },
  rainDesc: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 20 },

  hotlineRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  hotlineName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  hotlineNumber:{ fontSize: 15, fontWeight: '700', color: '#dc2626' },
});