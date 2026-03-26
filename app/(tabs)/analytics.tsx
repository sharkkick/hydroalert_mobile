import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const CHART_W   = width - 80;

const SENSORS = [
  { id: 'S-001', label: 'Medicion II-F · Palengke',   water: 2.3, rainfall: 5,  status: 'normal'   },
  { id: 'S-002', label: 'Medicion II-F · Riverside',  water: 2.8, rainfall: 12, status: 'warning'  },
  { id: 'S-003', label: 'Pag-asa III · Low-lying St', water: 4.2, rainfall: 22, status: 'critical' },
  { id: 'S-004', label: 'Pag-asa III · Perimeter Rd', water: 1.8, rainfall: 3,  status: 'normal'   },
  { id: 'S-005', label: 'Malagasang I-G · Canal',     water: 3.5, rainfall: 15, status: 'warning'  },
];

const HISTORY: Record<string, { hour: string; water: number; rainfall: number }[]> = {
  'S-001': [
    { hour: '12am', water: 1.8, rainfall: 0  }, { hour: '3am', water: 1.9, rainfall: 2  },
    { hour: '6am',  water: 2.0, rainfall: 5  }, { hour: '9am', water: 2.1, rainfall: 8  },
    { hour: '12pm', water: 2.2, rainfall: 4  }, { hour: '3pm', water: 2.3, rainfall: 5  },
    { hour: 'Now',  water: 2.3, rainfall: 5  },
  ],
  'S-002': [
    { hour: '12am', water: 1.5, rainfall: 0  }, { hour: '3am', water: 1.8, rainfall: 3  },
    { hour: '6am',  water: 2.0, rainfall: 8  }, { hour: '9am', water: 2.3, rainfall: 14 },
    { hour: '12pm', water: 2.5, rainfall: 10 }, { hour: '3pm', water: 2.7, rainfall: 12 },
    { hour: 'Now',  water: 2.8, rainfall: 12 },
  ],
  'S-003': [
    { hour: '12am', water: 2.0, rainfall: 0  }, { hour: '3am', water: 2.5, rainfall: 5  },
    { hour: '6am',  water: 3.0, rainfall: 12 }, { hour: '9am', water: 3.5, rainfall: 18 },
    { hour: '12pm', water: 3.8, rainfall: 20 }, { hour: '3pm', water: 4.0, rainfall: 22 },
    { hour: 'Now',  water: 4.2, rainfall: 22 },
  ],
  'S-004': [
    { hour: '12am', water: 1.5, rainfall: 0 }, { hour: '3am', water: 1.5, rainfall: 0 },
    { hour: '6am',  water: 1.6, rainfall: 2 }, { hour: '9am', water: 1.7, rainfall: 3 },
    { hour: '12pm', water: 1.7, rainfall: 2 }, { hour: '3pm', water: 1.8, rainfall: 3 },
    { hour: 'Now',  water: 1.8, rainfall: 3 },
  ],
  'S-005': [
    { hour: '12am', water: 2.0, rainfall: 0  }, { hour: '3am', water: 2.2, rainfall: 4  },
    { hour: '6am',  water: 2.5, rainfall: 8  }, { hour: '9am', water: 2.9, rainfall: 12 },
    { hour: '12pm', water: 3.2, rainfall: 14 }, { hour: '3pm', water: 3.4, rainfall: 15 },
    { hour: 'Now',  water: 3.5, rainfall: 15 },
  ],
};

const SC: Record<string, string> = { normal: '#16a34a', warning: '#ea580c', critical: '#dc2626' };
const SB: Record<string, string> = { normal: '#dcfce7', warning: '#ffedd5', critical: '#fee2e2' };
const SL: Record<string, string> = { normal: 'Normal',  warning: 'Warning',  critical: 'Danger'  };

