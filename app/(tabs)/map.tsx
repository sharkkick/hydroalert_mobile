import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const { width, height } = Dimensions.get('window');
const MAP_W = width - 28;
const MAP_H = 280;

const SENSORS_MAP = [
  { id: 'S-001', name: 'Upstream Bridge',  x: 0.10, y: 0.22, status: 'normal'   },
  { id: 'S-002', name: 'Downtown Area',    x: 0.35, y: 0.22, status: 'normal'   },
  { id: 'S-003', name: 'East Riverside',   x: 0.60, y: 0.22, status: 'critical' },
  { id: 'S-004', name: 'South Bridge',     x: 0.82, y: 0.22, status: 'normal'   },
  { id: 'S-006', name: 'West Channel',     x: 0.10, y: 0.72, status: 'warning'  },
  { id: 'S-007', name: 'Industrial Zone',  x: 0.35, y: 0.72, status: 'normal'   },
  { id: 'S-008', name: 'Residential Park', x: 0.60, y: 0.72, status: 'warning'  },
  { id: 'S-009', name: 'North District',   x: 0.82, y: 0.72, status: 'normal'   },
];

const SENSOR_DETAILS = [
  { id: 'S-001', name: 'Upstream Bridge',  status: 'normal',   waterLevel: '2.3m',  rainfall: '5mm/hr',   lat: '14.5995', lng: '120.9842' },
  { id: 'S-002', name: 'Downtown Area',    status: 'normal',   waterLevel: '1.8m',  rainfall: '3.2mm/hr', lat: '14.599',  lng: '120.9838' },
  { id: 'S-003', name: 'East Riverside',   status: 'critical', waterLevel: '4.7m',  rainfall: '18.5mm/hr',lat: '14.5985', lng: '120.985'  },
  { id: 'S-004', name: 'South Bridge',     status: 'normal',   waterLevel: '2.1m',  rainfall: '4mm/hr',   lat: '14.598',  lng: '120.9845' },
  { id: 'S-005', name: 'North District',   status: 'warning',  waterLevel: '3.5m',  rainfall: '12mm/hr',  lat: '14.6321', lng: '120.9987' },
  { id: 'S-006', name: 'West Channel',     status: 'normal',   waterLevel: '2.4m',  rainfall: '6mm/hr',   lat: '14.6045', lng: '120.9845' },
  { id: 'S-007', name: 'Industrial Zone',  status: 'warning',  waterLevel: '3.2m',  rainfall: '9mm/hr',   lat: '14.602',  lng: '120.987'  },
  { id: 'S-008', name: 'Residential Park', status: 'normal',   waterLevel: '1.9m',  rainfall: '4.5mm/hr', lat: '14.595',  lng: '120.982'  },
];

const STATUS_COLOR = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
const STATUS_ICON = {
  normal:   'checkmark-circle' as const,
  warning:  'warning'          as const,
  critical: 'alert-circle'     as const,
};

