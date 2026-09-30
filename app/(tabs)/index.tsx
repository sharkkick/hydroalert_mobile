import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getRainfallForecast, ForecastSummary, DayForecast, WeatherKind,
  FLOOD_LEVELS, getFloodLevel, getLatestSensorReading, getCurrentRainfall,
} from '../../lib/sensor-api';

const SENSOR_ID = 'S-001';

const RAINFALL_GUIDE = [
  { label: 'No Warning',      range: 'Below 7.5mm/hr',  color: '#2563eb', bg: '#eff6ff',  desc: 'Rainfall is below PAGASA warning level.' },
  { label: 'Yellow Warning',  range: '7.5 – 14.9mm/hr', color: '#ca8a04', bg: '#fef9c3',  desc: 'Heavy rainfall. Stay alert in flood-prone areas.' },
  { label: 'Orange Warning',  range: '15 – 30mm/hr',    color: '#ea580c', bg: '#ffedd5',  desc: 'Intense rainfall. Be ready for rapid flooding.' },
  { label: 'Red Warning',     range: 'Above 30mm/hr',   color: '#dc2626', bg: '#fee2e2',  desc: 'Torrential rainfall. Take immediate safety action.' },
];

const SAFETY_TIPS = [
  { icon: 'bag-outline' as const,             tip: 'Prepare a "Go Bag" — water, food, documents, medicine, flashlight, phone charger.' },
  { icon: 'map-outline' as const,             tip: 'Know your nearest evacuation center and two routes to get there.' },
  { icon: 'phone-portrait-outline' as const,  tip: 'Keep your phone charged. Save local DRRMO and emergency numbers.' },
  { icon: 'water-outline' as const,           tip: 'Never cross floodwater on foot or by vehicle — 6 inches can knock you down.' },
  { icon: 'home-outline' as const,            tip: 'Move important items and documents to upper floors before flooding.' },
  { icon: 'people-outline' as const,          tip: 'Check on elderly neighbors and those with disabilities — they may need help evacuating.' },
];

// Weather kind → icon + accent color
const WEATHER_ICON: Record<WeatherKind, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  'clear':        { icon: 'weather-sunny',        color: '#f59e0b' },
  'cloudy':       { icon: 'weather-partly-cloudy',color: '#64748b' },
  'fog':          { icon: 'weather-fog',          color: '#94a3b8' },
  'drizzle':      { icon: 'weather-partly-rainy', color: '#38bdf8' },
  'rain':         { icon: 'weather-rainy',        color: '#2563eb' },
  'heavy-rain':   { icon: 'weather-pouring',      color: '#1d4ed8' },
  'thunderstorm': { icon: 'weather-lightning-rainy', color: '#7c3aed' },
};

const SUMMARY_THEME = {
  safe:   { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', icon: 'shield-checkmark' as const },
  watch:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: 'alert-circle' as const },
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: 'warning' as const },
};

function getRainfallCategory(r: number) {
  if (r < 7.5) return RAINFALL_GUIDE[0];
  if (r < 15)  return RAINFALL_GUIDE[1];
  if (r < 30)  return RAINFALL_GUIDE[2];
  return RAINFALL_GUIDE[3];
}

