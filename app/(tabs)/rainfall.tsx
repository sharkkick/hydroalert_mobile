import { View, Text, StyleSheet, ScrollView, Dimensions, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const CHART_W = width - 60;
const CHART_H = 160;
const PAD_L = 30; const PAD_B = 20; const PAD_T = 8; const PAD_R = 8;
const CW = CHART_W - PAD_L - PAD_R;
const CH = CHART_H - PAD_T - PAD_B;

const BAR_DATA = [2, 4, 6, 10, 13, 16, 22, 24, 20, 17, 12, 7];
const BAR_LABELS = ['00','02','04','06','08','10','12','14','16','18','20','22'];
const BAR_MAX = 24;
const BAR_Y_LABELS = [0, 6, 12, 18, 24];

const LINE_DATA = [0, 8, 22, 38, 48, 56, 60];
const LINE_LABELS = ['00:00','04:00','08:00','12:00','16:00','20:00','24:00'];
const LINE_MAX = 60;
const LINE_Y_LABELS = [0, 15, 30, 45, 60];

function bX(i: number, cw = CW) { return PAD_L + (i / BAR_DATA.length) * cw + 2; }
function bW(cw = CW) { return cw / BAR_DATA.length - 4; }
function bH(v: number, ch = CH) { return (v / BAR_MAX) * ch; }
function bTop(v: number, ch = CH) { return PAD_T + ch - bH(v, ch); }
function lX(i: number, cw = CW) { return PAD_L + (i / (LINE_DATA.length - 1)) * cw; }
function lY(v: number, ch = CH) { return PAD_T + (1 - v / LINE_MAX) * ch; }

const TABLE_DATA = [
  { id: 'S-001', loc: 'Upstream Bridge', current: 5,  total: 42, peak: 18, status: 'Light'    },
  { id: 'S-002', loc: 'East Riverside',  current: 12, total: 58, peak: 22, status: 'Heavy'    },
  { id: 'S-003', loc: 'North District',  current: 8,  total: 51, peak: 20, status: 'Moderate' },
  { id: 'S-004', loc: 'Industrial Zone', current: 9,  total: 48, peak: 19, status: 'Moderate' },
];
const STATUS_STYLE = {
  Light:    { bg: '#dcfce7', color: '#16a34a' },
  Moderate: { bg: '#fef9c3', color: '#ca8a04' },
  Heavy:    { bg: '#fee2e2', color: '#dc2626' },
};

// ── Shared modal components ──
function BaseModal({ visible, onClose, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject as any} onPress={onClose} activeOpacity={1} />
        <View style={m.sheet}>{children}</View>
      </View>
    </Modal>
  );
}
function MHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={m.header}>
      <Text style={m.title}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={22} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}

// ── Mini bar chart for modals ──
function MiniBarChart({ h = 180 }: { h?: number }) {
  const mch = h - PAD_T - PAD_B;
  const mcw = width - 130;
  return (
    <View style={{ width: mcw + PAD_L + PAD_R, height: h, position: 'relative', marginTop: 8 }}>
      {BAR_Y_LABELS.map(v => (
        <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: PAD_T + mch - (v / BAR_MAX) * mch - 6, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ width: PAD_L - 4, fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>{v}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
        </View>
      ))}
      {BAR_DATA.map((v, i) => (
        <View key={i} style={{ position: 'absolute', left: bX(i, mcw), top: bTop(v, mch), width: bW(mcw), height: bH(v, mch), backgroundColor: '#3b82f6', borderRadius: 2 }} />
      ))}
      {BAR_LABELS.map((l, i) => i % 2 === 0 && (
        <Text key={i} style={{ position: 'absolute', left: bX(i, mcw) - 2, top: h - PAD_B + 4, fontSize: 8, color: '#9ca3af', width: 22, textAlign: 'center' }}>{l}</Text>
      ))}
    </View>
  );
}

