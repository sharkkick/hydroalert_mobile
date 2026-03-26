import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

// ── Replace with real Firebase data ──
const LOCATIONS = [
  {
    barangay: 'Brgy. Medicion II-F',
    area: 'Imus, Cavite',
    sensors: [
      { id: 'S-001', spot: 'Near Palengke / Drainage Area',  water: 2.3, rainfall: 5,  status: 'normal'   },
      { id: 'S-002', spot: 'Riverside Accumulation Zone',     water: 2.8, rainfall: 12, status: 'warning'  },
    ],
  },
  {
    barangay: 'Brgy. Pag-asa III',
    area: 'Imus, Cavite',
    sensors: [
      { id: 'S-003', spot: 'Low-lying Street / Flood Basin',  water: 4.2, rainfall: 22, status: 'critical' },
      { id: 'S-004', spot: 'Near Perimeter Road',             water: 1.8, rainfall: 3,  status: 'normal'   },
    ],
  },
];

const STATUS = {
  normal:   { label: 'Normal',  color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: 'checkmark-circle'  as const },
  warning:  { label: 'Warning', color: '#ea580c', bg: '#ffedd5', border: '#fb923c', icon: 'warning-outline'   as const },
  critical: { label: 'Danger',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: 'alert-circle'      as const },
};

const FILTERS = ['All', 'Normal', 'Warning', 'Danger'] as const;
type Filter = typeof FILTERS[number];

function WaterBar({ level, status }: { level: number; status: string }) {
  const pct = Math.min((level / 5) * 100, 100);
  const st  = STATUS[status as keyof typeof STATUS];
  return (
    <View style={b.track}>
      <View style={[b.fill, { width: `${pct}%` as any, backgroundColor: st.color }]} />
    </View>
  );
}

function getOverall(sensors: typeof LOCATIONS[0]['sensors']) {
  if (sensors.some(s => s.status === 'critical')) return 'critical';
  if (sensors.some(s => s.status === 'warning'))  return 'warning';
  return 'normal';
}

