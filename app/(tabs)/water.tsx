import { View, Text, StyleSheet, ScrollView, Dimensions, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const CHART_W = width - 60;
const CHART_H = 160;

const DATA = [1.8, 2.0, 2.2, 2.5, 2.8, 3.1, 3.4, 3.6, 3.8, 3.7, 3.5, 3.3];
const X_LABELS = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
const SHOWN_X = [0, 2, 4, 6, 8, 10, 11];
const Y_LABELS = [0, 2, 4, 6];
const MAX_V = 6.5;
const PAD_L = 36; const PAD_B = 20; const PAD_T = 8; const PAD_R = 8;
const CW = CHART_W - PAD_L - PAD_R;
const CH = CHART_H - PAD_T - PAD_B;

function toX(i: number, total = DATA.length, cw = CW) { return PAD_L + (i / (total - 1)) * cw; }
function toY(v: number, ch = CH) { return PAD_T + (1 - v / MAX_V) * ch; }

const SENSORS = [
  { id: 'S-001', name: 'Upstream Bridge', value: 2.3, max: 4, change: '+0.2m', changeColor: '#3b82f6', barColor: '#3b82f6', trend: 'up',   critical: false, battery: 85,  status: 'NORMAL'   },
  { id: 'S-002', name: 'Downtown Area',   value: 2.1, max: 4, change: '0.0m',  changeColor: '#6b7280', barColor: '#3b82f6', trend: 'flat', critical: false, battery: 72,  status: 'NORMAL'   },
  { id: 'S-003', name: 'East Riverside',  value: 4.2, max: 4, change: '+0.8m', changeColor: '#ef4444', barColor: '#ef4444', trend: 'up',   critical: true,  battery: 91,  status: 'CRITICAL' },
  { id: 'S-004', name: 'South Bridge',    value: 1.8, max: 4, change: '-0.1m', changeColor: '#16a34a', barColor: '#3b82f6', trend: 'down', critical: false, battery: 60,  status: 'NORMAL'   },
  { id: 'S-005', name: 'North District',  value: 3.5, max: 4, change: '+0.4m', changeColor: '#3b82f6', barColor: '#3b82f6', trend: 'up',   critical: false, battery: 78,  status: 'WARNING'  },
  { id: 'S-006', name: 'West Channel',    value: 2.4, max: 4, change: '0.0m',  changeColor: '#16a34a', barColor: '#3b82f6', trend: 'up',   critical: false, battery: 55,  status: 'NORMAL'   },
];

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={m.header}>
      <Text style={m.title}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={22} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}

function BaseModal({ visible, onClose, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <TouchableOpacity style={m.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={m.sheet}>{children}</View>
      </View>
    </Modal>
  );
}

// Modal 1: Average Water Level
function AverageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <ModalHeader title="Average Water Level - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.miniStat, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.miniVal, { color: '#0891b2' }]}>2.72m</Text>
          <Text style={[m.miniLabel, { color: '#0891b2' }]}>Current Average</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.miniVal, { color: '#2563eb' }]}>+0.4m</Text>
          <Text style={[m.miniLabel, { color: '#2563eb' }]}>24h Change</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.miniVal, { color: '#d97706' }]}>4.0m</Text>
          <Text style={[m.miniLabel, { color: '#d97706' }]}>Critical{'\n'}Threshold</Text>
        </View>
      </View>
      <View style={m.table}>
        <View style={m.tableHead}>
          <Text style={[m.th, { flex: 1 }]}>ID</Text>
          <Text style={[m.th, { flex: 2.2 }]}>Location</Text>
          <Text style={[m.th, { flex: 1, textAlign: 'right' }]}>Level</Text>
        </View>
        {SENSORS.map((s, i) => (
          <View key={s.id} style={[m.tableRow, i % 2 === 1 && m.rowAlt]}>
            <Text style={[m.td, { flex: 1, fontWeight: '700' }]}>{s.id}</Text>
            <Text style={[m.td, { flex: 2.2 }]}>{s.name}</Text>
            <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }]}>
              <Text style={[m.td, { fontWeight: '700', color: s.critical ? '#ef4444' : '#111827' }]}>{s.value}m</Text>
              {(s.trend === 'up') && <Ionicons name="trending-up" size={12} color={s.critical ? '#ef4444' : '#3b82f6'} />}
            </View>
          </View>
        ))}
      </View>
    </BaseModal>
  );
}