// ── Mini line chart for modals ──
function MiniLineChart({ h = 180 }: { h?: number }) {
  const mch = h - PAD_T - PAD_B;
  const mcw = width - 130;
  return (
    <View style={{ width: mcw + PAD_L + PAD_R, height: h, position: 'relative', marginTop: 8 }}>
      {LINE_Y_LABELS.map(v => (
        <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: lY(v, mch) - 6, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ width: PAD_L - 4, fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>{v}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
        </View>
      ))}
      {/* Area tint */}
      {LINE_DATA.slice(0, -1).map((d, i) => {
        const x1 = lX(i, mcw); const y1 = lY(d, mch); const x2 = lX(i + 1, mcw); const y2 = lY(LINE_DATA[i + 1], mch);
        const dx = x2 - x1; const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return <View key={i} style={{ position: 'absolute', left: x1, top: y1, width: len, height: 2.5, backgroundColor: '#3b82f6', transform: [{ rotate: `${angle}deg` }], transformOrigin: 'left center' }} />;
      })}
      {LINE_DATA.map((v, i) => <View key={i} style={{ position: 'absolute', left: lX(i, mcw) - 5, top: lY(v, mch) - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#3b82f6' }} />)}
      {LINE_LABELS.map((l, i) => (
        <Text key={i} style={{ position: 'absolute', left: lX(i, mcw) - 20, top: h - PAD_B + 4, fontSize: 8, color: '#9ca3af', width: 40, textAlign: 'center' }}>{l}</Text>
      ))}
    </View>
  );
}

// ── Modal 1: Current Average ──
function AvgModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="Current Average Rainfall - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.mv, { color: '#0891b2' }]}>8.5mm/hr</Text>
          <Text style={[m.ml, { color: '#0891b2' }]}>Current Average</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.mv, { color: '#2563eb' }]}>+2.3mm/hr</Text>
          <Text style={[m.ml, { color: '#2563eb' }]}>1h Change</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.mv, { color: '#d97706' }]}>Moderate</Text>
          <Text style={[m.ml, { color: '#d97706' }]}>Classification</Text>
        </View>
      </View>
      <View style={m.table}>
        <View style={m.thead}>
          <Text style={[m.th, { flex: 1 }]}>Sensor ID</Text>
          <Text style={[m.th, { flex: 1.8 }]}>Location</Text>
          <Text style={[m.th, { flex: 1.4 }]}>Peak (mm/hr)</Text>
          <Text style={[m.th, { flex: 1.2 }]}>Status</Text>
        </View>
        {[
          { id: 'S-001', loc: 'Upstream Bridge', peak: '5mm/hr',  status: 'Light'    },
          { id: 'S-003', loc: 'East Riverside',  peak: '12mm/hr', status: 'Heavy'    },
          { id: 'S-005', loc: 'North District',  peak: '8mm/hr',  status: 'Moderate' },
          { id: 'S-007', loc: 'Industrial Zone', peak: '9mm/hr',  status: 'Moderate' },
        ].map((r, i) => {
          const st = STATUS_STYLE[r.status as keyof typeof STATUS_STYLE];
          return (
            <View key={r.id} style={[m.trow, i % 2 === 1 && m.talt]}>
              <Text style={[m.td, { flex: 1, fontWeight: '700' }]}>{r.id}</Text>
              <Text style={[m.td, { flex: 1.8 }]}>{r.loc}</Text>
              <Text style={[m.td, { flex: 1.4 }]}>{r.peak}</Text>
              <View style={{ flex: 1.2 }}><View style={[m.pill, { backgroundColor: st.bg }]}><Text style={[m.pillT, { color: st.color }]}>{r.status}</Text></View></View>
            </View>
          );
        })}
      </View>
    </BaseModal>
  );
}

// ── Modal 2: 24h Accumulation ──
function AccumModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="24h Accumulation - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.ml, { color: '#2563eb' }]}>24h Total</Text>
          <Text style={[m.mv, { color: '#2563eb' }]}>58mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.ml, { color: '#0891b2' }]}>12h Total</Text>
          <Text style={[m.mv, { color: '#0891b2' }]}>35mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.ml, { color: '#dc2626' }]}>6h Total</Text>
          <Text style={[m.mv, { color: '#dc2626' }]}>18mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.ml, { color: '#16a34a' }]}>1h Total</Text>
          <Text style={[m.mv, { color: '#16a34a' }]}>8mm</Text>
        </View>
      </View>
      <MiniLineChart h={220} />
    </BaseModal>
  );
}