export default function FloodStatusScreen() {
  const [filter,   setFilter]   = useState<Filter>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const allSensors = LOCATIONS.flatMap(l => l.sensors);
  const counts = {
    total:    allSensors.length,
    critical: allSensors.filter(s => s.status === 'critical').length,
    warning:  allSensors.filter(s => s.status === 'warning').length,
    normal:   allSensors.filter(s => s.status === 'normal').length,
  };

  const filtered = LOCATIONS.map(loc => ({
    ...loc,
    sensors: loc.sensors.filter(s => {
      if (filter === 'All')     return true;
      if (filter === 'Normal')  return s.status === 'normal';
      if (filter === 'Warning') return s.status === 'warning';
      if (filter === 'Danger')  return s.status === 'critical';
      return true;
    }),
  })).filter(l => l.sensors.length > 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Summary strip */}
      <View style={s.summaryRow}>
        <View style={[s.sumCard, { backgroundColor: '#f1f5f9' }]}>
          <Text style={s.sumVal}>{counts.total}</Text>
          <Text style={s.sumLbl}>Sensors</Text>
        </View>
        <View style={[s.sumCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={[s.sumVal, { color: '#dc2626' }]}>{counts.critical}</Text>
          <Text style={[s.sumLbl, { color: '#dc2626' }]}>Danger</Text>
        </View>
        <View style={[s.sumCard, { backgroundColor: '#ffedd5' }]}>
          <Text style={[s.sumVal, { color: '#ea580c' }]}>{counts.warning}</Text>
          <Text style={[s.sumLbl, { color: '#ea580c' }]}>Warning</Text>
        </View>
        <View style={[s.sumCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={[s.sumVal, { color: '#16a34a' }]}>{counts.normal}</Text>
          <Text style={[s.sumLbl, { color: '#16a34a' }]}>Normal</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location cards */}
      {filtered.map(loc => {
        const overall  = getOverall(loc.sensors);
        const st       = STATUS[overall];
        const isOpen   = expanded === loc.barangay;
        const highest  = [...loc.sensors].sort((a, b) => b.water - a.water)[0];

        return (
          <TouchableOpacity
            key={loc.barangay}
            style={[s.card, { borderLeftColor: st.color, borderLeftWidth: 4 }]}
            onPress={() => setExpanded(isOpen ? null : loc.barangay)}
            activeOpacity={0.85}
          >
            {/* Header */}
            <View style={s.cardHeader}>
              <View style={[s.locIcon, { backgroundColor: st.bg }]}>
                <Ionicons name="location" size={16} color={st.color} />
              </View>
              <View style={s.cardMid}>
                <Text style={s.brgName}>{loc.barangay}</Text>
                <Text style={s.brgArea}>{loc.area}</Text>
              </View>
              <View style={s.cardRight}>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={11} color={st.color} />
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#9ca3af" style={{ marginTop: 4 }} />
              </View>
            </View>

            {/* Collapsed preview */}
            {!isOpen && (
              <View style={s.preview}>
                <View style={s.previewItem}>
                  <Ionicons name="water-outline" size={13} color={STATUS[highest.status as keyof typeof STATUS].color} />
                  <Text style={[s.previewVal, { color: STATUS[highest.status as keyof typeof STATUS].color }]}>{highest.water}m</Text>
                  <Text style={s.previewLbl}>water level</Text>
                </View>
                <View style={s.previewItem}>
                  <MaterialCommunityIcons name="weather-rainy" size={13} color="#2563eb" />
                  <Text style={[s.previewVal, { color: '#2563eb' }]}>{highest.rainfall}mm/hr</Text>
                  <Text style={s.previewLbl}>rainfall</Text>
                </View>
                <Text style={s.previewCount}>{loc.sensors.length} sensor{loc.sensors.length > 1 ? 's' : ''}</Text>
              </View>
            )}

            {/* Expanded sensors */}
            {isOpen && loc.sensors.map((sensor, i) => {
              const sst = STATUS[sensor.status as keyof typeof STATUS];
              const rainCat = sensor.rainfall >= 30 ? 'Extreme' : sensor.rainfall >= 15 ? 'Heavy' : sensor.rainfall >= 7.5 ? 'Moderate' : 'Light';
              const rainColor = sensor.rainfall >= 30 ? '#dc2626' : sensor.rainfall >= 15 ? '#ea580c' : sensor.rainfall >= 7.5 ? '#ca8a04' : '#2563eb';
              return (
                <View key={sensor.id} style={[s.sensorBlock, i > 0 && s.sensorBorder]}>
                  {/* Sensor ID + spot */}
                  <View style={s.sensorHead}>
                    <Text style={s.sensorId}>{sensor.id}</Text>
                    <View style={[s.miniBadge, { backgroundColor: sst.bg }]}>
                      <Text style={[s.miniBadgeText, { color: sst.color }]}>{sst.label}</Text>
                    </View>
                  </View>
                  <Text style={s.sensorSpot}>{sensor.spot}</Text>

                  {/* Water level */}
                  <View style={s.metric}>
                    <View style={s.metricTop}>
                      <Ionicons name="water-outline" size={12} color={sst.color} />
                      <Text style={s.metricLbl}>Water Level</Text>
                      <Text style={[s.metricNum, { color: sst.color }]}>{sensor.water}m / 5.0m</Text>
                    </View>
                    <WaterBar level={sensor.water} status={sensor.status} />
                    {sensor.water >= 4.0 && (
                      <Text style={s.overThreshold}>Above critical threshold (4.0m) — Evacuation may be needed</Text>
                    )}
                  </View>

                  {/* Rainfall */}
                  <View style={s.metric}>
                    <View style={s.metricTop}>
                      <MaterialCommunityIcons name="weather-rainy" size={12} color={rainColor} />
                      <Text style={s.metricLbl}>Rainfall</Text>
                      <Text style={[s.metricNum, { color: rainColor }]}>{sensor.rainfall}mm/hr — {rainCat}</Text>
                    </View>
                    <View style={b.track}>
                      <View style={[b.fill, { width: `${Math.min((sensor.rainfall / 40) * 100, 100)}%` as any, backgroundColor: rainColor }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </TouchableOpacity>
        );
      })}

      {filtered.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#d1d5db" />
          <Text style={s.emptyTitle}>No {filter.toLowerCase()} sensors right now</Text>
          <Text style={s.emptySub}>All monitored areas are at a different level.</Text>
        </View>
      )}

      {/* Legend */}
      <View style={s.legendCard}>
        <Text style={s.legendTitle}>About the water level scale</Text>
        <Text style={s.legendBody}>Each sensor measures water depth up to 5.0 meters. The critical threshold is 4.0m — above this, flooding is likely and evacuation may be required.</Text>
        <View style={s.legendItems}>
          {[{ label: 'Below 2.0m — Normal', color: '#16a34a' }, { label: '2.0–3.9m — Warning', color: '#ea580c' }, { label: '4.0m and above — Danger', color: '#dc2626' }].map(l => (
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