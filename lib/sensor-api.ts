import { supabase } from './supabase';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '';

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
 * Fetch current rainfall from OpenWeatherMap
 */
export async function getCurrentRainfall(lat = 14.36015, lon = 120.9305): Promise<RainfallData> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    // Rain data is in mm for last 1h or 3h
    const rain1h = data?.rain?.['1h'] ?? 0;
    const rain3h = data?.rain?.['3h'] ?? 0;
    const rainfall = rain1h || (rain3h / 3); // mm/hr

    const description = data?.weather?.[0]?.description ?? 'clear';

    return { current: Math.round(rainfall * 10) / 10, description };
  } catch (err) {
    console.error('[sensor-api] Error fetching rainfall:', err);
    return { current: 0, description: 'unavailable' };
  }
}

/**
 * Get water level status based on mm thresholds
 */
export function getWaterLevelStatus(waterLevelMm: number): {
  status: 'normal' | 'warning' | 'critical';
  label: string;
  color: string;
} {
  if (waterLevelMm >= 75) return { status: 'critical', label: 'Danger', color: '#dc2626' };
  if (waterLevelMm >= 50) return { status: 'warning', label: 'Warning', color: '#ea580c' };
  if (waterLevelMm >= 30) return { status: 'warning', label: 'Watch', color: '#ca8a04' };
  return { status: 'normal', label: 'Safe', color: '#16a34a' };
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

export interface ForecastEntry {
  dt: number;           // Unix timestamp
  date: string;         // e.g. "2026-06-03"
  time: string;         // e.g. "15:00"
  temp: number;         // °C
  feelsLike: number;    // °C
  humidity: number;     // %
  pop: number;          // Probability of precipitation 0-1
  rainVolume: number;   // mm in 3h period
  windSpeed: number;    // m/s
  description: string;  // e.g. "moderate rain"
  icon: string;         // OpenWeatherMap icon code
  main: string;         // e.g. "Rain", "Clouds", "Clear"
}

export interface DayForecast {
  date: string;         // e.g. "2026-06-03"
  dayLabel: string;     // e.g. "Today", "Tomorrow", "Thursday"
  maxTemp: number;
  minTemp: number;
  maxPop: number;       // Highest precipitation probability for the day
  totalRain: number;    // Total expected rain in mm for the day
  dominantWeather: string; // Most common weather condition
  dominantIcon: string;
  entries: ForecastEntry[];
}

export interface ForecastSummary {
  rainExpected: boolean;
  heavyRainExpected: boolean;
  daysWithRain: number;
  nextRainDate: string | null;
  nextRainLabel: string | null;
  summaryText: string;
  days: DayForecast[];
}

/**
 * Fetch 5-day/3-hour rainfall forecast from OpenWeatherMap
 */
export async function getRainfallForecast(lat = 14.36015, lon = 120.9305): Promise<ForecastSummary> {
  const emptyResult: ForecastSummary = {
    rainExpected: false,
    heavyRainExpected: false,
    daysWithRain: 0,
    nextRainDate: null,
    nextRainLabel: null,
    summaryText: 'Forecast unavailable',
    days: [],
  };

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data?.list || data.list.length === 0) return emptyResult;

    const now = new Date();
    const todayStr = formatDateStr(now);

    // Parse all entries
    const entries: ForecastEntry[] = data.list.map((item: any) => {
      const dt = new Date(item.dt * 1000);
      return {
        dt: item.dt,
        date: formatDateStr(dt),
        time: `${String(dt.getHours()).padStart(2, '0')}:00`,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        pop: item.pop ?? 0,
        rainVolume: item.rain?.['3h'] ?? 0,
        windSpeed: item.wind?.speed ?? 0,
        description: item.weather?.[0]?.description ?? '',
        icon: item.weather?.[0]?.icon ?? '01d',
        main: item.weather?.[0]?.main ?? 'Clear',
      };
    });

    // Group by day
    const dayMap = new Map<string, ForecastEntry[]>();
    for (const entry of entries) {
      const existing = dayMap.get(entry.date) || [];
      existing.push(entry);
      dayMap.set(entry.date, existing);
    }

    // Build day forecasts
    const days: DayForecast[] = [];
    for (const [date, dayEntries] of dayMap) {
      const temps = dayEntries.map(e => e.temp);
      const pops = dayEntries.map(e => e.pop);
      const totalRain = dayEntries.reduce((sum, e) => sum + e.rainVolume, 0);

      // Determine dominant weather
      const weatherCounts = new Map<string, number>();
      let dominantIcon = '01d';
      for (const e of dayEntries) {
        weatherCounts.set(e.main, (weatherCounts.get(e.main) || 0) + 1);
      }
      let maxCount = 0;
      let dominantWeather = 'Clear';
      for (const [weather, count] of weatherCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantWeather = weather;
          dominantIcon = dayEntries.find(e => e.main === weather)?.icon || '01d';
        }
      }

      days.push({
        date,
        dayLabel: getDayLabel(date, todayStr),
        maxTemp: Math.max(...temps),
        minTemp: Math.min(...temps),
        maxPop: Math.max(...pops),
        totalRain: Math.round(totalRain * 10) / 10,
        dominantWeather,
        dominantIcon,
        entries: dayEntries,
      });
    }

    // Build summary
    const daysWithRain = days.filter(d => d.maxPop >= 0.3 || d.totalRain > 0.5).length;
    const heavyRainDays = days.filter(d => d.totalRain >= 15 || d.maxPop >= 0.8);
    const nextRainDay = days.find(d => d.maxPop >= 0.3 || d.totalRain > 0.5);

    let summaryText = 'No significant rain expected in the next 5 days.';
    if (heavyRainDays.length > 0) {
      summaryText = `⚠️ Heavy rain expected ${heavyRainDays[0].dayLabel.toLowerCase()}. Prepare for possible flooding.`;
    } else if (daysWithRain > 0 && nextRainDay) {
      summaryText = `🌧️ Rain expected ${nextRainDay.dayLabel.toLowerCase()}. ${daysWithRain} of the next ${days.length} days may have rain.`;
    }

    return {
      rainExpected: daysWithRain > 0,
      heavyRainExpected: heavyRainDays.length > 0,
      daysWithRain,
      nextRainDate: nextRainDay?.date ?? null,
      nextRainLabel: nextRainDay?.dayLabel ?? null,
      summaryText,
      days,
    };
  } catch (err) {
    console.error('[sensor-api] Error fetching forecast:', err);
    return emptyResult;
  }
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLabel(dateStr: string, todayStr: string): string {
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[target.getDay()];
}
