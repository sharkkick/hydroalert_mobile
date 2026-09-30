import { supabase } from './supabase';

export interface SensorReading {
  id: number;
  sensor_id: string;
  distance_cm: number;
  water_level_cm: number;
  latitude: number;
  longitude: number;
  status: string;
  timestamp: string;
  created_at: string;
}

export interface RainfallData {
  current: number; // mm/hr
  description: string;
}

/**
 * Fetch the latest sensor reading from Supabase
 */
export async function getLatestSensorReading(sensorId = 'S-001'): Promise<SensorReading | null> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('sensor_id', sensorId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[sensor-api] Error fetching sensor reading:', error.message);
    return null;
  }

  return data as SensorReading | null;
}

/**
 * Fetch recent sensor readings (for charts)
 */
export async function getRecentReadings(sensorId = 'S-001', limit = 24): Promise<SensorReading[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('sensor_id', sensorId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[sensor-api] Error fetching recent readings:', error.message);
    return [];
  }

  return (data as SensorReading[]) || [];
}

/**
 * Fetch current rainfall from Open-Meteo (free, no API key required).
 */
export async function getCurrentRainfall(lat = 14.36015, lon = 120.9305): Promise<RainfallData> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'precipitation,weather_code',
      timezone: 'auto',
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    const rainfall = data?.current?.precipitation ?? 0; // mm in the current hour
    const code = data?.current?.weather_code ?? 0;
    const description = mapWmoCode(code, rainfall).label.toLowerCase();

    return { current: Math.round(rainfall * 10) / 10, description };
  } catch (err) {
    console.error('[sensor-api] Error fetching rainfall:', err);
    return { current: 0, description: 'unavailable' };
  }
}

// ── Flood Alert Levels (water level in cm, relative to ground = 0cm) ────────────
// Single source of truth shared by the Home and Status screens.

export type FloodLevelKey = 'safe' | 'watch' | 'low' | 'warning' | 'relocate' | 'critical';

export interface FloodLevel {
  key: FloodLevelKey;
  threshold: number;   // minimum water level (cm) for this level; -Infinity for the lowest
  cmLabel: string;     // e.g. "-40 cm", "150 cm"
  severity: string;    // e.g. "Normal", "Critical severity"
  label: string;       // short badge label, e.g. "SAFE", "CRITICAL"
  color: string;
  bg: string;
  border: string;
  icon: string;        // Ionicons name
  meaning: string;
  action: string;
}

// Ordered from highest severity to lowest for easy threshold matching.
export const FLOOD_LEVELS: FloodLevel[] = [
  {
    key: 'critical', threshold: 150, cmLabel: '150 cm', severity: 'Critical severity', label: 'CRITICAL',
    color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: 'alert',
    meaning: 'Water has reached critical, life-threatening levels. Severe flooding is occurring.',
    action: 'EVACUATE NOW if you have not already. Use the SOS button if trapped. Do not enter floodwater.',
  },
  {
    key: 'relocate', threshold: 90, cmLabel: '90 cm', severity: 'High severity', label: 'RELOCATE',
    color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: 'walk',
    meaning: 'Water is dangerously high. Flooding is significant and rising.',
    action: 'Relocate to higher ground or an evacuation center immediately. Bring your go-bag.',
  },
  {
    key: 'warning', threshold: 40, cmLabel: '40 cm', severity: 'Moderate severity', label: 'WARNING',
    color: '#ea580c', bg: '#ffedd5', border: '#fb923c', icon: 'warning-outline',
    meaning: 'Water level is rising above ground. Low-lying areas are flooding.',
    action: 'Prepare to evacuate. Move valuables up. Avoid crossing flooded roads.',
  },
  {
    key: 'low', threshold: 0, cmLabel: '0 cm', severity: 'Low severity', label: 'LOW',
    color: '#ca8a04', bg: '#fef9c3', border: '#fde047', icon: 'alert-circle-outline',
    meaning: 'Water has reached ground level. Minor flooding possible in low spots.',
    action: 'Stay alert. Prepare your emergency bag and monitor official updates.',
  },
  {
    key: 'watch', threshold: -20, cmLabel: '-20 cm', severity: 'Water rising', label: 'WATCH',
    color: '#0891b2', bg: '#cffafe', border: '#67e8f9', icon: 'trending-up-outline',
    meaning: 'Water is rising toward ground level. No flooding yet, but conditions are worsening.',
    action: 'Keep watch on updates. Know your evacuation route just in case.',
  },
  {
    key: 'safe', threshold: -Infinity, cmLabel: '-40 cm', severity: 'Normal', label: 'SAFE',
    color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: 'checkmark-circle',
    meaning: 'Water levels are within the safe range. No immediate threat.',
    action: 'No action needed. Stay informed and monitor updates.',
  },
];

/**
 * Get the flood alert level for a given water level in cm (relative to ground).
 */
export function getFloodLevel(waterLevelCm: number): FloodLevel {
  return FLOOD_LEVELS.find(l => waterLevelCm >= l.threshold) ?? FLOOD_LEVELS[FLOOD_LEVELS.length - 1];
}

