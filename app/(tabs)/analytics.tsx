import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, PanResponder, Modal, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { getGeminiInsight } from '../../lib/gemini';
import { getRecentReadings, getCurrentRainfall, getRainfallHistory, getFloodLevel, FLOOD_LEVELS, type RainfallHistoryPoint, type SensorReading } from '../../lib/sensor-api';
import Svg, { Path, Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_PAD    = 16;
const SCROLL_PAD  = 16;  // ScrollView contentContainer horizontal padding
const Y_AXIS_W    = 28;  // width of the y-axis labels column
const CHART_GAP   = 8;   // gap between y-axis and chart in chartArea
// Available width for the SVG chart, clamped so it never overflows the screen.
const CHART_W   = Math.max(
  180,
  width - (SCROLL_PAD * 2) - (CARD_PAD * 2) - Y_AXIS_W - CHART_GAP - 2,
);
const CHART_H   = 140;

// Water-level chart scale (cm). Ground = 0.
const WATER_MIN = -40;
const WATER_MAX = 150;
const CRITICAL_CM = 150;

// ── Interactive Line Chart ────────────────────────────────────────────────────
function LineChart({ data, color, chartWidth = CHART_W }: {
  data: { label: string; water: number }[];
  color: string;
  chartWidth?: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const W = chartWidth;

  const yFor = (cm: number) => {
    const ratio = (Math.min(Math.max(cm, WATER_MIN), WATER_MAX) - WATER_MIN) / (WATER_MAX - WATER_MIN);
    return CHART_H - ratio * CHART_H;
  };

  const pts = data.map((d, i) => ({
    x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
    y: yFor(d.water),
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Critical threshold line y position
  const threshY = yFor(CRITICAL_CM);
  // Ground line (0 cm)
  const groundY = yFor(0);

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
      <Svg width={W} height={CHART_H}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={0} y1={CHART_H * (1 - p)} x2={W} y2={CHART_H * (1 - p)} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}
        {/* Ground line (0 cm) */}
        <Line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#b45309" strokeWidth={1.5} strokeDasharray="2,3" />
        {/* Critical threshold */}
        <Line x1={0} y1={threshY} x2={W} y2={threshY} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Line */}
        <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={activeIdx === i ? 7 : 4} fill={color} stroke="#fff" strokeWidth={2} />
        ))}
        {/* Tooltip */}
        {activeIdx !== null && pts[activeIdx] && data[activeIdx] && (() => {
          const pt  = pts[activeIdx];
          const val = data[activeIdx].water ?? 0;
          const lbl = data[activeIdx].label;
          const bw  = 70; const bh = 36; const br = 6;
          const bx  = Math.min(Math.max(pt.x - bw / 2, 0), W - bw);
          const by  = pt.y - bh - 10 < 0 ? pt.y + 14 : pt.y - bh - 10;
          return (
            <G>
              <Rect x={bx} y={by} width={bw} height={bh} rx={br} fill="#1e293b" />
              <SvgText x={bx + bw / 2} y={by + 13} textAnchor="middle" fill="#94a3b8" fontSize={9}>{lbl}</SvgText>
              <SvgText x={bx + bw / 2} y={by + 27} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight="bold">{val > 0 ? '+' : ''}{val}cm</SvgText>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}

// ── Interactive Bar Chart ─────────────────────────────────────────────────────
function BarChart({ data, maxVal, unit, chartWidth = CHART_W }: {
  data: { label: string; value: number }[];
  maxVal: number;
  unit: string;
  chartWidth?: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const W = chartWidth;
  const safeData = data.filter(d => d != null && d.value != null);
  if (safeData.length === 0) return null;
  const slot = W / safeData.length;
  const barW = slot - 4;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const idx = Math.min(Math.floor(x / (W / safeData.length)), safeData.length - 1);
        setActiveIdx(idx);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const idx = Math.min(Math.floor(x / (W / safeData.length)), safeData.length - 1);
        setActiveIdx(Math.max(0, idx));
      },
      onPanResponderRelease: () => setActiveIdx(null),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={W} height={CHART_H}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line key={i} x1={0} y1={CHART_H * (1 - p)} x2={W} y2={CHART_H * (1 - p)} stroke="#e2e8f0" strokeWidth={0.5} />
        ))}
        {/* Bars */}
        {safeData.map((d, i) => {
          const rain = d.value ?? 0;
          const bh  = Math.max(3, (rain / maxVal) * CHART_H);
          const bx  = i * slot + 2;
          const by  = CHART_H - bh;
          const clr = rain >= 30 ? '#dc2626' : rain >= 15 ? '#ea580c' : rain >= 7.5 ? '#ca8a04' : '#2563eb';
          return (
            <Rect key={i} x={bx} y={by} width={barW} height={bh} rx={3}
              fill={clr} opacity={activeIdx === i ? 1 : 0.65} />
          );
        })}
        {/* Tooltip */}
        {activeIdx !== null && activeIdx < safeData.length && (() => {
          const d   = safeData[activeIdx];
          const rain = d.value ?? 0;
          const bx  = activeIdx * slot + 2;
          const bh  = Math.max(3, (rain / maxVal) * CHART_H);
          const by  = CHART_H - bh;
          const cx  = bx + barW / 2;
          const bw2 = 78; const bh2 = 36; const br = 6;
          const tx  = Math.min(Math.max(cx - bw2 / 2, 0), W - bw2);
          const ty  = by - bh2 - 8 < 0 ? by + bh + 4 : by - bh2 - 8;
          return (
            <G>
              <Rect x={tx} y={ty} width={bw2} height={bh2} rx={br} fill="#1e293b" />
              <SvgText x={tx + bw2 / 2} y={ty + 13} textAnchor="middle" fill="#94a3b8" fontSize={9}>{d.label}</SvgText>
              <SvgText x={tx + bw2 / 2} y={ty + 27} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">{rain}{unit}</SvgText>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
// Minimum horizontal space per data point when scrolling (1h view)
const POINT_W = 46;

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [dayGranularity, setDayGranularity] = useState<'3h' | '1h'>('3h');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Real data state
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ label: string; water: number; rainfall: number }[]>([]);
  const [rawWater, setRawWater] = useState<number[]>([]); // all recent water readings (cm) for stats
  const [rainfall, setRainfall] = useState(0);
  const [rainHistory, setRainHistory] = useState<RainfallHistoryPoint[]>([]); // real rainfall history from API
  const [currentWater, setCurrentWater] = useState(0);

  // AI insights state
  const [waterAiLoading, setWaterAiLoading] = useState(false);
  const [waterAiText, setWaterAiText] = useState('');
  const [rainAiLoading, setRainAiLoading] = useState(false);
  const [rainAiText, setRainAiText] = useState('');

  // Fetch real data from Supabase + OpenWeatherMap
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const limitMap = { DAY: 24, WEEK: 7, MONTH: 30 };
        const [readings, rain, rainHist] = await Promise.all([
          getRecentReadings('S-001', limitMap[period]),
          getCurrentRainfall(),
          getRainfallHistory(period),
        ]);

        setRainfall(rain.current);
        setRainHistory(rainHist);

        if (readings.length > 0) {
          setCurrentWater(readings[0].water_level_cm);
          setRawWater(readings.map(r => r.water_level_cm));

          // Convert readings to chart data (reverse so oldest is first)
          const reversed = [...readings].reverse();
          const chartData = reversed.map((r, i) => {
            const date = new Date(r.timestamp);
            let label: string;
            if (period === 'DAY') {
              label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (period === 'WEEK') {
              label = date.toLocaleDateString([], { weekday: 'short' });
            } else {
              label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
            return { label, water: r.water_level_cm, rainfall: rain.current };
          });

          // For DAY keep the full hourly series (granularity is applied at render).
          // For WEEK/MONTH keep a readable number of points.
          if (period === 'DAY') {
            setHistory(chartData);
          } else {
            const maxPoints = period === 'WEEK' ? 7 : 10;
            if (chartData.length > maxPoints) {
              const step = Math.floor(chartData.length / maxPoints);
              const sampled = chartData.filter((_, i) => i % step === 0).slice(0, maxPoints);
              setHistory(sampled);
            } else {
              setHistory(chartData);
            }
          }
        } else {
          setHistory([]);
          setRawWater([]);
        }
      } catch (err) {
        console.error('[Analytics] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const trend = history.length >= 2
    ? history[history.length - 1].water > history[history.length - 2].water ? 'rising'
    : history[history.length - 1].water < history[history.length - 2].water ? 'falling' : 'stable'
    : 'stable';
  const tc = trend === 'rising' ? '#dc2626' : trend === 'falling' ? '#16a34a' : '#6b7280';
  const ti = trend === 'rising' ? 'trending-up-outline' : trend === 'falling' ? 'trending-down-outline' : 'remove-outline';

  // Current flood level (cm-based, 6 levels)
  const level = getFloodLevel(currentWater);

  // ── Extra analytics derived from the recent readings ──
  const waterStats = (() => {
    if (rawWater.length === 0) return null;
    const min = Math.min(...rawWater);
    const max = Math.max(...rawWater);
    const avg = rawWater.reduce((a, b) => a + b, 0) / rawWater.length;
    const first = rawWater[rawWater.length - 1]; // oldest
    const change = currentWater - first;         // net change over the window
    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      change: Math.round(change * 10) / 10,
    };
  })();

  const rCur   = rainfall;
  const rCat   = rCur >= 30 ? 'Red Warning' : rCur >= 15 ? 'Orange Warning' : rCur >= 7.5 ? 'Yellow Warning' : 'No Warning';
  const rColor = rCur >= 30 ? '#dc2626' : rCur >= 15 ? '#ea580c' : rCur >= 7.5 ? '#ca8a04' : '#2563eb';
  const rBg    = rCur >= 30 ? '#fee2e2' : rCur >= 15 ? '#ffedd5' : rCur >= 7.5 ? '#fef9c3' : '#eff6ff';

  // Rainfall history scaling (DAY = mm/hr, WEEK/MONTH = mm/day total)
  const rainMax = Math.max(period === 'DAY' ? 10 : 20, ...rainHistory.map(p => p.value)) * 1.15;
  const rainYLabels = [rainMax, rainMax * 0.75, rainMax * 0.5, rainMax * 0.25, 0].map(v => String(Math.round(v)));
  const rainTotal = Math.round(rainHistory.reduce((a, p) => a + p.value, 0) * 10) / 10;
  const rainPeak = rainHistory.length ? Math.round(Math.max(...rainHistory.map(p => p.value)) * 10) / 10 : 0;
  const rainWetCount = rainHistory.filter(p => p.value > 0.1).length;

  // ── Granularity handling for the Today view (3h fits screen, 1h scrolls) ──
  // Downsample an array keeping every Nth item, always including the last point.
  function everyNth<T>(arr: T[], n: number): T[] {
    if (n <= 1) return arr;
    const out = arr.filter((_, i) => i % n === 0);
    if (arr.length && (arr.length - 1) % n !== 0) out.push(arr[arr.length - 1]);
    return out;
  }

  const isDay = period === 'DAY';
  // Both intervals scroll on the Today view; 3h uses a wider per-point spacing so
  // the fewer points are still readable, 1h packs all 24 hours.
  const scrollable = isDay;
  const pointW = dayGranularity === '3h' ? 90 : POINT_W;

  // Water display data + width
  const waterDisplay = isDay && dayGranularity === '3h' ? everyNth(history, 3) : history;
  const waterChartW = scrollable
    ? Math.max(CHART_W, waterDisplay.length * pointW)
    : CHART_W;

  // Rainfall display data + width
  const rainDisplay = isDay && dayGranularity === '3h' ? everyNth(rainHistory, 3) : rainHistory;
  const rainChartW = scrollable
    ? Math.max(CHART_W, rainDisplay.length * pointW)
    : CHART_W;

  const waterCanScroll = scrollable && waterChartW > CHART_W + 1;
  const rainCanScroll = scrollable && rainChartW > CHART_W + 1;

  const sensor = { id: 'S-001', label: 'Brgy. Medicion II-F', water: currentWater, rainfall: rCur, status: level.key };
  const PERIODS: ('DAY' | 'WEEK' | 'MONTH')[] = ['DAY', 'WEEK', 'MONTH'];

  if (loading && history.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading sensor data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Sensor Info */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Sensor S-001</Text>
        <Text style={s.cardSub}>Brgy. Medicion II-F · Imus, Cavite</Text>
        <View style={[s.currentBox, { backgroundColor: level.bg, borderColor: level.color }]}>
          <Ionicons name="location" size={13} color={level.color} />
          <Text style={[s.currentLabel, { color: level.color }]}>Brgy. Medicion II-F</Text>
          <View style={[s.pill, { backgroundColor: level.color }]}>
            <Text style={s.pillText}>{level.label}</Text>
          </View>
        </View>
      </View>

      {/* Quick stats (water = sensor, rainfall = API) */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: level.bg }]}>
            <MaterialCommunityIcons name="waves-arrow-up" size={16} color={level.color} />
          </View>
          <Text style={[s.statVal, { color: level.color }]}>{currentWater > 0 ? '+' : ''}{Math.round(currentWater * 10) / 10}<Text style={s.statUnit}>cm</Text></Text>
          <Text style={s.statLbl}>Water now</Text>
          <Text style={s.statSrc}>sensor</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: rBg }]}>
            <MaterialCommunityIcons name="weather-pouring" size={16} color={rColor} />
          </View>
          <Text style={[s.statVal, { color: rColor }]}>{rCur}<Text style={s.statUnit}>mm/hr</Text></Text>
          <Text style={s.statLbl}>Rainfall</Text>
          <Text style={s.statSrc}>API</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name={ti} size={16} color={tc} />
          </View>
          <Text style={[s.statVal, { color: tc, textTransform: 'capitalize' }]}>{trend}</Text>
          <Text style={s.statLbl}>Trend</Text>
          <Text style={s.statSrc}>sensor</Text>
        </View>
      </View>

      {/* Date Filter */}
      <View style={s.dateFilterRow}>
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
        <TouchableOpacity style={s.calendarBtn} onPress={() => setShowCalendar(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity style={s.calOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.calSheet}>
              <View style={s.calHeader}>
                <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>
                  <Ionicons name="chevron-back" size={20} color="#374151" />
                </TouchableOpacity>
                <Text style={s.calMonthTitle}>
                  {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>
                  <Ionicons name="chevron-forward" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
              <View style={s.calWeekRow}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <Text key={d} style={s.calWeekDay}>{d}</Text>
                ))}
              </View>
              {(() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const rows: JSX.Element[] = [];
                let cells: JSX.Element[] = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<View key={`e-${i}`} style={s.calCell} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
                  cells.push(
                    <TouchableOpacity
                      key={day}
                      style={[s.calCell, isSelected && s.calCellSelected, isToday && !isSelected && s.calCellToday]}
                      onPress={() => {
                        setSelectedDate(new Date(year, month, day));
                        setShowCalendar(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.calDayText, isSelected && s.calDayTextSelected, isToday && !isSelected && s.calDayTextToday]}>{day}</Text>
                    </TouchableOpacity>
                  );
                  if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
                    rows.push(<View key={`r-${day}`} style={s.calRow}>{cells}</View>);
                    cells = [];
                  }
                }
                return rows;
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Chart 1 — Water Level */}
      <View style={s.card}>
        <View style={s.chartHead}>
          <View style={[s.chartIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="water-outline" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chartTitle}>Water Level</Text>
            <Text style={s.chartSub}>
              {period === 'DAY' ? 'Last 24 hours' : period === 'WEEK' ? 'Last 7 days' : 'Last 4 weeks'} · from sensor · cm
            </Text>
          </View>
          <View style={s.trendBadge}>
            <Ionicons name={ti} size={14} color={tc} />
            <Text style={[s.trendText, { color: tc }]}>{trend}</Text>
          </View>
        </View>

        {/* Granularity toggle — Today view only */}
        {isDay && (
          <View style={s.granRow}>
            <Text style={s.granLabel}>Interval</Text>
            <View style={s.granToggle}>
              {(['3h', '1h'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.granBtn, dayGranularity === g && s.granBtnActive]}
                  onPress={() => setDayGranularity(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.granBtnText, dayGranularity === g && s.granBtnTextActive]}>Every {g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {waterCanScroll && <Text style={s.granHint}>← swipe →</Text>}
          </View>
        )}

        <View style={s.chartArea}>
          <View style={s.yAxis}>
            {['150','90','40','0','-40'].map(v => <Text key={v} style={s.yLabel}>{v}</Text>)}
          </View>
          {scrollable ? (
            <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled style={{ flex: 1 }}>
              <View>
                <LineChart data={waterDisplay} color={level.color} chartWidth={waterChartW} />
                <View style={[s.xRow, { width: waterChartW, marginTop: 6 }]}>
                  {waterDisplay.map((h, i) => <Text key={i} style={s.xLabel}>{h.label}</Text>)}
                </View>
              </View>
            </ScrollView>
          ) : (
            <LineChart data={waterDisplay} color={level.color} chartWidth={CHART_W} />
          )}
        </View>
        {!scrollable && (
          <View style={[s.xRow, { marginLeft: Y_AXIS_W + CHART_GAP, width: CHART_W }]}>
            {waterDisplay.map((h, i) => <Text key={i} style={s.xLabel}>{h.label}</Text>)}
          </View>
        )}

        <View style={s.threshRow}>
          <View style={{ width: 20, height: 2, backgroundColor: '#b45309' }} />
          <Text style={[s.threshText, { color: '#b45309' }]}>Ground (0 cm)</Text>
          <View style={{ width: 20, height: 2, backgroundColor: '#dc2626', marginLeft: 10 }} />
          <Text style={s.threshText}>Critical ({CRITICAL_CM} cm)</Text>
        </View>

        {/* Water stats strip */}
        {waterStats && (
          <View style={s.miniStatsRow}>
            <View style={s.miniStat}><Text style={s.miniStatVal}>{waterStats.min > 0 ? '+' : ''}{waterStats.min}</Text><Text style={s.miniStatLbl}>Min cm</Text></View>
            <View style={s.miniDivider} />
            <View style={s.miniStat}><Text style={s.miniStatVal}>{waterStats.avg > 0 ? '+' : ''}{waterStats.avg}</Text><Text style={s.miniStatLbl}>Avg cm</Text></View>
            <View style={s.miniDivider} />
            <View style={s.miniStat}><Text style={s.miniStatVal}>{waterStats.max > 0 ? '+' : ''}{waterStats.max}</Text><Text style={s.miniStatLbl}>Max cm</Text></View>
            <View style={s.miniDivider} />
            <View style={s.miniStat}><Text style={[s.miniStatVal, { color: waterStats.change > 0 ? '#dc2626' : waterStats.change < 0 ? '#16a34a' : '#111827' }]}>{waterStats.change > 0 ? '+' : ''}{waterStats.change}</Text><Text style={s.miniStatLbl}>Change</Text></View>
          </View>
        )}

        <View style={[s.valBox, { backgroundColor: level.bg }]}>
          <Text style={[s.valNum, { color: level.color }]}>{currentWater > 0 ? '+' : ''}{Math.round(currentWater * 10) / 10}cm</Text>
          <Text style={[s.valLabel, { color: level.color }]}>{level.label} · {level.severity}</Text>
        </View>

        <Text style={s.touchHint}>Touch and drag on the chart to see values</Text>

        {/* Gemini AI Insight placeholder */}
        <View style={s.geminiBox}>
          <View style={s.geminiHeader}>
            <View style={s.geminiIconWrap}>
              <Ionicons name="sparkles-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={s.geminiTitle}>Resident Advisory</Text>
            <Text style={s.geminiPowered}>powered by Gemini</Text>
            <TouchableOpacity style={s.geminiButton} onPress={async () => {
              try {
                setWaterAiText('');
                setWaterAiLoading(true);
                const txt = await getGeminiInsight({ sensor, history, rainHistory, type: 'water' });
                setWaterAiText(txt);
              } catch (err: any) {
                  setWaterAiText(err?.message || 'Failed to fetch advice.');
              } finally {
                setWaterAiLoading(false);
              }
            }}>
              <Text style={s.geminiButtonText}>What Should I Do?</Text>
            </TouchableOpacity>
          </View>
          <View style={s.geminiContent}>
            {waterAiLoading ? (
              <ActivityIndicator color="#7c3aed" />
            ) : waterAiText ? (
              <ScrollView style={s.geminiResultScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                <Text style={[s.geminiPlaceholder, s.geminiResult]}>{waterAiText}</Text>
              </ScrollView>
            ) : (
              <Text style={s.geminiPlaceholder}>Tap "What Should I Do?" to get actionable advice — what to do, what to prepare, and whether to evacuate.</Text>
            )}
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
            <Text style={s.chartTitle}>Rainfall {period === 'DAY' ? 'Intensity' : 'Total'}</Text>
            <Text style={s.chartSub}>
              {period === 'DAY' ? 'Last 24 hours · from weather API · mm/hr' : period === 'WEEK' ? 'Last 7 days · from weather API · mm/day' : 'Last 30 days · from weather API · mm/day'}
            </Text>
          </View>
          <View style={[s.rainPill, { backgroundColor: rBg }]}>
            <Text style={[s.rainPillText, { color: rColor }]}>{rCur}mm/hr now</Text>
          </View>
        </View>

        {/* Granularity toggle — Today view only */}
        {isDay && (
          <View style={s.granRow}>
            <Text style={s.granLabel}>Interval</Text>
            <View style={s.granToggle}>
              {(['3h', '1h'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.granBtn, dayGranularity === g && s.granBtnActive]}
                  onPress={() => setDayGranularity(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.granBtnText, dayGranularity === g && s.granBtnTextActive]}>Every {g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rainCanScroll && <Text style={s.granHint}>← swipe →</Text>}
          </View>
        )}

        <View style={s.chartArea}>
          <View style={s.yAxis}>
            {rainYLabels.map((v, i) => <Text key={i} style={s.yLabel}>{v}</Text>)}
          </View>
          {rainDisplay.length > 0 ? (
            scrollable ? (
              <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled style={{ flex: 1 }}>
                <View>
                  <BarChart data={rainDisplay} maxVal={rainMax} unit="mm/hr" chartWidth={rainChartW} />
                  <View style={[s.xRow, { width: rainChartW, marginTop: 6 }]}>
                    {rainDisplay.map((h, i) => <Text key={i} style={s.xLabel}>{h.label}</Text>)}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <BarChart data={rainDisplay} maxVal={rainMax} unit={period === 'DAY' ? 'mm/hr' : 'mm'} chartWidth={CHART_W} />
            )
          ) : (
            <View style={{ width: CHART_W, height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>No rainfall history available</Text>
            </View>
          )}
        </View>
        {!scrollable && rainDisplay.length > 0 && (
          <View style={[s.xRow, { marginLeft: Y_AXIS_W + CHART_GAP, width: CHART_W }]}>
            {rainDisplay.map((h, i) => (period === 'MONTH' ? i % 5 === 0 : true) ? <Text key={i} style={s.xLabel}>{h.label}</Text> : null)}
          </View>
        )}

        {/* Rainfall stats strip */}
        {rainHistory.length > 0 && (
          <View style={s.miniStatsRow}>
            <View style={s.miniStat}><Text style={s.miniStatVal}>{rainTotal}</Text><Text style={s.miniStatLbl}>Total mm</Text></View>
            <View style={s.miniDivider} />
            <View style={s.miniStat}><Text style={s.miniStatVal}>{rainPeak}</Text><Text style={s.miniStatLbl}>Peak {period === 'DAY' ? 'mm/hr' : 'mm'}</Text></View>
            <View style={s.miniDivider} />
            <View style={s.miniStat}><Text style={s.miniStatVal}>{rainWetCount}</Text><Text style={s.miniStatLbl}>{period === 'DAY' ? 'Wet hrs' : 'Wet days'}</Text></View>
          </View>
        )}

        <View style={[s.valBox, { backgroundColor: rBg }]}>
          <Text style={[s.valNum, { color: rColor }]}>{rCur}mm/hr</Text>
          <Text style={[s.valLabel, { color: rColor }]}>{rCat} · now</Text>
        </View>

        <Text style={s.touchHint}>Touch and drag on the chart to see values</Text>

        {/* Gemini AI Insight placeholder */}
        <View style={s.geminiBox}>
          <View style={s.geminiHeader}>
            <View style={s.geminiIconWrap}>
              <Ionicons name="sparkles-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={s.geminiTitle}>Resident Advisory</Text>
            <Text style={s.geminiPowered}>powered by Gemini</Text>
            <TouchableOpacity style={s.geminiButton} onPress={async () => {
              try {
                setRainAiText('');
                setRainAiLoading(true);
                const txt = await getGeminiInsight({ sensor, history, rainHistory, type: 'rainfall' });
                setRainAiText(txt);
              } catch (err: any) {
                  setRainAiText(err?.message || 'Failed to fetch advice.');
              } finally {
                setRainAiLoading(false);
              }
            }}>
              <Text style={s.geminiButtonText}>What Should I Do?</Text>
            </TouchableOpacity>
          </View>
          <View style={s.geminiContent}>
            {rainAiLoading ? (
              <ActivityIndicator color="#7c3aed" />
            ) : rainAiText ? (
              <ScrollView style={s.geminiResultScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                <Text style={[s.geminiPlaceholder, s.geminiResult]}>{rainAiText}</Text>
              </ScrollView>
            ) : (
              <Text style={s.geminiPlaceholder}>Tap "What Should I Do?" to get actionable advice — what to do, what to prepare, and whether to evacuate.</Text>
            )}
          </View>
        </View>
      </View>

      {/* Measurement Guide */}
      <View style={[s.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 }]}>
        <View style={s.guideHead}>
          <Ionicons name="book-outline" size={18} color="#0284c7" />
          <Text style={[s.cardTitle, { color: '#0369a1' }]}>Understanding the Measurements</Text>
        </View>

        <Text style={s.guideSection}>Water Level (cm)</Text>
        <Text style={s.guideDesc}>Measured by the field sensor, relative to ground level (0 cm). The higher above ground, the more severe.</Text>
        {[...FLOOD_LEVELS].reverse().map(l => (
          <View key={l.key} style={s.scaleRow}>
            <View style={[s.scaleCm, { backgroundColor: l.color }]}>
              <Text style={s.scaleCmText}>{l.cmLabel}</Text>
            </View>
            <Text style={[s.scaleSeverity, { color: l.color }]}>{l.severity}</Text>
            <Text style={[s.scaleBadge, { color: l.color }]}>{l.label}</Text>
          </View>
        ))}

        <View style={s.guideDivider} />

        <Text style={s.guideSection}>Rainfall Intensity (mm/hr)</Text>
        <Text style={s.guideDesc}>From the weather API — millimeters of rain per hour, based on PAGASA rainfall warning levels.</Text>
        {[
          { range: 'Below 7.5',    label: 'No Warning — below PAGASA warning level',        color: '#2563eb' },
          { range: '7.5–14.9',     label: 'Yellow Warning — stay alert in flood-prone areas', color: '#ca8a04' },
          { range: '15–30',        label: 'Orange Warning — be ready for rapid flooding',     color: '#ea580c' },
          { range: 'Above 30',     label: 'Red Warning — take immediate safety action',       color: '#dc2626' },
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

  card:      { backgroundColor: '#ffffff', borderRadius: 16, padding: CARD_PAD, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
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

  periodRow:       { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 3, gap: 2, flex: 1 },
  periodBtn:       { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  periodText:      { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  periodTextActive:{ color: '#111827', fontWeight: '700' },

  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  calSheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calMonthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  calWeekRow: { flexDirection: 'row', marginBottom: 8 },
  calWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: 2 },
  calCellSelected: { backgroundColor: '#2563eb' },
  calCellToday: { backgroundColor: '#eff6ff' },
  calDayText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  calDayTextSelected: { color: '#ffffff', fontWeight: '700' },
  calDayTextToday: { color: '#2563eb', fontWeight: '700' },

  chartHead:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chartIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  chartSub:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  trendText:  { fontSize: 11, fontWeight: '600' },

  granRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  granLabel:    { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  granToggle:   { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 9, padding: 2, gap: 2 },
  granBtn:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  granBtnActive:{ backgroundColor: '#2563eb' },
  granBtnText:  { fontSize: 11.5, fontWeight: '700', color: '#64748b' },
  granBtnTextActive: { color: '#fff' },
  granHint:     { fontSize: 10, color: '#94a3b8', marginLeft: 'auto', fontStyle: 'italic' },

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
  geminiButton:      { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#7c3aed', borderRadius: 8, marginLeft: 'auto' },
  geminiButtonText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  geminiIconWrap:    { width: 26, height: 26, borderRadius: 8, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  geminiTitle:       { fontSize: 13, fontWeight: '700', color: '#6d28d9', flex: 1 },
  geminiPowered:     { fontSize: 10, color: '#a78bfa' },
  geminiContent:     { padding: 12, flexGrow: 1 },
  geminiPlaceholder: { fontSize: 12, color: '#a78bfa', fontStyle: 'italic', lineHeight: 18 },
  geminiResultScroll: { flex: 1, alignSelf: 'stretch' },
  geminiResult:      { fontStyle: 'normal', color: '#5b21b6', lineHeight: 19, width: '100%' },

  guideHead:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  guideSection: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  guideDesc:    { fontSize: 12, color: '#374151', marginBottom: 10, lineHeight: 17 },
  guideDivider: { height: 0.5, backgroundColor: '#bae6fd', marginVertical: 14 },
  scaleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  scaleDot:     { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  scaleRange:   { fontSize: 12, fontWeight: '700', color: '#111827', width: 80 },
  scaleLabel:   { fontSize: 11, color: '#6b7280', flex: 1 },
  scaleCm:      { width: 58, borderRadius: 7, paddingVertical: 4, alignItems: 'center' },
  scaleCmText:  { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  scaleSeverity:{ flex: 1, fontSize: 12, fontWeight: '600' },
  scaleBadge:   { fontSize: 11.5, fontWeight: '800' },

  // Quick stats row
  statsRow:  { flexDirection: 'row', gap: 10 },
  statCard:  { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statIcon:  { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statVal:   { fontSize: 17, fontWeight: '800' },
  statUnit:  { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  statLbl:   { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  statSrc:   { fontSize: 8.5, fontWeight: '700', color: '#cbd5e1', marginTop: 1, letterSpacing: 0.4, textTransform: 'uppercase' },

  // Mini stats strip inside water chart
  miniStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 10, marginBottom: 10 },
  miniStat:     { flex: 1, alignItems: 'center' },
  miniStatVal:  { fontSize: 14, fontWeight: '800', color: '#111827' },
  miniStatLbl:  { fontSize: 9.5, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
  miniDivider:  { width: 1, height: 24, backgroundColor: '#e2e8f0' },
});