function LineChart({ data, maxVal, color, h = 120 }: { data: number[]; maxVal: number; color: string; h?: number }) {
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * CHART_W, y: h - (v / maxVal) * h }));
  return (
    <View style={{ height: h, width: CHART_W }}>
      {[0.25, 0.5, 0.75, 1].map(p => (
        <View key={p} style={{ position: 'absolute', left: 0, right: 0, top: h * (1 - p), height: 0.5, backgroundColor: '#e2e8f0' }} />
      ))}
      {pts.slice(0, -1).map((pt, i) => {
        const nx = pts[i + 1]; const dx = nx.x - pt.x; const dy = nx.y - pt.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return <View key={i} style={{ position: 'absolute', left: pt.x, top: pt.y, width: len, height: 2.5, backgroundColor: color, borderRadius: 2, transform: [{ rotate: `${angle}deg` }] }} />;
      })}
      {pts.map((pt, i) => (
        <View key={i} style={{ position: 'absolute', left: pt.x - 5, top: pt.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: '#fff' }} />
      ))}
    </View>
  );
}

function BarChart({ data, maxVal, color, h = 120 }: { data: number[]; maxVal: number; color: string; h?: number }) {
  const bw = (CHART_W / data.length) - 5;
  return (
    <View style={{ height: h, width: CHART_W, flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>
      {data.map((v, i) => (
        <View key={i} style={{ width: bw, height: Math.max(3, (v / maxVal) * h), backgroundColor: color, borderRadius: 3, opacity: i === data.length - 1 ? 1 : 0.6 }} />
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const [sel, setSel] = useState('S-003');
  const sensor  = SENSORS.find(s => s.id === sel) || SENSORS[0];
  const history = HISTORY[sel] || [];
  const wData   = history.map(h => h.water);
  const rData   = history.map(h => h.rainfall);
  const hours   = history.map(h => h.hour);

  const last = wData[wData.length - 1];
  const prev = wData[wData.length - 2];
  const trend = last > prev ? 'rising' : last < prev ? 'falling' : 'stable';
  const tc = trend === 'rising' ? '#dc2626' : trend === 'falling' ? '#16a34a' : '#6b7280';
  const ti = trend === 'rising' ? 'trending-up-outline' : trend === 'falling' ? 'trending-down-outline' : 'remove-outline';

  const rCur = sensor.rainfall;
  const rCat   = rCur >= 30 ? 'Extreme' : rCur >= 15 ? 'Heavy' : rCur >= 7.5 ? 'Moderate' : 'Light';
  const rColor = rCur >= 30 ? '#dc2626' : rCur >= 15 ? '#ea580c' : rCur >= 7.5 ? '#ca8a04' : '#16a34a';
  const rBg    = rCur >= 30 ? '#fee2e2' : rCur >= 15 ? '#ffedd5' : rCur >= 7.5 ? '#fef9c3' : '#dcfce7';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Sensor picker */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Select Sensor</Text>
        <Text style={s.cardSub}>Tap a sensor to see its charts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SENSORS.map(sen => (
            <TouchableOpacity
              key={sen.id}
              style={[s.chip, sel === sen.id && { backgroundColor: SB[sen.status], borderColor: SC[sen.status] }]}
              onPress={() => setSel(sen.id)} activeOpacity={0.7}
            >
              <View style={[s.dot, { backgroundColor: SC[sen.status] }]} />
              <View>
                <Text style={[s.chipId, sel === sen.id && { color: SC[sen.status] }]}>{sen.id}</Text>
                <Text style={s.chipSub} numberOfLines={1}>{sen.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[s.currentBox, { backgroundColor: SB[sensor.status], borderColor: SC[sensor.status] }]}>
          <Ionicons name="location" size={13} color={SC[sensor.status]} />
          <Text style={[s.currentLabel, { color: SC[sensor.status] }]}>{sensor.label}</Text>
          <View style={[s.pill, { backgroundColor: SC[sensor.status] }]}>
            <Text style={s.pillText}>{SL[sensor.status]}</Text>
          </View>
        </View>
      </View>

      {/* Chart 1 — Water Level */}
      <View style={s.card}>
        <View style={s.chartHead}>
          <View style={[s.chartIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="water-outline" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chartTitle}>Water Level</Text>
            <Text style={s.chartSub}>Last 24 hours · in meters (m)</Text>
          </View>
          <View style={s.trendBadge}>
            <Ionicons name={ti} size={14} color={tc} />
            <Text style={[s.trendText, { color: tc }]}>{trend}</Text>
          </View>
        </View>

        <View style={s.chartRow}>
          <View style={s.yAxis}>
            {['5m','4m','3m','2m','1m','0m'].map(v => <Text key={v} style={s.yLabel}>{v}</Text>)}
          </View>
          <View>
            <LineChart data={wData} maxVal={5} color={SC[sensor.status]} />
            <View style={{ position: 'absolute', top: 120 - (4 / 5) * 120, left: 0, right: 0, height: 1.5, backgroundColor: '#dc2626' }} />
          </View>
        </View>
        <View style={[s.xRow, { marginLeft: 36 }]}>
          {hours.map(h => <Text key={h} style={s.xLabel}>{h}</Text>)}
        </View>

        <View style={s.threshRow}>
          <View style={{ width: 20, height: 2, backgroundColor: '#dc2626' }} />
          <Text style={s.threshText}>Red line = critical threshold (4.0m)</Text>
        </View>

        <View style={[s.valBox, { backgroundColor: SB[sensor.status] }]}>
          <Text style={[s.valNum, { color: SC[sensor.status] }]}>{sensor.water}m</Text>
          <Text style={[s.valLabel, { color: SC[sensor.status] }]}>current water level</Text>
        </View>

        <View style={s.explainBox}>
          <Text style={s.explainTitle}>What does this mean?</Text>
          <Text style={s.explainText}>
            This line shows how the water level changed over the past 24 hours.{'\n\n'}
            {trend === 'rising'
              ? '⚠️ Water is RISING — conditions are getting worse. Stay alert and be ready to evacuate.'
              : trend === 'falling'
              ? '✅ Water is FALLING — conditions are improving. Stay cautious until it reaches the safe range.'
              : '↔️ Water is STABLE — no major change. Keep monitoring for updates.'}
            {'\n\n'}
            If the line goes above the red line (4.0m), flooding is happening or about to happen.
          </Text>
        </View>
      </View>

      {/* Chart 2 — Rainfall */}
      <View style={s.card}>
        <View style={s.chartHead}>
          <View style={[s.chartIcon, { backgroundColor: '#e0f2fe' }]}>
            <MaterialCommunityIcons name="weather-rainy" size={18} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chartTitle}>Rainfall Intensity</Text>
            <Text style={s.chartSub}>Last 24 hours · in mm/hr</Text>
          </View>
          <View style={[s.rainPill, { backgroundColor: rBg }]}>
            <Text style={[s.rainPillText, { color: rColor }]}>{rCur}mm/hr</Text>
          </View>
        </View>

        <View style={s.chartRow}>
          <View style={s.yAxis}>
            {['40','30','20','10','0'].map(v => <Text key={v} style={s.yLabel}>{v}</Text>)}
          </View>
          <BarChart data={rData} maxVal={40} color="#3b82f6" />
        </View>
        <View style={[s.xRow, { marginLeft: 36 }]}>
          {hours.map(h => <Text key={h} style={s.xLabel}>{h}</Text>)}
        </View>

        <View style={[s.valBox, { backgroundColor: rBg }]}>
          <Text style={[s.valNum, { color: rColor }]}>{rCur}mm/hr</Text>
          <Text style={[s.valLabel, { color: rColor }]}>{rCat} rainfall</Text>
        </View>

        <View style={s.explainBox}>
          <Text style={s.explainTitle}>What does this mean?</Text>
          <Text style={s.explainText}>
            Each bar shows how much rain was falling per hour. Taller bars = heavier rain. The darkest bar on the right is the current reading.{'\n\n'}
            Heavy rainfall causes water levels to rise faster. If you see tall bars AND a rising water level at the same time, flooding is more likely.
          </Text>
        </View>
      </View>

      {/* Measurement Guide */}
      <View style={[s.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 }]}>
        <View style={s.guideHead}>
          <Ionicons name="book-outline" size={18} color="#0284c7" />
          <Text style={[s.cardTitle, { color: '#0369a1' }]}>Understanding the Measurements</Text>
        </View>

        {/* Water level scale */}
        <Text style={s.guideSection}>Water Level (meters)</Text>
        <Text style={s.guideDesc}>Like a ruler in the water — the number tells you how deep the water is at that sensor.</Text>
        {[
          { range: 'Below 2.0m', label: 'Normal — safe',             color: '#16a34a' },
          { range: '2.0–2.9m',   label: 'Advisory — watch closely',  color: '#ca8a04' },
          { range: '3.0–3.9m',   label: 'Warning — prepare',         color: '#ea580c' },
          { range: '4.0m+',      label: 'Danger — evacuate now',     color: '#dc2626' },
        ].map(item => (
          <View key={item.range} style={s.scaleRow}>
            <View style={[s.scaleDot, { backgroundColor: item.color }]} />
            <Text style={s.scaleRange}>{item.range}</Text>
            <Text style={s.scaleLabel}>{item.label}</Text>
          </View>
        ))}

        <View style={s.guideDivider} />

        {/* Rainfall scale */}
        <Text style={s.guideSection}>Rainfall Intensity (mm/hr)</Text>
        <Text style={s.guideDesc}>Millimeters of rain collected per hour — higher means more intense rainfall.</Text>
        {[
          { range: 'Below 7.5',  label: 'Light — streets get wet',      color: '#16a34a' },
          { range: '7.5–15',     label: 'Moderate — water builds up',    color: '#ca8a04' },
          { range: '15–30',      label: 'Heavy — flash flood risk',      color: '#ea580c' },
          { range: 'Above 30',   label: 'Extreme — severe flooding',     color: '#dc2626' },
        ].map(item => (
          <View key={item.range} style={s.scaleRow}>
            <View style={[s.scaleDot, { backgroundColor: item.color }]} />
            <Text style={s.scaleRange}>{item.range}</Text>
            <Text style={s.scaleLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:     { padding: 14, gap: 12, paddingBottom: 32 },
  card:       { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardSub:    { fontSize: 12, color: '#9ca3af', marginBottom: 12 },

  chip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', marginRight: 8 },
  dot:      { width: 8, height: 8, borderRadius: 4 },
  chipId:   { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipSub:  { fontSize: 10, color: '#9ca3af', maxWidth: 100 },

  currentBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 10 },
  currentLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  pill:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:     { fontSize: 10, fontWeight: '700', color: '#fff' },

  chartHead:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chartIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  chartSub:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  trendText:  { fontSize: 11, fontWeight: '600' },

  chartRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  yAxis:    { width: 28, justifyContent: 'space-between', alignItems: 'flex-end' },
  yLabel:   { fontSize: 9, color: '#9ca3af' },
  xRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  xLabel:   { fontSize: 9, color: '#9ca3af' },

  threshRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  threshText: { fontSize: 10, color: '#dc2626', fontWeight: '600' },

  valBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 12 },
  valNum:   { fontSize: 26, fontWeight: '800' },
  valLabel: { fontSize: 13, fontWeight: '600' },

  rainPill:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  rainPillText: { fontSize: 12, fontWeight: '700' },

  explainBox:   { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  explainTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  explainText:  { fontSize: 13, color: '#374151', lineHeight: 20 },

  guideHead:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  guideSection: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  guideDesc:    { fontSize: 12, color: '#374151', marginBottom: 10, lineHeight: 17 },
  guideDivider: { height: 0.5, backgroundColor: '#bae6fd', marginVertical: 14 },
  scaleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  scaleDot:     { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  scaleRange:   { fontSize: 12, fontWeight: '700', color: '#111827', width: 80 },
  scaleLabel:   { fontSize: 11, color: '#6b7280', flex: 1 },
});