/**
 * Backwards-compatible water status helper (now cm-based, 6-level scale).
 */
export function getWaterLevelStatus(waterLevelCm: number): {
  status: FloodLevelKey;
  label: string;
  color: string;
} {
  const lvl = getFloodLevel(waterLevelCm);
  return { status: lvl.key, label: lvl.label, color: lvl.color };
}

/**
 * Get rainfall warning level based on PAGASA thresholds
 */
export function getRainfallWarning(rainfallMmHr: number): {
  level: string;
  color: string;
  bg: string;
} {
  if (rainfallMmHr >= 30) return { level: 'Red Warning', color: '#dc2626', bg: '#fee2e2' };
  if (rainfallMmHr >= 15) return { level: 'Orange Warning', color: '#ea580c', bg: '#ffedd5' };
  if (rainfallMmHr >= 7.5) return { level: 'Yellow Warning', color: '#ca8a04', bg: '#fef9c3' };
  return { level: 'No Warning', color: '#2563eb', bg: '#eff6ff' };
}

// ── Forecast Types ────────────────────────────────────────────────────────────

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavy-rain' | 'thunderstorm';

export interface HourlyPoint {
  time: string;         // ISO "2026-10-01T15:00"
  hourLabel: string;    // e.g. "3PM"
  precipitation: number;// mm for that hour
  pop: number;          // probability of precipitation 0-100
}

export interface DayForecast {
  date: string;         // e.g. "2026-10-01"
  dayLabel: string;     // e.g. "Today", "Tomorrow", "Thursday"
  shortLabel: string;   // e.g. "Tod", "Mon"
  maxTemp: number;
  minTemp: number;
  maxPop: number;       // Highest precipitation probability for the day (0-100)
  totalRain: number;    // Total expected rain in mm for the day
  weatherKind: WeatherKind;
  weatherLabel: string; // human readable, e.g. "Heavy rain"
  peakHour: string | null; // hour label of the wettest hour, e.g. "3PM"
  hours: HourlyPoint[]; // hourly points for this day
}

export interface ForecastSummary {
  rainExpected: boolean;
  heavyRainExpected: boolean;
  daysWithRain: number;
  totalRainWeek: number; // total mm across the forecast window
  nextRainDate: string | null;
  nextRainLabel: string | null;
  summaryText: string;
  summaryLevel: 'safe' | 'watch' | 'danger';
  days: DayForecast[];
}

/**
 * Map a WMO weather code (Open-Meteo) to a simplified weather kind + label.
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
function mapWmoCode(code: number, rainMm: number): { kind: WeatherKind; label: string } {
  if (code >= 95) return { kind: 'thunderstorm', label: 'Thunderstorm' };
  if (code >= 80 || rainMm >= 15) return { kind: 'heavy-rain', label: 'Heavy rain' };
  if (code >= 61) return { kind: 'rain', label: 'Rain' };
  if (code >= 51) return { kind: 'drizzle', label: 'Light rain' };
  if (code >= 45) return { kind: 'fog', label: 'Fog' };
  if (code >= 1) return { kind: 'cloudy', label: 'Cloudy' };
  return { kind: 'clear', label: 'Clear' };
}

function hourLabel(iso: string): string {
  const h = parseInt(iso.slice(11, 13), 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}${ampm}`;
}

/**
 * Fetch a 7-day rainfall forecast from Open-Meteo (free, no API key required).
 */
