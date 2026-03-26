import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef, useCallback } from 'react';
import Svg, { Path, Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_PAD  = 16;
const CHART_W   = width - (CARD_PAD * 2) - 32 - 44; // screen - card padding*2 - scroll padding*2 - y-axis
const CHART_H   = 140;

// ── Data matching info.tsx exactly ───────────────────────────────────────────
const SENSORS = [
  { id: 'S-001', label: 'Medicion II-F · Palengke',   water: 2.3, rainfall: 5,  status: 'normal'   },
  { id: 'S-002', label: 'Medicion II-F · Riverside',  water: 2.8, rainfall: 12, status: 'warning'  },
  { id: 'S-003', label: 'Pag-asa III · Low-lying St', water: 4.2, rainfall: 22, status: 'critical' },
  { id: 'S-004', label: 'Pag-asa III · Perimeter Rd', water: 1.8, rainfall: 3,  status: 'normal'   },
];

type Period = 'DAY' | 'WEEK' | 'MONTH';

const DATA: Record<string, Record<Period, { label: string; water: number; rainfall: number }[]>> = {
  'S-001': {
    DAY:   [
      { label: '12am', water: 1.8, rainfall: 0  }, { label: '3am',  water: 1.9, rainfall: 2  },
      { label: '6am',  water: 2.0, rainfall: 5  }, { label: '9am',  water: 2.1, rainfall: 8  },
      { label: '12pm', water: 2.2, rainfall: 4  }, { label: '3pm',  water: 2.3, rainfall: 5  },
      { label: 'Now',  water: 2.3, rainfall: 5  },
    ],
    WEEK:  [
      { label: 'Mon', water: 1.6, rainfall: 2  }, { label: 'Tue', water: 1.8, rainfall: 4  },
      { label: 'Wed', water: 2.0, rainfall: 6  }, { label: 'Thu', water: 2.1, rainfall: 3  },
      { label: 'Fri', water: 2.2, rainfall: 5  }, { label: 'Sat', water: 2.2, rainfall: 4  },
      { label: 'Sun', water: 2.3, rainfall: 5  },
    ],
    MONTH: [
      { label: 'Wk 1', water: 1.4, rainfall: 8  }, { label: 'Wk 2', water: 1.7, rainfall: 14 },
      { label: 'Wk 3', water: 2.0, rainfall: 10 }, { label: 'Wk 4', water: 2.3, rainfall: 5  },
    ],
  },
  'S-002': {
    DAY:   [
      { label: '12am', water: 1.5, rainfall: 0  }, { label: '3am',  water: 1.8, rainfall: 3  },
      { label: '6am',  water: 2.0, rainfall: 8  }, { label: '9am',  water: 2.3, rainfall: 14 },
      { label: '12pm', water: 2.5, rainfall: 10 }, { label: '3pm',  water: 2.7, rainfall: 12 },
      { label: 'Now',  water: 2.8, rainfall: 12 },
    ],
    WEEK:  [
      { label: 'Mon', water: 1.4, rainfall: 4  }, { label: 'Tue', water: 1.7, rainfall: 7  },
      { label: 'Wed', water: 2.0, rainfall: 10 }, { label: 'Thu', water: 2.2, rainfall: 8  },
      { label: 'Fri', water: 2.4, rainfall: 11 }, { label: 'Sat', water: 2.6, rainfall: 9  },
      { label: 'Sun', water: 2.8, rainfall: 12 },
    ],
    MONTH: [
      { label: 'Wk 1', water: 1.2, rainfall: 10 }, { label: 'Wk 2', water: 1.8, rainfall: 18 },
      { label: 'Wk 3', water: 2.2, rainfall: 14 }, { label: 'Wk 4', water: 2.8, rainfall: 12 },
    ],
  },
  'S-003': {
    DAY:   [
      { label: '12am', water: 2.0, rainfall: 0  }, { label: '3am',  water: 2.5, rainfall: 5  },
      { label: '6am',  water: 3.0, rainfall: 12 }, { label: '9am',  water: 3.5, rainfall: 18 },
      { label: '12pm', water: 3.8, rainfall: 20 }, { label: '3pm',  water: 4.0, rainfall: 22 },
      { label: 'Now',  water: 4.2, rainfall: 22 },
    ],
    WEEK:  [
      { label: 'Mon', water: 1.8, rainfall: 5  }, { label: 'Tue', water: 2.2, rainfall: 10 },
      { label: 'Wed', water: 2.8, rainfall: 15 }, { label: 'Thu', water: 3.2, rainfall: 18 },
      { label: 'Fri', water: 3.6, rainfall: 20 }, { label: 'Sat', water: 3.9, rainfall: 22 },
      { label: 'Sun', water: 4.2, rainfall: 22 },
    ],
    MONTH: [
      { label: 'Wk 1', water: 1.5, rainfall: 12 }, { label: 'Wk 2', water: 2.4, rainfall: 20 },
      { label: 'Wk 3', water: 3.2, rainfall: 22 }, { label: 'Wk 4', water: 4.2, rainfall: 22 },
    ],
  },
  'S-004': {
    DAY:   [
      { label: '12am', water: 1.5, rainfall: 0 }, { label: '3am',  water: 1.5, rainfall: 0 },
      { label: '6am',  water: 1.6, rainfall: 2 }, { label: '9am',  water: 1.7, rainfall: 3 },
      { label: '12pm', water: 1.7, rainfall: 2 }, { label: '3pm',  water: 1.8, rainfall: 3 },
      { label: 'Now',  water: 1.8, rainfall: 3 },
    ],
    WEEK:  [
      { label: 'Mon', water: 1.3, rainfall: 1 }, { label: 'Tue', water: 1.4, rainfall: 1 },
      { label: 'Wed', water: 1.5, rainfall: 2 }, { label: 'Thu', water: 1.6, rainfall: 2 },
      { label: 'Fri', water: 1.7, rainfall: 3 }, { label: 'Sat', water: 1.7, rainfall: 2 },
      { label: 'Sun', water: 1.8, rainfall: 3 },
    ],
    MONTH: [
      { label: 'Wk 1', water: 1.2, rainfall: 4 }, { label: 'Wk 2', water: 1.4, rainfall: 6 },
      { label: 'Wk 3', water: 1.6, rainfall: 5 }, { label: 'Wk 4', water: 1.8, rainfall: 3 },
    ],
  },
};

const SC: Record<string, string> = { normal: '#16a34a', warning: '#ea580c', critical: '#dc2626' };
const SB: Record<string, string> = { normal: '#dcfce7', warning: '#ffedd5', critical: '#fee2e2' };
const SL: Record<string, string> = { normal: 'Normal',  warning: 'Warning',  critical: 'Danger'  };

// ── Interactive Line Chart ────────────────────────────────────────────────────
function LineChart({ data, maxVal, color }: {
  data: { label: string; water: number }[];
  maxVal: number;
  color: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const pts = data.map((d, i) => ({
    x: data.length === 1 ? CHART_W / 2 : (i / (data.length - 1)) * CHART_W,
    y: CHART_H - (d.water / maxVal) * CHART_H,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Critical threshold line y position
  const threshY = CHART_H - (4.0 / maxVal) * CHART_H;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const closest = pts.reduce((best, pt, i) =>
          Math.abs(pt.x - x) < Math.abs(pts[best].x - x) ? i : best, 0);
        setActiveIdx(closest);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const closest = pts.reduce((best, pt, i) =>
          Math.abs(pt.x - x) < Math.abs(pts[best].x - x) ? i : best, 0);
        setActiveIdx(closest);
      },
      onPanResponderRelease: () => setActiveIdx(null),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={CHART_W} height={CHART_H}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={0} y1={CHART_H * (1 - p)} x2={CHART_W} y2={CHART_H * (1 - p)} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}
        {/* Critical threshold */}
        <Line x1={0} y1={threshY} x2={CHART_W} y2={threshY} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Line */}
        <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={activeIdx === i ? 7 : 4} fill={color} stroke="#fff" strokeWidth={2} />
        ))}
        {/* Tooltip */}
        {activeIdx !== null && (() => {
          const pt  = pts[activeIdx];
          const val = data[activeIdx].water;
          const lbl = data[activeIdx].label;
          const bw  = 70; const bh = 36; const br = 6;
          const bx  = Math.min(Math.max(pt.x - bw / 2, 0), CHART_W - bw);
          const by  = pt.y - bh - 10 < 0 ? pt.y + 14 : pt.y - bh - 10;
          return (
            <G>
              <Rect x={bx} y={by} width={bw} height={bh} rx={br} fill="#1e293b" />
              <SvgText x={bx + bw / 2} y={by + 13} textAnchor="middle" fill="#94a3b8" fontSize={9}>{lbl}</SvgText>
              <SvgText x={bx + bw / 2} y={by + 27} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight="bold">{val}m</SvgText>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}

// ── Interactive Bar Chart ─────────────────────────────────────────────────────
function BarChart({ data, maxVal }: {
  data: { label: string; rainfall: number }[];
  maxVal: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const barW = (CHART_W / data.length) - 4;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const idx = Math.min(Math.floor(x / (CHART_W / data.length)), data.length - 1);
        setActiveIdx(idx);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const idx = Math.min(Math.floor(x / (CHART_W / data.length)), data.length - 1);
        setActiveIdx(Math.max(0, idx));
      },
      onPanResponderRelease: () => setActiveIdx(null),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={CHART_W} height={CHART_H}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={0} y1={CHART_H * (1 - p)} x2={CHART_W} y2={CHART_H * (1 - p)} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const bh  = Math.max(3, (d.rainfall / maxVal) * CHART_H);
          const bx  = i * (CHART_W / data.length) + 2;
          const by  = CHART_H - bh;
          const clr = d.rainfall >= 30 ? '#dc2626' : d.rainfall >= 15 ? '#ea580c' : d.rainfall >= 7.5 ? '#ca8a04' : '#3b82f6';
          return (
            <Rect key={i} x={bx} y={by} width={barW} height={bh} rx={3}
              fill={clr} opacity={activeIdx === i ? 1 : 0.65} />
          );
        })}
        {/* Tooltip */}
        {activeIdx !== null && (() => {
          const d   = data[activeIdx];
          const bx  = activeIdx * (CHART_W / data.length) + 2;
          const bh  = Math.max(3, (d.rainfall / maxVal) * CHART_H);
          const by  = CHART_H - bh;
          const cx  = bx + barW / 2;
          const bw2 = 74; const bh2 = 36; const br = 6;
          const tx  = Math.min(Math.max(cx - bw2 / 2, 0), CHART_W - bw2);
          const ty  = by - bh2 - 8 < 0 ? by + bh + 4 : by - bh2 - 8;
          return (
            <G>
              <Rect x={tx} y={ty} width={bw2} height={bh2} rx={br} fill="#1e293b" />
              <SvgText x={tx + bw2 / 2} y={ty + 13} textAnchor="middle" fill="#94a3b8" fontSize={9}>{d.label}</SvgText>
              <SvgText x={tx + bw2 / 2} y={ty + 27} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight="bold">{d.rainfall}mm/hr</SvgText>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const [sel, setSel]       = useState('S-001');
  const [period, setPeriod] = useState<Period>('DAY');

  const sensor  = SENSORS.find(s => s.id === sel) || SENSORS[0];
  const history = DATA[sel][period];

  const trend = history.length >= 2
    ? history[history.length - 1].water > history[history.length - 2].water ? 'rising'
    : history[history.length - 1].water < history[history.length - 2].water ? 'falling' : 'stable'
    : 'stable';
  const tc = trend === 'rising' ? '#dc2626' : trend === 'falling' ? '#16a34a' : '#6b7280';
  const ti = trend === 'rising' ? 'trending-up-outline' : trend === 'falling' ? 'trending-down-outline' : 'remove-outline';

  const rCur   = sensor.rainfall;
  const rCat   = rCur >= 30 ? 'Extreme' : rCur >= 15 ? 'Heavy' : rCur >= 7.5 ? 'Moderate' : 'Light';
  const rColor = rCur >= 30 ? '#dc2626' : rCur >= 15 ? '#ea580c' : rCur >= 7.5 ? '#ca8a04' : '#16a34a';
  const rBg    = rCur >= 30 ? '#fee2e2' : rCur >= 15 ? '#ffedd5' : rCur >= 7.5 ? '#fef9c3' : '#dcfce7';

  const PERIODS: Period[] = ['DAY', 'WEEK', 'MONTH'];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Sensor Picker */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Select Sensor</Text>
        <Text style={s.cardSub}>Tap a sensor to view its charts</Text>
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

      {/* Date Filter */}
      <View style={s.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
            onPress={() => setPeriod(p)} activeOpacity={0.7}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>
              {p === 'DAY' ? 'Today' : p === 'WEEK' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart 1 — Water Level */}
      <View style={s.card}>
        <View style={s.chartHead}>
          <View style={[s.chartIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="water-outline" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chartTitle}>Water Level</Text>
            <Text style={s.chartSub}>
              {period === 'DAY' ? 'Last 24 hours' : period === 'WEEK' ? 'Last 7 days' : 'Last 4 weeks'} · meters (m)
            </Text>
          </View>
          <View style={s.trendBadge}>
            <Ionicons name={ti} size={14} color={tc} />
            <Text style={[s.trendText, { color: tc }]}>{trend}</Text>
          </View>
        </View>

        <View style={s.chartArea}>
          <View style={s.yAxis}>
            {['5m','4m','3m','2m','1m','0m'].map(v => <Text key={v} style={s.yLabel}>{v}</Text>)}
          </View>
          <LineChart data={history} maxVal={5} color={SC[sensor.status]} />
        </View>
        <View style={[s.xRow, { marginLeft: 44 }]}>
          {history.map(h => <Text key={h.label} style={s.xLabel}>{h.label}</Text>)}
        </View>

        <View style={s.threshRow}>
          <View style={{ width: 20, height: 2, backgroundColor: '#dc2626' }} />
          <Text style={s.threshText}>Dashed red line = critical threshold (4.0m)</Text>
        </View>

        <View style={[s.valBox, { backgroundColor: SB[sensor.status] }]}>
          <Text style={[s.valNum, { color: SC[sensor.status] }]}>{sensor.water}m</Text>
          <Text style={[s.valLabel, { color: SC[sensor.status] }]}>current water level</Text>
        </View>

        <Text style={s.touchHint}>Touch and drag on the chart to see values</Text>

        {/* Gemini AI Insight placeholder */}
        <View style={s.geminiBox}>
          <View style={s.geminiHeader}>
            <View style={s.geminiIconWrap}>
              <Ionicons name="sparkles-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={s.geminiTitle}>AI Insights</Text>
            <Text style={s.geminiPowered}>powered by Gemini</Text>
          </View>
          <View style={s.geminiContent}>
            <Text style={s.geminiPlaceholder}>Insights about this water level trend will appear here once connected to the AI.</Text>
          </View>
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
            <Text style={s.chartSub}>
              {period === 'DAY' ? 'Last 24 hours' : period === 'WEEK' ? 'Last 7 days' : 'Last 4 weeks'} · mm/hr
            </Text>
          </View>
          <View style={[s.rainPill, { backgroundColor: rBg }]}>
            <Text style={[s.rainPillText, { color: rColor }]}>{rCur}mm/hr</Text>
          </View>
        </View>

        <View style={s.chartArea}>
          <View style={s.yAxis}>
            {['40','30','20','10','0'].map(v => <Text key={v} style={s.yLabel}>{v}</Text>)}
          </View>
          <BarChart data={history} maxVal={40} />
        </View>
        <View style={[s.xRow, { marginLeft: 44 }]}>
          {history.map(h => <Text key={h.label} style={s.xLabel}>{h.label}</Text>)}
        </View>

        <View style={[s.valBox, { backgroundColor: rBg }]}>
          <Text style={[s.valNum, { color: rColor }]}>{rCur}mm/hr</Text>
          <Text style={[s.valLabel, { color: rColor }]}>{rCat} rainfall</Text>
        </View>

        <Text style={s.touchHint}>Touch and drag on the chart to see values</Text>

        {/* Gemini AI Insight placeholder */}
        <View style={s.geminiBox}>
          <View style={s.geminiHeader}>
            <View style={s.geminiIconWrap}>
              <Ionicons name="sparkles-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={s.geminiTitle}>AI Insights</Text>
            <Text style={s.geminiPowered}>powered by Gemini</Text>
          </View>
          <View style={s.geminiContent}>
            <Text style={s.geminiPlaceholder}>Insights about this rainfall trend will appear here once connected to the AI.</Text>
          </View>
        </View>
      </View>

      {/* Measurement Guide */}
      <View style={[s.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 }]}>
        <View style={s.guideHead}>
          <Ionicons name="book-outline" size={18} color="#0284c7" />
          <Text style={[s.cardTitle, { color: '#0369a1' }]}>Understanding the Measurements</Text>
        </View>

        <Text style={s.guideSection}>Water Level (meters)</Text>
        <Text style={s.guideDesc}>Like a ruler in the water — the number tells you how deep the water is at that sensor.</Text>
        {[
          { range: 'Below 2.0m', label: 'Normal — safe',            color: '#16a34a' },
          { range: '2.0–2.9m',   label: 'Advisory — watch closely', color: '#ca8a04' },
          { range: '3.0–3.9m',   label: 'Warning — prepare',        color: '#ea580c' },
          { range: '4.0m+',      label: 'Danger — evacuate now',    color: '#dc2626' },
        ].map(item => (
          <View key={item.range} style={s.scaleRow}>
            <View style={[s.scaleDot, { backgroundColor: item.color }]} />
            <Text style={s.scaleRange}>{item.range}</Text>
            <Text style={s.scaleLabel}>{item.label}</Text>
          </View>
        ))}

        <View style={s.guideDivider} />

        <Text style={s.guideSection}>Rainfall Intensity (mm/hr)</Text>
        <Text style={s.guideDesc}>Millimeters of rain collected per hour — higher means more intense rainfall.</Text>
        {[
          { range: 'Below 7.5', label: 'Light — streets get wet',      color: '#16a34a' },
          { range: '7.5–15',    label: 'Moderate — water builds up',   color: '#ca8a04' },
          { range: '15–30',     label: 'Heavy — flash flood risk',     color: '#ea580c' },
          { range: 'Above 30',  label: 'Extreme — severe flooding',    color: '#dc2626' },
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
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:    { padding: 16, gap: 12, paddingBottom: 32 },

  card:      { backgroundColor: '#ffffff', borderRadius: 16, padding: CARD_PAD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardSub:   { fontSize: 12, color: '#9ca3af', marginBottom: 12 },

  chip:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', marginRight: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  chipId:    { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipSub:   { fontSize: 10, color: '#9ca3af', maxWidth: 110 },

  currentBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 10 },
  currentLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  pill:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:     { fontSize: 10, fontWeight: '700', color: '#fff' },

  periodRow:       { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 3, gap: 2 },
  periodBtn:       { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  periodText:      { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  periodTextActive:{ color: '#111827', fontWeight: '700' },

  chartHead:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chartIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  chartSub:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  trendText:  { fontSize: 11, fontWeight: '600' },

  chartArea: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  yAxis:     { width: 28, justifyContent: 'space-between', alignItems: 'flex-end', height: CHART_H },
  yLabel:    { fontSize: 9, color: '#9ca3af' },
  xRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  xLabel:    { fontSize: 9, color: '#9ca3af' },

  threshRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  threshText: { fontSize: 10, color: '#dc2626', fontWeight: '600' },

  valBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 8 },
  valNum:   { fontSize: 26, fontWeight: '800' },
  valLabel: { fontSize: 13, fontWeight: '600' },

  rainPill:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  rainPillText: { fontSize: 12, fontWeight: '700' },

  touchHint: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },

  geminiBox:         { backgroundColor: '#faf5ff', borderRadius: 12, borderWidth: 1, borderColor: '#e9d5ff', overflow: 'hidden' },
  geminiHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#e9d5ff' },
  geminiIconWrap:    { width: 26, height: 26, borderRadius: 8, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  geminiTitle:       { fontSize: 13, fontWeight: '700', color: '#6d28d9', flex: 1 },
  geminiPowered:     { fontSize: 10, color: '#a78bfa' },
  geminiContent:     { padding: 12 },
  geminiPlaceholder: { fontSize: 12, color: '#a78bfa', fontStyle: 'italic', lineHeight: 18 },

  guideHead:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  guideSection: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  guideDesc:    { fontSize: 12, color: '#374151', marginBottom: 10, lineHeight: 17 },
  guideDivider: { height: 0.5, backgroundColor: '#bae6fd', marginVertical: 14 },
  scaleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  scaleDot:     { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  scaleRange:   { fontSize: 12, fontWeight: '700', color: '#111827', width: 80 },
  scaleLabel:   { fontSize: 11, color: '#6b7280', flex: 1 },
});