export default function HomeScreen() {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  // ── Live sensor + rainfall ──
  const [waterCm, setWaterCm] = useState<number | null>(null);
  const [rainRate, setRainRate] = useState<number>(0);
  const [sensorLoading, setSensorLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    const [reading, rain] = await Promise.all([
      getLatestSensorReading(SENSOR_ID),
      getCurrentRainfall(),
    ]);
    if (reading) setWaterCm(Math.round(reading.water_level_cm * 10) / 10);
    setRainRate(rain.current);
    setSensorLoading(false);
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 15000); // refresh every 15s
    return () => clearInterval(id);
  }, [fetchLive]);

  const currentAlert   = getFloodLevel(waterCm ?? -40);
  const currentRainCat = getRainfallCategory(rainRate);
  const hasReading     = waterCm !== null;

  useEffect(() => {
    getRainfallForecast()
      .then(setForecast)
      .finally(() => setForecastLoading(false));
  }, []);

  const days = forecast?.days.slice(0, 7) ?? [];
  const activeDay: DayForecast | undefined = days[selectedDay];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── HERO STATUS HEADER ── */}
      <View style={[s.hero, { backgroundColor: currentAlert.color }]}>
        <View style={s.heroGlowTop} />
        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroKicker}>CURRENT FLOOD ALERT</Text>
            {sensorLoading ? (
              <Text style={s.heroTitle}>—</Text>
            ) : (
              <>
                <Text style={s.heroTitle}>{hasReading ? currentAlert.label : 'NO DATA'}</Text>
                <Text style={s.heroSeverity}>{hasReading ? currentAlert.severity : 'Waiting for sensor'}</Text>
              </>
            )}
          </View>
          <View style={s.heroIconWrap}>
            <Ionicons name={(hasReading ? currentAlert.icon : 'cloud-offline-outline') as any} size={30} color="#fff" />
          </View>
        </View>

        <View style={s.heroStatsRow}>
          <View style={s.heroStat}>
            <Ionicons name="water" size={16} color="rgba(255,255,255,0.9)" />
            <View>
              <Text style={s.heroStatValue}>{hasReading ? `${waterCm! > 0 ? '+' : ''}${waterCm} cm` : '—'}</Text>
              <Text style={s.heroStatLabel}>Water level</Text>
            </View>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <MaterialCommunityIcons name="weather-rainy" size={16} color="rgba(255,255,255,0.9)" />
            <View>
              <Text style={s.heroStatValue}>{rainRate}mm/hr</Text>
              <Text style={s.heroStatLabel}>{currentRainCat.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.heroActionBox}>
          <Text style={s.heroActionText}>{hasReading ? currentAlert.action : 'No live reading from the field sensor yet. Showing last known state.'}</Text>
        </View>
      </View>

      {/* ── RAIN FORECAST (redesigned) ── */}
      <View style={s.forecastCard}>
        <View style={s.forecastHead}>
          <View style={s.forecastHeadLeft}>
            <View style={s.forecastHeadIcon}>
              <MaterialCommunityIcons name="weather-partly-rainy" size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={s.forecastTitle}>Rain Forecast</Text>
              <Text style={s.forecastSub}>7-day outlook · Open-Meteo</Text>
            </View>
          </View>
          {forecast && (
            <View style={s.weekTotalPill}>
              <MaterialCommunityIcons name="cup-water" size={12} color="#1d4ed8" />
              <Text style={s.weekTotalText}>{forecast.totalRainWeek}mm</Text>
            </View>
          )}
        </View>

        {forecastLoading ? (
          <View style={{ paddingVertical: 34, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Loading forecast…</Text>
          </View>
        ) : forecast && days.length > 0 ? (
          <>
            {/* Summary banner */}
            {(() => {
              const th = SUMMARY_THEME[forecast.summaryLevel];
              return (
                <View style={[s.summaryBox, { backgroundColor: th.bg, borderColor: th.border }]}>
                  <Ionicons name={th.icon} size={18} color={th.text} />
                  <Text style={[s.summaryText, { color: th.text }]}>{forecast.summaryText}</Text>
                </View>
              );
            })()}

            {/* Day selector strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dayStrip}
            >
              {days.map((day, i) => {
                const wi = WEATHER_ICON[day.weatherKind];
                const active = i === selectedDay;
                return (
                  <TouchableOpacity
                    key={day.date}
                    activeOpacity={0.85}
                    onPress={() => setSelectedDay(i)}
                    style={[s.dayChip, active && s.dayChipActive]}
                  >
                    <Text style={[s.dayChipLabel, active && { color: '#fff' }]}>{day.shortLabel}</Text>
                    <MaterialCommunityIcons
                      name={wi.icon}
                      size={26}
                      color={active ? '#fff' : wi.color}
                    />
                    <Text style={[s.dayChipPop, active && { color: '#dbeafe' }]}>{day.maxPop}%</Text>
                    <View style={[s.dayChipRainDot, { backgroundColor: active ? 'rgba(255,255,255,0.85)' : wi.color }]} />
                    <Text style={[s.dayChipRain, active && { color: '#fff' }]}>{day.totalRain}mm</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected day detail */}
            {activeDay && <DayDetail day={activeDay} />}
          </>
        ) : (
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Unable to load forecast data.</Text>
        )}
      </View>

      {/* ── FLOOD ALERT LEVELS ── */}
      <View style={s.card}>
        <SectionTitle icon="layers-outline" title="Flood Alert Levels" sub="Based on water level above ground (0 cm). Tap a level for details." />
        {FLOOD_LEVELS.map(level => {
          const isExpanded = expandedAlert === level.key;
          const isCurrent  = hasReading && level.key === currentAlert.key;
          return (
            <TouchableOpacity
              key={level.key}
              style={[s.alertRow, isCurrent && { borderColor: level.color, borderWidth: 1.5, backgroundColor: level.bg }]}
              onPress={() => setExpandedAlert(isExpanded ? null : level.key)}
              activeOpacity={0.7}
            >
              <View style={[s.alertDot, { backgroundColor: level.bg }]}>
                <Ionicons name={level.icon as any} size={18} color={level.color} />
              </View>
              <View style={s.alertInfo}>
                <View style={s.alertLabelRow}>
                  <Text style={[s.alertLabel, { color: level.color }]}>{level.label}</Text>
                  <View style={[s.cmChip, { backgroundColor: level.bg }]}>
                    <Text style={[s.cmChipText, { color: level.color }]}>{level.cmLabel}</Text>
                  </View>
                  {isCurrent && (
                    <View style={[s.currentBadge, { backgroundColor: level.color }]}>
                      <Text style={s.currentBadgeText}>NOW</Text>
                    </View>
                  )}
                </View>
                <Text style={s.alertRange}>{level.severity}</Text>
                {isExpanded && (
                  <View style={[s.alertExpanded, { backgroundColor: level.bg }]}>
                    <Text style={[s.alertExpandedTitle, { color: level.color }]}>What it means</Text>
                    <Text style={s.alertExpandedText}>{level.meaning}</Text>
                    <Text style={[s.alertExpandedTitle, { color: level.color, marginTop: 8 }]}>What to do</Text>
                    <Text style={s.alertExpandedText}>{level.action}</Text>
                  </View>
                )}
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── RAINFALL INTENSITY GUIDE ── */}
      <View style={s.card}>
        <SectionTitle icon="rainy-outline" title="Rainfall Intensity Guide" sub="How rainfall intensity affects flood risk" />
        {RAINFALL_GUIDE.map(r => (
          <View key={r.label} style={[s.rainRow, { backgroundColor: r.bg }]}>
            <View style={[s.rainBar, { backgroundColor: r.color }]} />
            <View style={s.rainLeft}>
              <Text style={[s.rainLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={[s.rainRange, { color: r.color }]}>{r.range}</Text>
            </View>
            <Text style={s.rainDesc}>{r.desc}</Text>
          </View>
        ))}
      </View>

      {/* ── SAFETY REMINDERS ── */}
      <View style={[s.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }]}>
        <SectionTitle icon="shield-checkmark-outline" title="Safety Reminders" sub="Always be prepared, especially during rainy season" color="#1e40af" />
        {SAFETY_TIPS.map((tip, i) => (
          <View key={i} style={s.tipRow}>
            <View style={s.tipIcon}>
              <Ionicons name={tip.icon} size={16} color="#2563eb" />
            </View>
            <Text style={s.tipText}>{tip.tip}</Text>
          </View>
        ))}
      </View>

      {/* ── EMERGENCY HOTLINES ── */}
      <View style={[s.card, { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }]}>
        <SectionTitle icon="call-outline" title="Emergency Hotlines" sub="Call these in addition to using the SOS button" color="#991b1b" />
        {[
          { name: 'National Emergency',    number: '911'            },
          { name: 'NDRRMC Hotline',        number: '(02) 911-1406'  },
          { name: 'Red Cross Philippines', number: '143'            },
          { name: 'PAGASA Weather',        number: '(02) 8284-0800' },
        ].map((h, i) => (
          <View key={i} style={[s.hotlineRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: '#fecaca' }]}>
            <View style={s.hotlineIcon}>
              <Ionicons name="call" size={13} color="#dc2626" />
            </View>
            <Text style={s.hotlineName}>{h.name}</Text>
            <Text style={s.hotlineNumber}>{h.number}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

// ── Selected day detail: hourly rain bar chart + stats ──
function DayDetail({ day }: { day: DayForecast }) {
  const wi = WEATHER_ICON[day.weatherKind];

  // Sample the day into ~8 slots for a compact bar chart
  const bars = useMemo(() => {
    const hours = day.hours;
    if (hours.length === 0) return [];
    const step = Math.max(1, Math.floor(hours.length / 8));
    const picked = hours.filter((_, i) => i % step === 0).slice(0, 8);
    const maxRain = Math.max(0.5, ...picked.map(h => h.precipitation));
    return picked.map(h => ({
      label: h.hourLabel,
      pct: Math.min(1, h.precipitation / maxRain),
      value: h.precipitation,
      pop: h.pop,
    }));
  }, [day]);

  return (
    <View style={s.detail}>
      <View style={s.detailHead}>
        <View style={[s.detailIconWrap, { backgroundColor: wi.color + '1a' }]}>
          <MaterialCommunityIcons name={wi.icon} size={24} color={wi.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.detailDay}>{day.dayLabel}</Text>
          <Text style={s.detailWeather}>{day.weatherLabel}</Text>
        </View>
        <View style={s.detailTemps}>
          <Text style={s.detailTempMax}>{day.maxTemp}°</Text>
          <Text style={s.detailTempMin}>{day.minTemp}°</Text>
        </View>
      </View>

      <View style={s.detailMetrics}>
        <View style={s.metric}>
          <MaterialCommunityIcons name="water-percent" size={16} color="#2563eb" />
          <Text style={s.metricValue}>{day.maxPop}%</Text>
          <Text style={s.metricLabel}>Chance</Text>
        </View>
        <View style={s.metric}>
          <MaterialCommunityIcons name="weather-pouring" size={16} color="#1d4ed8" />
          <Text style={s.metricValue}>{day.totalRain}mm</Text>
          <Text style={s.metricLabel}>Total rain</Text>
        </View>
        <View style={s.metric}>
          <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#ea580c" />
          <Text style={s.metricValue}>{day.peakHour ?? '—'}</Text>
          <Text style={s.metricLabel}>Peak</Text>
        </View>
      </View>

      {bars.length > 0 && (
        <View style={s.chartWrap}>
          <Text style={s.chartTitle}>Hourly rainfall</Text>
          <View style={s.chart}>
            {bars.map((b, i) => (
              <View key={i} style={s.barCol}>
                <Text style={s.barValue}>{b.value > 0 ? b.value.toFixed(1) : ''}</Text>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      {
                        height: `${Math.max(4, b.pct * 100)}%`,
                        backgroundColor: b.value >= 2 ? '#1d4ed8' : b.value > 0 ? '#60a5fa' : '#e2e8f0',
                      },
                    ]}
                  />
                </View>
                <Text style={s.barLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function SectionTitle({ icon, title, sub, color = '#111827' }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; color?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={s.sectionTitleRow}>
        <Ionicons name={icon} size={17} color={color === '#111827' ? '#2563eb' : color} />
        <Text style={[s.sectionTitle, { color }]}>{title}</Text>
      </View>
      {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2f7' },
  scroll:    { padding: 14, gap: 14, paddingBottom: 36 },

  // Hero
  hero:          { borderRadius: 22, padding: 18, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6 },
  heroGlowTop:   { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroRow:       { flexDirection: 'row', alignItems: 'center' },
  heroKicker:    { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  heroTitle:     { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  heroSeverity:  { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '600', marginTop: 1 },
  heroIconWrap:  { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, marginTop: 16 },
  heroStat:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroStatValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  heroDivider:   { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroActionBox: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.14)', borderRadius: 12, padding: 12 },
  heroActionText:{ color: '#fff', fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  // Forecast card
  forecastCard:    { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  forecastHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forecastHeadLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  forecastHeadIcon:{ width: 34, height: 34, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  forecastTitle:   { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  forecastSub:     { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  weekTotalPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  weekTotalText:   { fontSize: 12, fontWeight: '800', color: '#1d4ed8' },

  summaryBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 14 },
  summaryText: { flex: 1, fontSize: 12.5, fontWeight: '700', lineHeight: 18 },

  dayStrip:  { gap: 8, paddingVertical: 14 },
  dayChip:   { width: 62, borderRadius: 16, backgroundColor: '#f1f5f9', paddingVertical: 10, alignItems: 'center', gap: 5 },
  dayChipActive: { backgroundColor: '#2563eb' },
  dayChipLabel:  { fontSize: 11, fontWeight: '700', color: '#475569' },
  dayChipPop:    { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  dayChipRainDot:{ width: 4, height: 4, borderRadius: 2 },
  dayChipRain:   { fontSize: 9.5, fontWeight: '600', color: '#94a3b8' },

  // Selected day detail
  detail:        { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#eef2f7' },
  detailHead:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIconWrap:{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailDay:     { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  detailWeather: { fontSize: 12, color: '#64748b', marginTop: 1, fontWeight: '600' },
  detailTemps:   { alignItems: 'flex-end' },
  detailTempMax: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  detailTempMin: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },

  detailMetrics: { flexDirection: 'row', marginTop: 14, gap: 8 },
  metric:        { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 2 },
  metricValue:   { fontSize: 13.5, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  metricLabel:   { fontSize: 9.5, fontWeight: '600', color: '#94a3b8' },

  chartWrap:  { marginTop: 14 },
  chartTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  chart:      { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 4 },
  barCol:     { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue:   { fontSize: 8, fontWeight: '700', color: '#2563eb', marginBottom: 2, height: 11 },
  barTrack:   { flex: 1, width: '70%', backgroundColor: '#eef2f7', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:    { width: '100%', borderRadius: 5 },
  barLabel:   { fontSize: 8, fontWeight: '600', color: '#94a3b8', marginTop: 4 },

  // Generic card
  card:        { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:    { fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  sectionSub:      { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 17, marginLeft: 25 },

  alertRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, marginBottom: 6, backgroundColor: '#f8fafc', borderWidth: 0, borderColor: 'transparent' },
  alertDot:      { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertInfo:     { flex: 1 },
  alertLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  alertLabel:    { fontSize: 14, fontWeight: '800' },
  alertRange:    { fontSize: 11, color: '#6b7280' },
  currentBadge:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  currentBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  cmChip:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  cmChipText:    { fontSize: 10, fontWeight: '800' },
  alertExpanded: { marginTop: 10, borderRadius: 12, padding: 12 },
  alertExpandedTitle: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  alertExpandedText:  { fontSize: 12, color: '#374151', lineHeight: 18 },

  rainRow:  { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 10, marginBottom: 6, alignItems: 'center', overflow: 'hidden' },
  rainBar:  { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  rainLeft: { width: 82 },
  rainLabel:{ fontSize: 13, fontWeight: '800' },
  rainRange:{ fontSize: 9, marginTop: 1, opacity: 0.9 },
  rainDesc: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 20 },

  hotlineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  hotlineIcon:  { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  hotlineName:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  hotlineNumber:{ fontSize: 15, fontWeight: '800', color: '#dc2626' },
});