// ── Modal 3: Peak Intensity ──
function PeakModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="Peak Intensity - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.mv, { color: '#0891b2' }]}>22mm/hr</Text>
          <Text style={[m.ml, { color: '#0891b2' }]}>Peak Intensity</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.mv, { color: '#2563eb' }]}>12:00</Text>
          <Text style={[m.ml, { color: '#2563eb' }]}>Time Occurred</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.mv, { color: '#d97706', fontSize: 16 }]}>East Riverside</Text>
          <Text style={[m.ml, { color: '#d97706' }]}>Location</Text>
        </View>
      </View>
      <View style={m.table}>
        <View style={m.thead}>
          <Text style={[m.th, { flex: 1 }]}>Sensor ID</Text>
          <Text style={[m.th, { flex: 2 }]}>Location</Text>
          <Text style={[m.th, { flex: 1.5, textAlign: 'right' }]}>Peak (mm/hr)</Text>
        </View>
        {[
          { id: 'S-003', loc: 'East Riverside',  peak: '22mm/hr' },
          { id: 'S-005', loc: 'North District',  peak: '20mm/hr' },
          { id: 'S-007', loc: 'Industrial Zone', peak: '19mm/hr' },
          { id: 'S-001', loc: 'Upstream Bridge', peak: '18mm/hr' },
        ].map((r, i) => (
          <View key={r.id} style={[m.trow, i % 2 === 1 && m.talt]}>
            <Text style={[m.td, { flex: 1, fontWeight: '700' }]}>{r.id}</Text>
            <Text style={[m.td, { flex: 2 }]}>{r.loc}</Text>
            <Text style={[m.td, { flex: 1.5, textAlign: 'right', fontWeight: '700' }]}>{r.peak}</Text>
          </View>
        ))}
      </View>
    </BaseModal>
  );
}

// ── Modal 4: Alerts ──
function AlertsModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="Heavy Rain Alerts - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.mv, { color: '#dc2626' }]}>2</Text>
          <Text style={[m.ml, { color: '#dc2626' }]}>Heavy Rain</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fffbeb' }]}>
          <Text style={[m.mv, { color: '#d97706' }]}>2</Text>
          <Text style={[m.ml, { color: '#d97706' }]}>Moderate Rain</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.mv, { color: '#16a34a' }]}>0</Text>
          <Text style={[m.ml, { color: '#16a34a' }]}>Light Rain</Text>
        </View>
      </View>
      <Text style={m.sectionLabel}>Sensor</Text>
      <View style={m.alertCard}>
        <Text style={m.alertCardTitle}>S-003 - East Riverside</Text>
        <Text style={m.alertCardDesc}>Water level exceeded critical threshold (4.2m)</Text>
        <Text style={m.alertCardMeta}>12mm/hr</Text>
      </View>
      <View style={[m.alertCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a', marginTop: 8 }]}>
        <Text style={m.alertCardTitle}>S-005 - North District</Text>
        <Text style={[m.alertCardDesc, { color: '#92400e' }]}>Heavy rainfall rate approaching warning threshold</Text>
        <Text style={[m.alertCardMeta, { color: '#d97706' }]}>8mm/hr</Text>
      </View>
    </BaseModal>
  );
}

// ── Modal 5: Bar chart expanded ──
function BarExpandModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="Rainfall Intensity - Expanded View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.ml, { color: '#2563eb' }]}>Current</Text>
          <Text style={[m.mv, { color: '#2563eb' }]}>5mm/hr</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.ml, { color: '#0891b2' }]}>Min (24h)</Text>
          <Text style={[m.mv, { color: '#0891b2' }]}>2mm/hr</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.ml, { color: '#dc2626' }]}>Max (24h)</Text>
          <Text style={[m.mv, { color: '#dc2626' }]}>24mm/hr</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.ml, { color: '#16a34a' }]}>Avg (24h)</Text>
          <Text style={[m.mv, { color: '#16a34a' }]}>8.5mm/hr</Text>
        </View>
      </View>
      <MiniBarChart h={220} />
    </BaseModal>
  );
}

