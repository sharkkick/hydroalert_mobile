import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { getLatestSensorReading, getCurrentRainfall, getWaterLevelStatus, getRainfallWarning, type SensorReading } from '../../lib/sensor-api';

const STATUS = {
  normal:   { label: 'Normal',  color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: 'checkmark-circle'  as const },
  warning:  { label: 'Warning', color: '#ea580c', bg: '#ffedd5', border: '#fb923c', icon: 'warning-outline'   as const },
  critical: { label: 'Danger',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: 'alert-circle'      as const },
};

function WaterBar({ level, max, status }: { level: number; max: number; status: string }) {
  const pct = Math.min((level / max) * 100, 100);
  const st  = STATUS[status as keyof typeof STATUS] || STATUS.normal;
  return (
    <View style={b.track}>
      <View style={[b.fill, { width: `${pct}%` as any, backgroundColor: st.color }]} />
    </View>
  );
}

export default function FloodStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [rainfall, setRainfall] = useState<{ current: number; description: string }>({ current: 0, description: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [sensor, rain] = await Promise.all([
      getLatestSensorReading('S-001'),
      getCurrentRainfall(),
    ]);
    setSensorData(sensor);
    setRainfall(rain);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const waterLevelMm = sensorData ? Math.round(sensorData.water_level_cm * 10) / 10 : 0;
  const waterStatus = getWaterLevelStatus(waterLevelMm);
  const rainfallWarning = getRainfallWarning(rainfall.current);
  const overallStatus = waterStatus.status;
  const st = STATUS[overallStatus] || STATUS.normal;

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading sensor data...</Text>
      </View>
    );
  }

  const lastUpdated = sensorData?.timestamp
    ? new Date(sensorData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Summary strip */}
      <View style={s.summaryRow}>
        <View style={[s.sumCard, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={18} color={st.color} />
          <Text style={[s.sumVal, { color: st.color }]}>{waterStatus.label}</Text>
          <Text style={[s.sumLbl, { color: st.color }]}>Water Level</Text>
        </View>
        <View style={[s.sumCard, { backgroundColor: rainfallWarning.bg }]}>
          <MaterialCommunityIcons name="weather-rainy" size={18} color={rainfallWarning.color} />
          <Text style={[s.sumVal, { color: rainfallWarning.color }]}>{rainfall.current}</Text>
          <Text style={[s.sumLbl, { color: rainfallWarning.color }]}>mm/hr</Text>
        </View>
        <View style={[s.sumCard, { backgroundColor: '#f1f5f9' }]}>
          <Ionicons name="time-outline" size={18} color="#6b7280" />
          <Text style={s.sumVal}>{lastUpdated}</Text>
          <Text style={s.sumLbl}>Updated</Text>
        </View>
      </View>

      {/* Sensor Card */}
      <TouchableOpacity
        style={[s.card, { borderLeftColor: st.color, borderLeftWidth: 4 }]}
        onPress={() => setExpanded(expanded ? null : 'S-001')}
        activeOpacity={0.85}
      >
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={[s.locIcon, { backgroundColor: st.bg }]}>
            <Ionicons name="location" size={16} color={st.color} />
          </View>
          <View style={s.cardMid}>
            <Text style={s.brgName}>Brgy. Medicion II-F</Text>
            <Text style={s.brgArea}>Imus, Cavite · S-001</Text>
          </View>
          <View style={s.cardRight}>
            <View style={[s.badge, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon} size={11} color={st.color} />
              <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color="#9ca3af" style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Collapsed preview */}
        {!expanded && (
          <View style={s.preview}>
            <View style={s.previewItem}>
              <Ionicons name="water-outline" size={13} color={waterStatus.color} />
              <Text style={[s.previewVal, { color: waterStatus.color }]}>{waterLevelMm}mm</Text>
              <Text style={s.previewLbl}>water level</Text>
            </View>
            <View style={s.previewItem}>
              <MaterialCommunityIcons name="weather-rainy" size={13} color={rainfallWarning.color} />
              <Text style={[s.previewVal, { color: rainfallWarning.color }]}>{rainfall.current}mm/hr</Text>
              <Text style={s.previewLbl}>rainfall</Text>
            </View>
          </View>
        )}

        {/* Expanded details */}
        {expanded && (
          <View style={s.sensorBlock}>
            <View style={s.sensorHead}>
              <Text style={s.sensorId}>S-001</Text>
              <View style={[s.miniBadge, { backgroundColor: st.bg }]}>
                <Text style={[s.miniBadgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>

            {/* Water level */}
            <View style={s.metric}>
              <View style={s.metricTop}>
                <Ionicons name="water-outline" size={12} color={waterStatus.color} />
                <Text style={s.metricLbl}>Water Level</Text>
                <Text style={[s.metricNum, { color: waterStatus.color }]}>{waterLevelMm}mm</Text>
              </View>
              <WaterBar level={waterLevelMm} max={100} status={overallStatus} />
              {waterLevelMm >= 75 && (
                <Text style={s.overThreshold}>Above danger threshold (75mm) — Evacuation may be needed</Text>
              )}
            </View>

            {/* Rainfall */}
            <View style={s.metric}>
              <View style={s.metricTop}>
                <MaterialCommunityIcons name="weather-rainy" size={12} color={rainfallWarning.color} />
                <Text style={s.metricLbl}>Rainfall ({rainfallWarning.level})</Text>
                <Text style={[s.metricNum, { color: rainfallWarning.color }]}>{rainfall.current}mm/hr</Text>
              </View>
              <View style={b.track}>
                <View style={[b.fill, { width: `${Math.min((rainfall.current / 40) * 100, 100)}%` as any, backgroundColor: rainfallWarning.color }]} />
              </View>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{rainfall.description}</Text>
            </View>

            {/* Coordinates */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>Lat: {sensorData?.latitude?.toFixed(4)}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>Lon: {sensorData?.longitude?.toFixed(4)}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Legend */}
      <View style={s.legendCard}>
        <Text style={s.legendTitle}>What do these levels mean?</Text>
        <Text style={s.legendBody}>Use this to understand the colors and numbers in the cards above.</Text>
        <View style={s.legendItems}>
          {[
            { label: '0 – 29 mm — Safe', color: '#16a34a' },
            { label: '30 – 49 mm — Watch', color: '#ca8a04' },
            { label: '50 – 74 mm — Warning', color: '#ea580c' },
            { label: '75 mm or more — Danger', color: '#dc2626' },
          ].map(l => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: l.color }]} />
              <Text style={s.legendItemText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:    { padding: 14, gap: 12, paddingBottom: 32 },

  summaryRow: { flexDirection: 'row', gap: 8 },
  sumCard:    { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  sumVal:     { fontSize: 20, fontWeight: '700', color: '#111827' },
  sumLbl:     { fontSize: 10, color: '#6b7280', marginTop: 2 },

  filterRow:       { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3, gap: 2 },
  filterBtn:       { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  filterActive:    { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  filterText:      { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive:{ color: '#111827', fontWeight: '700' },

  card:      { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  locIcon:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardMid:   { flex: 1 },
  brgName:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  brgArea:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  preview:     { borderTopWidth: 0.5, borderTopColor: '#f1f5f9', paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewVal:  { fontSize: 13, fontWeight: '700' },
  previewLbl:  { fontSize: 10, color: '#9ca3af' },
  previewCount:{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' },

  sensorBlock: { paddingTop: 12, marginTop: 4 },
  sensorBorder:{ borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  sensorHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sensorId:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  miniBadge:   { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  miniBadgeText:{ fontSize: 10, fontWeight: '600' },
  sensorSpot:  { fontSize: 11, color: '#6b7280', marginBottom: 8 },

  metric:    { marginBottom: 8 },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metricLbl: { fontSize: 11, color: '#6b7280', flex: 1 },
  metricNum: { fontSize: 12, fontWeight: '700' },
  overThreshold: { fontSize: 10, color: '#dc2626', marginTop: 3, fontWeight: '600' },

  legendCard:     { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#e5e7eb' },
  legendTitle:    { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  legendBody:     { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 10 },
  legendItems:    { gap: 6 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:      { width: 10, height: 10, borderRadius: 3 },
  legendItemText: { fontSize: 12, color: '#374151' },

  empty:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub:   { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});

const b = StyleSheet.create({
  track: { height: 7, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 999 },
});