// Modal 2: Above Threshold
function AboveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
    NORMAL:   { bg: '#dcfce7', color: '#16a34a' },
    WARNING:  { bg: '#fef9c3', color: '#ca8a04' },
    CRITICAL: { bg: '#fee2e2', color: '#dc2626' },
  };
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <ModalHeader title="Above Threshold - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.miniStat, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.miniVal, { color: '#dc2626' }]}>1</Text>
          <Text style={[m.miniLabel, { color: '#dc2626' }]}>Above{'\n'}Threshold</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.miniVal, { color: '#d97706' }]}>1</Text>
          <Text style={[m.miniLabel, { color: '#d97706' }]}>Warning{'\n'}Range</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.miniVal, { color: '#16a34a' }]}>4</Text>
          <Text style={[m.miniLabel, { color: '#16a34a' }]}>Normal{'\n'}Range</Text>
        </View>
      </View>
      <View style={m.table}>
        <View style={m.tableHead}>
          <Text style={[m.th, { flex: 1 }]}>ID</Text>
          <Text style={[m.th, { flex: 1.8 }]}>Location</Text>
          <Text style={[m.th, { flex: 1.8 }]}>Message</Text>
          <Text style={[m.th, { flex: 1.2 }]}>Status</Text>
          <Text style={[m.th, { flex: 0.9, textAlign: 'right' }]}>Level</Text>
        </View>
        {SENSORS.map((s, i) => {
          const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.NORMAL;
          const msg = s.status === 'CRITICAL' ? `Exceeded by ${(s.value - s.max).toFixed(1)}m` : 'Heavy rainfall detected';
          return (
            <View key={s.id} style={[m.tableRow, i % 2 === 1 && m.rowAlt]}>
              <Text style={[m.td, { flex: 1, fontWeight: '700' }]}>{s.id}</Text>
              <Text style={[m.td, { flex: 1.8 }]} numberOfLines={2}>{s.name}</Text>
              <Text style={[m.td, { flex: 1.8, fontSize: 11 }]} numberOfLines={2}>{msg}</Text>
              <View style={{ flex: 1.2, alignItems: 'flex-start' }}>
                <View style={[m.pill, { backgroundColor: cfg.bg }]}>
                  <Text style={[m.pillText, { color: cfg.color }]}>{s.status}</Text>
                </View>
              </View>
              <Text style={[m.td, { flex: 0.9, textAlign: 'right', fontWeight: '700', color: s.critical ? '#ef4444' : '#111827' }]}>{s.value}m</Text>
            </View>
          );
        })}
      </View>
    </BaseModal>
  );
}

// Modal 3: Highest Reading
function HighestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const sorted = [...SENSORS].sort((a, b) => b.value - a.value);
  const highest = sorted[0].value;
  const lowest = sorted[sorted.length - 1].value;
  const range = (highest - lowest).toFixed(1);
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <ModalHeader title="Highest Reading - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.miniStat, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.miniVal, { color: '#d97706' }]}>{highest}m</Text>
          <Text style={[m.miniLabel, { color: '#d97706' }]}>Highest Level</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.miniVal, { color: '#2563eb' }]}>{lowest}m</Text>
          <Text style={[m.miniLabel, { color: '#2563eb' }]}>Lowest Level</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.miniVal, { color: '#0891b2' }]}>{range}m</Text>
          <Text style={[m.miniLabel, { color: '#0891b2' }]}>Range</Text>
        </View>
      </View>
      <View style={m.table}>
        <View style={m.tableHead}>
          <Text style={[m.th, { flex: 1 }]}>Sensor ID</Text>
          <Text style={[m.th, { flex: 2 }]}>Location</Text>
          <Text style={[m.th, { flex: 1, textAlign: 'right' }]}>Water Level</Text>
        </View>
        {sorted.map((s, i) => (
          <View key={s.id} style={[m.tableRow, i % 2 === 1 && m.rowAlt]}>
            <Text style={[m.td, { flex: 1, fontWeight: '700' }]}>{s.id}</Text>
            <Text style={[m.td, { flex: 2 }]}>{s.name}</Text>
            <Text style={[m.td, { flex: 1, textAlign: 'right', fontWeight: '700', color: s.value === highest ? '#ef4444' : '#111827' }]}>{s.value}m</Text>
          </View>
        ))}
      </View>
    </BaseModal>
  );
}