// Full-screen map modal
function MapExpandModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const mw = width - 32;
  const mh = height * 0.55;
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={mm.overlay}>
        <TouchableOpacity style={mm.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={mm.sheet}>
          <View style={mm.header}>
            <Text style={mm.title}>Sensor Network Map</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <View style={[mm.mapArea, { height: mh }]}>
            {/* Grid */}
            {[0.25, 0.5, 0.75].map(p => <View key={`h${p}`} style={[mm.gridH, { top: mh * p }]} />)}
            {[0.25, 0.5, 0.75].map(p => <View key={`v${p}`} style={[mm.gridV, { left: mw * p }]} />)}
            <View style={[mm.river, { top: mh * 0.47 }]} />
            {/* Pins */}
            {SENSORS_MAP.map(sensor => (
              <TouchableOpacity
                key={sensor.id}
                style={[mm.pin, { left: mw * sensor.x - 22, top: mh * sensor.y - 22 }]}
                onPress={() => setSel(sel === sensor.id ? null : sensor.id)}
                activeOpacity={0.8}
              >
                <View style={[mm.pinCircle, { backgroundColor: STATUS_COLOR[sensor.status as keyof typeof STATUS_COLOR] }]}>
                  <Ionicons name="location" size={18} color="#fff" />
                </View>
                <Text style={mm.pinLabel}>{sensor.id}</Text>
                {sel === sensor.id && (
                  <View style={mm.tooltip}>
                    <Text style={mm.tooltipName}>{sensor.name}</Text>
                    <Text style={[mm.tooltipStatus, { color: STATUS_COLOR[sensor.status as keyof typeof STATUS_COLOR] }]}>
                      {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
  backdrop: { position: 'absolute', inset: 0 } as any,
  sheet: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  mapArea: { backgroundColor: '#e8f5e9', position: 'relative', overflow: 'hidden' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  river: { position: 'absolute', left: 0, right: 0, height: 8, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 4 },
  pin: { position: 'absolute', alignItems: 'center', zIndex: 2 },
  pinCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  pinLabel: { fontSize: 9, fontWeight: '700', color: '#1f2937', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  tooltip: { position: 'absolute', bottom: '100%', backgroundColor: '#fff', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6, zIndex: 10, minWidth: 110, alignItems: 'center', marginBottom: 4 },
  tooltipName: { fontSize: 11, fontWeight: '700', color: '#111827' },
  tooltipStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});

export default function MapScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedSensor, setExpandedSensor] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Map */}
      <View style={s.mapCard}>
        <View style={[s.mapArea, { height: MAP_H }]}>
          {[0.33, 0.66].map(p => <View key={`h${p}`} style={[s.gridH, { top: MAP_H * p }]} />)}
          {[0.25, 0.5, 0.75].map(p => <View key={`v${p}`} style={[s.gridV, { left: MAP_W * p }]} />)}
          <View style={s.river} />

          {SENSORS_MAP.map(sensor => (
            <TouchableOpacity
              key={sensor.id}
              style={[s.pin, { left: MAP_W * sensor.x - 22, top: MAP_H * sensor.y - 22 }]}
              onPress={() => setSelected(selected === sensor.id ? null : sensor.id)}
              activeOpacity={0.8}
            >
              <View style={[s.pinCircle, { backgroundColor: STATUS_COLOR[sensor.status as keyof typeof STATUS_COLOR] }]}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
              <Text style={s.pinLabel}>{sensor.id}</Text>
              {selected === sensor.id && (
                <View style={s.tooltip}>
                  <Text style={s.tooltipName}>{sensor.name}</Text>
                  <Text style={[s.tooltipStatus, { color: STATUS_COLOR[sensor.status as keyof typeof STATUS_COLOR] }]}>
                    {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Legend — bottom right */}
          <View style={s.legend}>
            <Text style={s.legendTitle}>Status Legend</Text>
            {(['normal', 'warning', 'critical'] as const).map(st => (
              <View key={st} style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: STATUS_COLOR[st] }]} />
                <Text style={s.legendText}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
              </View>
            ))}
          </View>

          {/* Expand button — top left */}
          <TouchableOpacity style={s.expandBtn} onPress={() => setMapExpanded(true)}>
            <Ionicons name="expand-outline" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sensor Network — expandable list */}
      <View style={s.card}>
        <View style={s.listHeader}>
          <View>
            <Text style={s.cardTitle}>Sensor Network</Text>
            <Text style={s.cardSub}>8 active sensors</Text>
          </View>
        </View>

        {SENSOR_DETAILS.map((sensor, i) => {
          const isOpen = expandedSensor === sensor.id;
          const statusColor = STATUS_COLOR[sensor.status as keyof typeof STATUS_COLOR];
          const isCritical = sensor.status === 'critical';
          const isWarning = sensor.status === 'warning';

          return (
            <View key={sensor.id} style={[s.sensorItem, i > 0 && s.sensorItemBorder]}>
              {/* Row header - tappable */}
              <TouchableOpacity
                style={s.sensorRow}
                onPress={() => setExpandedSensor(isOpen ? null : sensor.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={STATUS_ICON[sensor.status as keyof typeof STATUS_ICON]} size={22} color={statusColor} />
                <View style={s.sensorInfo}>
                  <Text style={s.sensorId}>{sensor.id}</Text>
                  <Text style={s.sensorName}>{sensor.name}</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
              </TouchableOpacity>

              {/* Expanded detail panel */}
              {isOpen && (
                <View style={[s.detailPanel, isCritical && s.detailPanelCritical, isWarning && s.detailPanelWarning]}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Water Level:</Text>
                    <Text style={[s.detailValue, isCritical && { color: '#ef4444', fontWeight: '700' }]}>{sensor.waterLevel}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Rainfall:</Text>
                    <Text style={s.detailValue}>{sensor.rainfall}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Location:</Text>
                    <Text style={s.detailValue}>{sensor.lat}, {sensor.lng}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Status:</Text>
                    <Text style={[s.detailStatus, { color: statusColor }]}>
                      {sensor.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <MapExpandModal visible={mapExpanded} onClose={() => setMapExpanded(false)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { padding: 14, gap: 14, paddingBottom: 32 },

  mapCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  mapArea: { backgroundColor: '#e8f5e9', position: 'relative', overflow: 'hidden' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  river: { position: 'absolute', top: '47%', left: 0, right: 0, height: 8, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 4 },
  pin: { position: 'absolute', alignItems: 'center', zIndex: 2 },
  pinCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  pinLabel: { fontSize: 9, fontWeight: '700', color: '#1f2937', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  tooltip: { position: 'absolute', bottom: '100%', backgroundColor: '#fff', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6, zIndex: 10, minWidth: 110, alignItems: 'center', marginBottom: 4 },
  tooltipName: { fontSize: 11, fontWeight: '700', color: '#111827' },
  tooltipStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  legend: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, gap: 4, zIndex: 5 },
  legendTitle: { fontSize: 10, fontWeight: '700', color: '#374151', marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#6b7280' },
  expandBtn: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, zIndex: 5 },

  card: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  listHeader: { paddingHorizontal: 16, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  sensorItem: { overflow: 'hidden' },
  sensorItemBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  sensorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sensorInfo: { flex: 1 },
  sensorId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sensorName: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  detailPanel: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, gap: 8,
  },
  detailPanelCritical: { backgroundColor: '#fff5f5' },
  detailPanelWarning:  { backgroundColor: '#fffdf0' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
  detailStatus: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});