export async function getRainfallForecast(lat = 14.36015, lon = 120.9305): Promise<ForecastSummary> {
  const emptyResult: ForecastSummary = {
    rainExpected: false,
    heavyRainExpected: false,
    daysWithRain: 0,
    totalRainWeek: 0,
    nextRainDate: null,
    nextRainLabel: null,
    summaryText: 'Forecast unavailable',
    summaryLevel: 'safe',
    days: [],
  };

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'weather_code,precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min',
      hourly: 'precipitation,precipitation_probability',
      timezone: 'auto',
      forecast_days: '7',
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data?.daily?.time?.length) return emptyResult;

    const todayStr = formatDateStr(new Date());

    // Group hourly points by their date (YYYY-MM-DD)
    const hourlyByDate = new Map<string, HourlyPoint[]>();
    const hTimes: string[] = data.hourly?.time ?? [];
    const hPrecip: number[] = data.hourly?.precipitation ?? [];
    const hPop: number[] = data.hourly?.precipitation_probability ?? [];
    for (let i = 0; i < hTimes.length; i++) {
      const iso = hTimes[i];
      const date = iso.slice(0, 10);
      const point: HourlyPoint = {
        time: iso,
        hourLabel: hourLabel(iso),
        precipitation: hPrecip[i] ?? 0,
        pop: hPop[i] ?? 0,
      };
      const arr = hourlyByDate.get(date) || [];
      arr.push(point);
      hourlyByDate.set(date, arr);
    }

    const d = data.daily;
    const days: DayForecast[] = d.time.map((date: string, i: number) => {
      const totalRain = Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10;
      const code = d.weather_code[i] ?? 0;
      const { kind, label } = mapWmoCode(code, totalRain);
      const hours = hourlyByDate.get(date) || [];

      // Find wettest hour of the day
      let peakHour: string | null = null;
      let peakVal = 0;
      for (const hp of hours) {
        if (hp.precipitation > peakVal) {
          peakVal = hp.precipitation;
          peakHour = hp.hourLabel;
        }
      }

      return {
        date,
        dayLabel: getDayLabel(date, todayStr),
        shortLabel: getShortLabel(date, todayStr),
        maxTemp: Math.round(d.temperature_2m_max[i] ?? 0),
        minTemp: Math.round(d.temperature_2m_min[i] ?? 0),
        maxPop: Math.round(d.precipitation_probability_max[i] ?? 0),
        totalRain,
        weatherKind: kind,
        weatherLabel: label,
        peakHour: peakVal > 0.2 ? peakHour : null,
        hours,
      } as DayForecast;
    });

    const daysWithRain = days.filter(day => day.maxPop >= 40 || day.totalRain > 1).length;
    const heavyRainDays = days.filter(day => day.totalRain >= 15 || day.weatherKind === 'heavy-rain' || day.weatherKind === 'thunderstorm');
    const nextRainDay = days.find(day => day.maxPop >= 40 || day.totalRain > 1);
    const totalRainWeek = Math.round(days.reduce((sum, day) => sum + day.totalRain, 0) * 10) / 10;

    let summaryText = 'No significant rain expected this week. Conditions look calm.';
    let summaryLevel: ForecastSummary['summaryLevel'] = 'safe';
    if (heavyRainDays.length > 0) {
      summaryText = `Heavy rain expected ${heavyRainDays[0].dayLabel.toLowerCase()}. Prepare for possible flooding.`;
      summaryLevel = 'danger';
    } else if (daysWithRain > 0 && nextRainDay) {
      summaryText = `Rain likely ${nextRainDay.dayLabel.toLowerCase()}. ${daysWithRain} of the next ${days.length} days may see rain.`;
      summaryLevel = 'watch';
    }

    return {
      rainExpected: daysWithRain > 0,
      heavyRainExpected: heavyRainDays.length > 0,
      daysWithRain,
      totalRainWeek,
      nextRainDate: nextRainDay?.date ?? null,
      nextRainLabel: nextRainDay?.dayLabel ?? null,
      summaryText,
      summaryLevel,
      days,
    };
  } catch (err) {
    console.error('[sensor-api] Error fetching forecast:', err);
    return emptyResult;
  }
}

// ── Rainfall history (Open-Meteo, past data) ───────────────────────────────────

export interface RainfallHistoryPoint {
  label: string;   // e.g. "3PM" or "Mon" or "Oct 1"
  value: number;   // mm/hr (DAY) or mm/day total (WEEK/MONTH)
}

/**
 * Fetch historical rainfall from Open-Meteo.
 * - 'DAY'   → last 24 hours, hourly mm (intensity per hour)
 * - 'WEEK'  → last 7 days, daily total mm
 * - 'MONTH' → last ~30 days, daily total mm
 */
export async function getRainfallHistory(
  period: 'DAY' | 'WEEK' | 'MONTH',
  lat = 14.36015,
  lon = 120.9305,
): Promise<RainfallHistoryPoint[]> {
  try {
    if (period === 'DAY') {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        hourly: 'precipitation',
        past_days: '1',
        forecast_days: '1',
        timezone: 'auto',
      });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      const data = await res.json();
      const times: string[] = data?.hourly?.time ?? [];
      const precip: number[] = data?.hourly?.precipitation ?? [];
      if (!times.length) return [];

      // Take the 24 hours ending at "now"
      const now = Date.now();
      const rows = times
        .map((t, i) => ({ t: new Date(t).getTime(), iso: t, v: precip[i] ?? 0 }))
        .filter(r => r.t <= now)
        .slice(-24);

      return rows.map(r => ({
        label: hourLabel(r.iso),
        value: Math.round(r.v * 10) / 10,
      }));
    }

    // WEEK / MONTH → daily totals
    const pastDays = period === 'WEEK' ? 7 : 30;
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'precipitation_sum',
      past_days: String(pastDays),
      forecast_days: '1',
      timezone: 'auto',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const data = await res.json();
    const days: string[] = data?.daily?.time ?? [];
    const sums: number[] = data?.daily?.precipitation_sum ?? [];
    if (!days.length) return [];

    const todayStr = formatDateStr(new Date());
    const rows = days
      .map((d, i) => ({ d, v: sums[i] ?? 0 }))
      .filter(r => r.d <= todayStr)
      .slice(-pastDays);

    return rows.map(r => {
      const dt = new Date(r.d);
      const label = period === 'WEEK'
        ? dt.toLocaleDateString([], { weekday: 'short' })
        : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return { label, value: Math.round(r.v * 10) / 10 };
    });
  } catch (err) {
    console.error('[sensor-api] Error fetching rainfall history:', err);
    return [];
  }
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(dateStr: string, todayStr: string): string {
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[target.getDay()];
}

function getShortLabel(dateStr: string, todayStr: string): string {
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tom';
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return short[target.getDay()];
}
