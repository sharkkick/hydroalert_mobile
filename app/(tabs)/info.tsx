import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Rect, ClipPath, G } from 'react-native-svg';
import { getLatestSensorReading, getCurrentRainfall, getFloodLevel, getRainfallWarning, FLOOD_LEVELS, type SensorReading } from '../../lib/sensor-api';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// Gauge scale (cm). Ground level is 0.
const SCALE_MIN = -40;
const SCALE_MAX = 150;
const MARKS = [150, 90, 40, 0, -20, -40];

// SVG canvas dims for the gauge tube
const TUBE_W = 120;
const TUBE_H = 320;
const WAVE_AMP = 6; // wave crest amplitude

function cmToTop(cm: number) {
  // y coordinate (from top of the svg) for a given cm value
  const clamped = Math.min(Math.max(cm, SCALE_MIN), SCALE_MAX);
  const ratio = (clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
  return TUBE_H - ratio * TUBE_H;
}

// ── Animated SVG water gauge ──
function WaterGauge({ cm, color, lightColor }: { cm: number; color: string; lightColor: string }) {
  const level = useRef(new Animated.Value(cmToTop(SCALE_MIN))).current; // y of water surface
  const phase = useRef(new Animated.Value(0)).current;                  // wave animation 0..1

  useEffect(() => {
    Animated.timing(level, {
      toValue: cmToTop(cm),
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [cm, level]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(phase, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Build a wavy water path. We animate the "d" by interpolating the surface y.
  // Two wave shapes (phase 0 and phase 1) that we cross-fade via translateX of a wide path.
  const waveShift = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -TUBE_W] });

  // The animated surface path uses the current level; we render a wide (2x) wave and slide it.
  const dPath = level.interpolate({
    inputRange: [0, TUBE_H],
    outputRange: [buildWavePath(0), buildWavePath(TUBE_H)],
  });

  const groundY = cmToTop(0);

  return (
    <View style={g.wrap}>
      {/* cm scale on the left */}
      <View style={[g.scale, { height: TUBE_H }]}>
        {MARKS.map(m => {
          const lvl = getFloodLevel(m);
          const top = cmToTop(m) - 9;
          return (
            <View key={m} style={[g.markRow, { top }]}>
              <Text style={[g.markCm, m === 0 && g.markCmGround]}>{m > 0 ? `+${m}` : m}</Text>
              <View style={[g.markDot, { backgroundColor: m === 0 ? '#b45309' : lvl.color }]} />
            </View>
          );
        })}
      </View>

      {/* SVG tube */}
      <View style={g.tubeShadow}>
        <Svg width={TUBE_W} height={TUBE_H}>
          <Defs>
            <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lightColor} stopOpacity="0.95" />
              <Stop offset="1" stopColor={color} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="tubeGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#eef2f7" />
              <Stop offset="0.5" stopColor="#f8fafc" />
              <Stop offset="1" stopColor="#e2e8f0" />
            </LinearGradient>
            <ClipPath id="tubeClip">
              <Rect x="0" y="0" width={TUBE_W} height={TUBE_H} rx="24" ry="24" />
            </ClipPath>
          </Defs>

          <G clipPath="url(#tubeClip)">
            {/* tube background */}
            <Rect x="0" y="0" width={TUBE_W} height={TUBE_H} fill="url(#tubeGrad)" />

            {/* severity zone bands */}
            {FLOOD_LEVELS.slice().reverse().map((lvl, i, arr) => {
              const next = arr[i + 1];
              const yTop = next ? cmToTop(next.threshold) : 0;
              const yBottom = cmToTop(lvl.threshold === -Infinity ? SCALE_MIN : lvl.threshold);
              return <Rect key={lvl.key} x="0" y={yTop} width={TUBE_W} height={Math.max(0, yBottom - yTop)} fill={lvl.bg} opacity={0.55} />;
            })}

            {/* faint gridlines at each mark */}
            {MARKS.map(m => (
              <Line key={m} x1="0" y1={cmToTop(m)} x2={TUBE_W} y2={cmToTop(m)} stroke="#0f172a" strokeOpacity={0.06} strokeWidth={1} />
            ))}

            {/* animated water (wavy top) */}
            <AnimatedG style={{ transform: [{ translateX: waveShift }] }}>
              <AnimatedPath d={dPath as any} fill="url(#waterGrad)" />
            </AnimatedG>

            {/* ground line at 0cm */}
            <Line x1="0" y1={groundY} x2={TUBE_W} y2={groundY} stroke="#b45309" strokeWidth={2.5} strokeDasharray="6 4" />
          </G>

          {/* tube outline on top — clipped so the stroke follows the exact rounded shape */}
          <Rect x="0" y="0" width={TUBE_W} height={TUBE_H} rx="24" ry="24" fill="none" stroke="#cbd5e1" strokeWidth={2} clipPath="url(#tubeClip)" />
        </Svg>

        {/* GROUND tag */}
        <View style={[g.groundTag, { top: groundY - 9 }]}>
          <MaterialCommunityIcons name="terrain" size={10} color="#b45309" />
          <Text style={g.groundText}>GROUND</Text>
        </View>

        {/* value pill following the surface */}
        <Animated.View style={[g.valuePill, { top: Animated.subtract(level, 16) }]}>
          <View style={[g.valuePillInner, { borderColor: color }]}>
            <Text style={[g.valueNum, { color }]}>{cm > 0 ? '+' : ''}{cm}</Text>
            <Text style={g.valueUnit}>cm</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// Build a wide (2×TUBE_W) wavy path whose flat bottom is at TUBE_H and whose surface sits at y.
function buildWavePath(y: number) {
  const w = TUBE_W;
  const a = WAVE_AMP;
  // Two full sine periods across 2w so sliding by w keeps it seamless.
  return [
    `M 0 ${y}`,
    `C ${w * 0.25} ${y - a}, ${w * 0.25} ${y + a}, ${w * 0.5} ${y}`,
    `C ${w * 0.75} ${y - a}, ${w * 0.75} ${y + a}, ${w} ${y}`,
    `C ${w * 1.25} ${y - a}, ${w * 1.25} ${y + a}, ${w * 1.5} ${y}`,
    `C ${w * 1.75} ${y - a}, ${w * 1.75} ${y + a}, ${w * 2} ${y}`,
    `L ${w * 2} ${TUBE_H}`,
    `L 0 ${TUBE_H} Z`,
  ].join(' ');
}

export default function FloodStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [rainfall, setRainfall] = useState<{ current: number; description: string }>({ current: 0, description: '' });

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
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ marginTop: 12, color: '#94a3b8' }}>Connecting to field sensor…</Text>
      </View>
    );
  }

  const hasData = !!sensorData;
  const waterCm = sensorData ? Math.round(sensorData.water_level_cm * 10) / 10 : SCALE_MIN;
  const st = getFloodLevel(waterCm);
  const rainWarn = getRainfallWarning(rainfall.current);
  const lastUpdated = sensorData?.timestamp
    ? new Date(sensorData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Live header */}
      <View style={s.liveHeader}>
        <View style={[s.liveDotWrap, { backgroundColor: hasData ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)' }]}>
          <View style={[s.liveDot, { backgroundColor: hasData ? '#22c55e' : '#94a3b8' }]} />
          <Text style={[s.liveText, { color: hasData ? '#22c55e' : '#94a3b8' }]}>{hasData ? 'LIVE' : 'OFFLINE'}</Text>
        </View>
        <Text style={s.liveSub}>Field sensor · real-time</Text>
        <View style={s.liveUpdated}>
          <Ionicons name="time-outline" size={12} color="#94a3b8" />
          <Text style={s.liveUpdatedText}>{lastUpdated}</Text>
        </View>
      </View>

      {/* Main gauge card */}
      <View style={s.gaugeCard}>
        {/* status ribbon */}
        <View style={[s.ribbon, { backgroundColor: st.color }]}>
          <Ionicons name={st.icon as any} size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={s.ribbonLabel}>{st.label}</Text>
            <Text style={s.ribbonSeverity}>{st.severity}</Text>
          </View>
          <View style={s.ribbonBrg}>
            <Text style={s.ribbonBrgName}>Brgy. Medicion II-F</Text>
            <Text style={s.ribbonBrgArea}>Imus, Cavite · S-001</Text>
          </View>
        </View>

        <WaterGauge cm={waterCm} color={st.color} lightColor={st.border} />

        <View style={[s.captionBox, { backgroundColor: st.bg }]}>
          <Ionicons name="information-circle" size={15} color={st.color} />
          <Text style={[s.captionText, { color: st.color }]}>{st.action}</Text>
        </View>
      </View>

      {/* Metric tiles */}
      <View style={s.tiles}>
        <View style={s.tile}>
          <View style={[s.tileIcon, { backgroundColor: st.bg }]}>
            <MaterialCommunityIcons name="waves-arrow-up" size={18} color={st.color} />
          </View>
          <Text style={[s.tileVal, { color: st.color }]}>{waterCm > 0 ? '+' : ''}{waterCm}<Text style={s.tileUnit}> cm</Text></Text>
          <Text style={s.tileLbl}>Water level</Text>
        </View>
        <View style={s.tile}>
          <View style={[s.tileIcon, { backgroundColor: rainWarn.bg }]}>
            <MaterialCommunityIcons name="weather-pouring" size={18} color={rainWarn.color} />
          </View>
          <Text style={[s.tileVal, { color: rainWarn.color }]}>{rainfall.current}<Text style={s.tileUnit}> mm/hr</Text></Text>
          <Text style={s.tileLbl}>{rainWarn.level}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legendCard}>
        <Text style={s.cardHeading}>What do these levels mean?</Text>
        <Text style={s.legendBody}>Water level is measured relative to ground (0 cm). The higher above ground, the more severe.</Text>
        <View style={s.legendItems}>
          {[...FLOOD_LEVELS].reverse().map(l => {
            const active = l.key === st.key && hasData;
            return (
              <View key={l.key} style={[s.legendRow, active && { backgroundColor: l.bg, borderColor: l.color }]}>
                <View style={[s.legendCm, { backgroundColor: l.color }]}>
                  <Text style={s.legendCmText}>{l.cmLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.legendLabel, { color: l.color }]}>{l.label}</Text>
                  <Text style={s.legendSeverity}>{l.severity}</Text>
                </View>
                {active && (
                  <View style={[s.legendNow, { backgroundColor: l.color }]}>
                    <Text style={s.legendNowText}>NOW</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

// ── Gauge styles ──
const g = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginVertical: 20, paddingRight: 30 },
  scale:  { width: 56, marginRight: 12, position: 'relative' },
  markRow:{ position: 'absolute', right: 0, height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, width: '100%' },
  markCm: { fontSize: 11.5, fontWeight: '700', color: '#64748b' },
  markCmGround: { color: '#b45309', fontWeight: '800' },
  markDot:{ width: 7, height: 7, borderRadius: 4 },

  tubeShadow: { position: 'relative' },

  groundTag:  { position: 'absolute', left: TUBE_W + 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#fde68a' },
  groundText: { fontSize: 8, fontWeight: '800', color: '#b45309', letterSpacing: 0.5 },

  valuePill:      { position: 'absolute', left: TUBE_W - 20 },
  valuePillInner: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', borderWidth: 2, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, gap: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  valueNum:       { fontSize: 17, fontWeight: '800' },
  valueUnit:      { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
});

// ── Screen styles ──
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:    { padding: 14, gap: 14, paddingBottom: 36 },

  liveHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  liveDotWrap:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  liveDot:      { width: 7, height: 7, borderRadius: 4 },
  liveText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  liveSub:      { flex: 1, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  liveUpdated:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveUpdatedText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  gaugeCard:    { backgroundColor: '#ffffff', borderRadius: 26, padding: 14, paddingBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 5 },
  ribbon:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 12 },
  ribbonLabel:  { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  ribbonSeverity:{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 1 },
  ribbonBrg:    { alignItems: 'flex-end' },
  ribbonBrgName:{ fontSize: 11.5, fontWeight: '700', color: '#fff' },
  ribbonBrgArea:{ fontSize: 9.5, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  captionBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, marginTop: 4 },
  captionText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  tiles:    { flexDirection: 'row', gap: 12 },
  tile:     { flex: 1, backgroundColor: '#ffffff', borderRadius: 20, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileVal:  { fontSize: 20, fontWeight: '800' },
  tileUnit: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  tileLbl:  { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 3 },

  cardHeading:{ fontSize: 14.5, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  legendCard:     { backgroundColor: '#ffffff', borderRadius: 20, padding: 16 },
  legendBody:     { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 12, marginTop: -4 },
  legendItems:    { gap: 7 },
  legendRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  legendCm:       { width: 52, borderRadius: 9, paddingVertical: 5, alignItems: 'center' },
  legendCmText:   { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  legendLabel:    { fontSize: 13, fontWeight: '800' },
  legendSeverity: { fontSize: 11, color: '#64748b', marginTop: 1 },
  legendNow:      { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  legendNowText:  { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