// Modal 4: Chart Expanded View
function ChartModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const cw = width - 80;
  const ch2 = 200;
  const pcw = cw - PAD_L - PAD_R;
  const pch = ch2 - PAD_T - 24;
  function tx(i: number) { return PAD_L + (i / (DATA.length - 1)) * pcw; }
  function ty(v: number) { return PAD_T + (1 - v / MAX_V) * pch; }
  const thY = ty(4.0);
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <ModalHeader title="24-Hour Water Level Trend - Expanded View" onClose={onClose} />
      <View style={{ width: cw, height: ch2, position: 'relative', marginVertical: 8 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(v => (
          <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: ty(v) - 6, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ width: PAD_L - 4, fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>{v}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
          </View>
        ))}
        <View style={{ position: 'absolute', left: PAD_L, right: PAD_R, top: thY, height: 1.5, backgroundColor: '#ef4444', opacity: 0.8 }} />
        {DATA.slice(0, -1).map((d, i) => {
          const x1 = tx(i); const y1 = ty(d); const x2 = tx(i + 1); const y2 = ty(DATA[i + 1]);
          const dx = x2 - x1; const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return <View key={i} style={{ position: 'absolute', left: x1, top: y1, width: len, height: 2.5, backgroundColor: '#3b82f6', transform: [{ rotate: `${angle}deg` }], transformOrigin: 'left center' }} />;
        })}
        {DATA.map((d, i) => <View key={i} style={{ position: 'absolute', left: tx(i) - 5, top: ty(d) - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#3b82f6' }} />)}
        {[0, 2, 4, 6, 8, 10, 11].map(i => (
          <Text key={i} style={{ position: 'absolute', left: tx(i) - 16, top: ch2 - 16, fontSize: 8, color: '#9ca3af', width: 32, textAlign: 'center' }}>{X_LABELS[i]}</Text>
        ))}
      </View>
      <View style={m.statRow}>
        <View style={[m.miniStat, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.miniLabel, { color: '#2563eb' }]}>Current Level</Text>
          <Text style={[m.miniVal, { color: '#2563eb' }]}>2.8m</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.miniLabel, { color: '#dc2626' }]}>Max (24h)</Text>
          <Text style={[m.miniVal, { color: '#dc2626' }]}>3.2m</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.miniLabel, { color: '#16a34a' }]}>Min (24h)</Text>
          <Text style={[m.miniVal, { color: '#16a34a' }]}>1.8m</Text>
        </View>
      </View>
    </BaseModal>
  );
}