// ── Modal 6: Line chart expanded (same as Modal 2 content) ──
function LineExpandModal({ visible, onClose }: any) {
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <MHeader title="24h Accumulation - Detailed View" onClose={onClose} />
      <View style={m.statRow}>
        <View style={[m.ms, { backgroundColor: '#eff6ff' }]}>
          <Text style={[m.ml, { color: '#2563eb' }]}>24h Total</Text>
          <Text style={[m.mv, { color: '#2563eb' }]}>58mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#ecfeff' }]}>
          <Text style={[m.ml, { color: '#0891b2' }]}>12h Total</Text>
          <Text style={[m.mv, { color: '#0891b2' }]}>35mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#fee2e2' }]}>
          <Text style={[m.ml, { color: '#dc2626' }]}>6h Total</Text>
          <Text style={[m.mv, { color: '#dc2626' }]}>18mm</Text>
        </View>
        <View style={[m.ms, { backgroundColor: '#dcfce7' }]}>
          <Text style={[m.ml, { color: '#16a34a' }]}>1h Total</Text>
          <Text style={[m.mv, { color: '#16a34a' }]}>8mm</Text>
        </View>
      </View>
      <MiniLineChart h={220} />
    </BaseModal>
  );
}

// ── Inline charts ──
function BarChart({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ width: CHART_W, height: CHART_H, position: 'relative' }}>
        {BAR_Y_LABELS.map(v => (
          <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: PAD_T + CH - (v / BAR_MAX) * CH - 6, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={ch.yLabel}>{v}</Text>
            <View style={ch.gridLine} />
          </View>
        ))}
        {BAR_DATA.map((v, i) => (
          <View key={i} style={{ position: 'absolute', left: bX(i), top: bTop(v), width: bW(), height: bH(v), backgroundColor: '#6366f1', borderRadius: 2 }} />
        ))}
        {BAR_LABELS.map((l, i) => i % 2 === 0 && (
          <Text key={i} style={[ch.xLabel, { left: bX(i) - 2, top: CHART_H - PAD_B + 4 }]}>{l}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

function LineChart({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ width: CHART_W, height: CHART_H, position: 'relative' }}>
        {LINE_Y_LABELS.map(v => (
          <View key={v} style={{ position: 'absolute', left: 0, right: 0, top: lY(v) - 6, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={ch.yLabel}>{v}</Text>
            <View style={ch.gridLine} />
          </View>
        ))}
        {LINE_DATA.slice(0, -1).map((d, i) => {
          const x1 = lX(i); const y1 = lY(d); const x2 = lX(i + 1); const y2 = lY(LINE_DATA[i + 1]);
          const dx = x2 - x1; const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return <View key={i} style={{ position: 'absolute', left: x1, top: y1, width: len, height: 2.5, backgroundColor: '#3b82f6', transform: [{ rotate: `${angle}deg` }], transformOrigin: 'left center' }} />;
        })}
        {LINE_DATA.map((v, i) => <View key={i} style={{ position: 'absolute', left: lX(i) - 5, top: lY(v) - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#3b82f6' }} />)}
        {LINE_LABELS.map((l, i) => (
          <Text key={i} style={[ch.xLabelWide, { left: lX(i) - 20, top: CHART_H - PAD_B + 4 }]}>{l}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function RainfallScreen() {
  const [avgModal, setAvgModal] = useState(false);
  const [accumModal, setAccumModal] = useState(false);
  const [peakModal, setPeakModal] = useState(false);
  const [alertsModal, setAlertsModal] = useState(false);
  const [barExpand, setBarExpand] = useState(false);
  const [lineExpand, setLineExpand] = useState(false);

  const STAT_CARDS = [
    { label: 'Current Avg',  value: '8.5mm/hr', iconBg: '#eff6ff', icon: <Ionicons name="pulse" size={20} color="#3b82f6" />,                                          onPress: () => setAvgModal(true) },
    { label: '24h Total',    value: '58mm',      iconBg: '#ecfeff', icon: <Ionicons name="water-outline" size={20} color="#06b6d4" />,                                  onPress: () => setAccumModal(true) },
    { label: 'Peak',         value: '22mm/hr',   iconBg: '#fffbeb', icon: <MaterialCommunityIcons name="weather-pouring" size={20} color="#f59e0b" />,                  onPress: () => setPeakModal(true) },
    { label: 'Alerts',       value: '2',         iconBg: '#fee2e2', icon: <Ionicons name="warning-outline" size={20} color="#ef4444" />,                                onPress: () => setAlertsModal(true) },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      <View style={s.statsGrid}>
        {STAT_CARDS.map(card => (
          <TouchableOpacity key={card.label} style={s.statCard} onPress={card.onPress} activeOpacity={0.7}>
            <View style={s.statTop}>
              <Text style={s.statLabel}>{card.label}</Text>
              <View style={[s.statIconBox, { backgroundColor: card.iconBg }]}>{card.icon}</View>
            </View>
            <Text style={s.statValue}>{card.value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Rainfall Intensity (mm/hr)</Text>
        <View style={{ marginTop: 10, overflow: 'hidden' }}>
          <BarChart onPress={() => setBarExpand(true)} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>24h Cumulative Rainfall (mm)</Text>
        <View style={{ marginTop: 10, overflow: 'hidden' }}>
          <LineChart onPress={() => setLineExpand(true)} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Sensor Rainfall Data</Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 1.2 }]}>SENSOR</Text>
          <Text style={[s.th, { flex: 2 }]}>LOCATION</Text>
          <Text style={[s.th, { flex: 0.8 }]}>NOW</Text>
          <Text style={[s.th, { flex: 0.8 }]}>24H</Text>
          <Text style={[s.th, { flex: 1.4 }]}>STATUS</Text>
        </View>
        {TABLE_DATA.map((row, i) => (
          <View key={row.id}>
            {i > 0 && <View style={s.divider} />}
            <View style={s.tableRow}>
              <Text style={[s.td, { flex: 1.2, fontWeight: '700', color: '#111827' }]}>{row.id}</Text>
              <Text style={[s.td, { flex: 2 }]} numberOfLines={1}>{row.loc}</Text>
              <Text style={[s.td, { flex: 0.8, fontWeight: '700', color: '#111827' }]}>{row.current}</Text>
              <Text style={[s.td, { flex: 0.8 }]}>{row.total}</Text>
              <View style={{ flex: 1.4 }}>
                <View style={[s.statusPill, { backgroundColor: STATUS_STYLE[row.status as keyof typeof STATUS_STYLE].bg }]}>
                  <Text style={[s.statusText, { color: STATUS_STYLE[row.status as keyof typeof STATUS_STYLE].color }]}>{row.status}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      <AvgModal      visible={avgModal}    onClose={() => setAvgModal(false)} />
      <AccumModal    visible={accumModal}  onClose={() => setAccumModal(false)} />
      <PeakModal     visible={peakModal}   onClose={() => setPeakModal(false)} />
      <AlertsModal   visible={alertsModal} onClose={() => setAlertsModal(false)} />
      <BarExpandModal visible={barExpand}  onClose={() => setBarExpand(false)} />
      <LineExpandModal visible={lineExpand} onClose={() => setLineExpand(false)} />
    </ScrollView>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 16 },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 18, width: '100%', maxWidth: 480, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  ms: { flex: 1, minWidth: 70, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  mv: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  ml: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  table: { backgroundColor: '#f9fafb', borderRadius: 12, overflow: 'hidden' },
  thead: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3f4f6' },
  th: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  trow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  talt: { backgroundColor: '#f9fafb' },
  td: { fontSize: 13, color: '#374151' },
  pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  pillT: { fontSize: 10, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8, letterSpacing: 0.3 },
  alertCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fecaca' },
  alertCardTitle: { fontSize: 14, fontWeight: '700', color: '#dc2626', marginBottom: 4 },
  alertCardDesc: { fontSize: 13, color: '#991b1b', marginBottom: 3 },
  alertCardMeta: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
});

const ch = StyleSheet.create({
  yLabel: { width: PAD_L - 4, fontSize: 9, color: '#9ca3af', textAlign: 'right' },
  gridLine: { flex: 1, height: 1, backgroundColor: '#f0f0f0' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#3b82f6' },
  xLabel: { position: 'absolute', fontSize: 8, color: '#9ca3af', width: 16, textAlign: 'center' },
  xLabelWide: { position: 'absolute', fontSize: 8, color: '#9ca3af', width: 40, textAlign: 'center' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { padding: 14, gap: 14, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: (width - 38) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  statIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6', marginTop: 10 },
  th: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: '#f9fafb' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  td: { fontSize: 12, color: '#374151' },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '600' },
});