// Modal 5: Sensor Detail
function SensorModal({ sensor, visible, onClose }: { sensor: typeof SENSORS[0] | null; visible: boolean; onClose: () => void }) {
  if (!sensor) return null;
  const dist = (sensor.value - sensor.max).toFixed(1);
  const distStr = parseFloat(dist) >= 0 ? `+${dist}m` : `${dist}m`;
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <ModalHeader title={`${sensor.id} - ${sensor.name}`} onClose={onClose} />
      <View style={[m.statRow, { marginBottom: 12 }]}>
        <View style={[m.miniStat, { backgroundColor: '#eff6ff', flex: 1 }]}>
          <Text style={[m.miniLabel, { color: '#2563eb' }]}>Current Level</Text>
          <Text style={[m.miniVal, { color: '#2563eb', fontSize: 28 }]}>{sensor.value}m</Text>
        </View>
        <View style={[m.miniStat, { backgroundColor: '#ecfeff', flex: 1 }]}>
          <Text style={[m.miniLabel, { color: '#0891b2' }]}>1hr Change</Text>
          <Text style={[m.miniVal, { color: '#0891b2', fontSize: 28 }]}>{sensor.change}</Text>
        </View>
      </View>
      <View style={m.metaRow}>
        {[
          { label: 'Battery',               value: `${sensor.battery}%` },
          { label: 'Status',                value: sensor.status },
          { label: 'Critical Threshold',    value: `${sensor.max}m` },
          { label: 'Distance to Threshold', value: distStr },
        ].map(item => (
          <View key={item.label} style={m.metaItem}>
            <Text style={m.metaLabel}>{item.label}</Text>
            <Text style={[m.metaValue, item.label === 'Status' && sensor.status === 'CRITICAL' && { color: '#dc2626' }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      {sensor.critical && (
        <View style={m.alertBanner}>
          <Ionicons name="warning" size={18} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={m.alertBannerTitle}>CRITICAL ALERT</Text>
            <Text style={m.alertBannerText}>Water level has exceeded the critical threshold. Immediate action required.</Text>
          </View>
        </View>
      )}
      {sensor.status === 'WARNING' && (
        <View style={[m.alertBanner, m.alertBannerWarning]}>
          <Ionicons name="warning-outline" size={18} color="#d97706" />
          <View style={{ flex: 1 }}>
            <Text style={[m.alertBannerTitle, { color: '#d97706' }]}>WARNING</Text>
            <Text style={[m.alertBannerText, { color: '#92400e' }]}>Water level is approaching the critical threshold. Monitor closely.</Text>
          </View>
        </View>
      )}
    </BaseModal>
  );
}

function LineChart({ onPress }: { onPress: () => void }) {
  const thresholdY = toY(4.0);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ width: CHART_W, height: CHART_H, position: 'relative' }}>
        {Y_LABELS.map(v => (
          <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: toY(v) - 6, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ width: PAD_L - 4, fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>{v}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
          </View>
        ))}
        <View style={{ position: 'absolute', left: PAD_L, right: PAD_R, top: thresholdY, height: 1.5, backgroundColor: '#ef4444', opacity: 0.7 }} />
        {DATA.slice(0, -1).map((d, i) => {
          const x1 = toX(i); const y1 = toY(d); const x2 = toX(i + 1); const y2 = toY(DATA[i + 1]);
          const dx = x2 - x1; const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return <View key={i} style={{ position: 'absolute', left: x1, top: y1, width: len, height: 2.5, backgroundColor: '#3b82f6', transform: [{ rotate: `${angle}deg` }], transformOrigin: 'left center' }} />;
        })}
        {DATA.map((d, i) => <View key={i} style={{ position: 'absolute', left: toX(i) - 4, top: toY(d) - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, borderColor: '#3b82f6' }} />)}
        {SHOWN_X.map(i => (
          <Text key={i} style={{ position: 'absolute', left: toX(i) - 16, top: CHART_H - PAD_B + 4, fontSize: 8, color: '#9ca3af', width: 32, textAlign: 'center' }}>{X_LABELS[i]}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function WaterScreen() {
  const [avgModal, setAvgModal] = useState(false);
  const [aboveModal, setAboveModal] = useState(false);
  const [highestModal, setHighestModal] = useState(false);
  const [chartModal, setChartModal] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<typeof SENSORS[0] | null>(null);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Stat Cards */}
      <View style={s.statsRow}>
        {[
          { label: 'Average', value: '2.72m', iconBg: '#ecfeff', icon: <Ionicons name="water-outline" size={20} color="#06b6d4" />, onPress: () => setAvgModal(true) },
          { label: 'Above',   value: '1',     iconBg: '#fef2f2', icon: <Ionicons name="trending-up"   size={20} color="#ef4444" />, onPress: () => setAboveModal(true) },
          { label: 'Highest', value: '4.2m',  iconBg: '#fffbeb', icon: <Ionicons name="water"         size={20} color="#f59e0b" />, onPress: () => setHighestModal(true) },
        ].map(card => (
          <TouchableOpacity key={card.label} style={s.statCard} onPress={card.onPress} activeOpacity={0.7}>
            <View style={[s.statIconBox, { backgroundColor: card.iconBg }]}>{card.icon}</View>
            <Text style={s.statLabel}>{card.label}</Text>
            <Text style={s.statValue}>{card.value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>24-Hour Water Level Trend</Text>
        <Text style={s.cardSub}>Sensor S-003 (East Riverside)</Text>
        <View style={{ marginTop: 10, overflow: 'hidden' }}>
          <LineChart onPress={() => setChartModal(true)} />
        </View>
        <View style={s.thresholdLabel}>
          <View style={s.thresholdDash} />
          <Text style={s.thresholdText}>Critical Threshold (4.0m)</Text>
        </View>
      </View>

      {/* Sensor Grid */}
      <View style={s.sensorGrid}>
        {SENSORS.map(sensor => {
          const pct = Math.min((sensor.value / sensor.max) * 100, 100);
          return (
            <TouchableOpacity key={sensor.id} style={[s.sensorCard, sensor.critical && s.sensorCardCritical]} onPress={() => setSelectedSensor(sensor)} activeOpacity={0.7}>
              <View style={s.sensorTop}>
                <View>
                  <Text style={s.sensorId}>{sensor.id}</Text>
                  <Text style={s.sensorName}>{sensor.name}</Text>
                </View>
                <Ionicons name={sensor.trend === 'flat' ? 'remove' : sensor.trend === 'up' ? 'trending-up' : 'trending-down'} size={18} color={sensor.changeColor} />
              </View>
              <View style={s.sensorReading}>
                <Text style={s.sensorValue}>{sensor.value}m</Text>
                <Text style={s.sensorMax}>/ {sensor.max}m</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: sensor.barColor }]} />
              </View>
              <View style={s.sensorFooter}>
                <Text style={s.changeLabel}>Change (1hr)</Text>
                <Text style={[s.changeValue, { color: sensor.changeColor }]}>{sensor.change}</Text>
              </View>
              {sensor.critical && <View style={s.criticalBadge}><Text style={s.criticalText}>CRITICAL</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      <AverageModal  visible={avgModal}     onClose={() => setAvgModal(false)} />
      <AboveModal    visible={aboveModal}   onClose={() => setAboveModal(false)} />
      <HighestModal  visible={highestModal} onClose={() => setHighestModal(false)} />
      <ChartModal    visible={chartModal}   onClose={() => setChartModal(false)} />
      <SensorModal   sensor={selectedSensor} visible={!!selectedSensor} onClose={() => setSelectedSensor(null)} />
    </ScrollView>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 16 },
  backdrop: { position: 'absolute', inset: 0 } as any,
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 480, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  miniStat: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  miniVal: { fontSize: 22, fontWeight: '700' },
  miniLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  table: { backgroundColor: '#f9fafb', borderRadius: 12, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3f4f6' },
  th: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  rowAlt: { backgroundColor: '#f9fafb' },
  td: { fontSize: 13, color: '#374151' },
  pill: { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 9, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, gap: 10 },
  metaItem: { width: '45%' },
  metaLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  alertBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  alertBannerWarning: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  alertBannerTitle: { fontSize: 12, fontWeight: '800', color: '#dc2626', letterSpacing: 0.3, marginBottom: 3 },
  alertBannerText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { padding: 14, gap: 14, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  thresholdLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  thresholdDash: { width: 20, height: 2, backgroundColor: '#ef4444' },
  thresholdText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sensorCard: { width: (width - 38) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sensorCardCritical: { borderWidth: 1.5, borderColor: '#fca5a5' },
  sensorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sensorId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sensorName: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  sensorReading: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  sensorValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  sensorMax: { fontSize: 12, color: '#9ca3af' },
  barTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  sensorFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  changeLabel: { fontSize: 11, color: '#9ca3af' },
  changeValue: { fontSize: 12, fontWeight: '700' },
  criticalBadge: { backgroundColor: '#fee2e2', borderRadius: 6, paddingVertical: 4, alignItems: 'center' },
  criticalText: { fontSize: 10, fontWeight: '700', color: '#dc2626', letterSpacing: 0.5 },
});