import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { MapView, Marker, Callout, UrlTile, PROVIDER_DEFAULT } from '../../components/MapViewNative';
import WebFloodMap from '../../components/WebFloodMap';

const { width, height } = Dimensions.get('window');

// OpenWeather key (used for the precipitation tile overlay).
const OWM_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '';

// Free tile sources (no Google Maps key required)
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OWM_PRECIP_URL = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

// Default center: Bacoor, Cavite
const DEFAULT_REGION = {
  latitude: 14.4624,
  longitude: 120.9340,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

interface SosMarker {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  userName: string;
  createdAt: string;
  barangay: string;
}

interface SensorMarker {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  waterLevelCm: number | null;
  updatedAt: string;
}

function getStatusLabel(statusId: number | string): string {
  const id = Number(statusId);
  if (id === 1) return 'Sent';
  if (id === 2) return 'Dispatched';
  if (id === 3) return 'Rescued';
  return 'Pending';
}

function getStatusColor(statusId: number | string): string {
  const id = Number(statusId);
  if (id === 1) return '#dc2626'; // red - active
  if (id === 2) return '#f59e0b'; // amber - dispatched
  if (id === 3) return '#16a34a'; // green - rescued
  return '#6b7280'; // gray - pending
}

function getMarkerColor(statusId: number | string): string {
  const id = Number(statusId);
  if (id === 1) return 'red';
  if (id === 2) return 'orange';
  if (id === 3) return 'green';
  return 'gray';
}

export default function MapScreen() {
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sosMarkers, setSosMarkers] = useState<SosMarker[]>([]);
  const [sensorMarkers, setSensorMarkers] = useState<SensorMarker[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRain, setShowRain] = useState(true);

  // Get the authenticated user's id so we only show their own SOS reports
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
  }, []);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (err) {
        console.warn('[Map] Could not get location:', err);
      }
    })();
  }, []);

  // Fetch ONLY the current user's SOS reports from Supabase
  const fetchSosAlerts = async () => {
    try {
      // Resolve the auth user id (may not be in state yet on first run)
      let uid = authUserId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id ?? null;
        if (uid) setAuthUserId(uid);
      }
      if (!uid) {
        // Not logged in — show no personal reports
        setSosMarkers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Real sos_alerts columns: sos_alert_id, gps_latitude, gps_longitude, sos_status_id, user_id
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('sos_alert_id, gps_latitude, gps_longitude, sos_status_id, user_id, created_at')
        .eq('user_id', uid)
        .not('gps_latitude', 'is', null)
        .not('gps_longitude', 'is', null)
        .order('sos_alert_id', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Map] Error fetching SOS alerts:', error.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (data && data.length > 0) {
        // Fetch user names for the alerts (users columns: first_name, last_name)
        const userIds = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
        let userMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);

          if (users) {
            users.forEach((u: any) => {
              const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
              userMap[u.user_id] = name || 'Resident';
            });
          }
        }

        const markers: SosMarker[] = data
          .filter((a: any) => a.gps_latitude != null && a.gps_longitude != null)
          .map((alert: any) => ({
            id: String(alert.sos_alert_id),
            latitude: Number(alert.gps_latitude),
            longitude: Number(alert.gps_longitude),
            status: getStatusLabel(alert.sos_status_id),
            userName: userMap[alert.user_id] || 'Resident',
            createdAt: alert.created_at ? new Date(alert.created_at).toLocaleString() : '',
            barangay: '',
          }));

        setSosMarkers(markers);
      } else {
        setSosMarkers([]);
      }
    } catch (err) {
      console.error('[Map] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch flood sensors (with their latest water-level reading) to plot on the map
  const fetchSensors = async () => {
    try {
      const { data: sensors, error } = await supabase
        .from('sensors')
        .select('sensor_id, device_hardware_id, sensor_name, gps_latitude, gps_longitude, updated_at')
        .not('gps_latitude', 'is', null)
        .not('gps_longitude', 'is', null);

      if (error) {
        console.error('[Map] Error fetching sensors:', error.message);
        return;
      }
      if (!sensors || sensors.length === 0) {
        setSensorMarkers([]);
        return;
      }

      // Latest reading per sensor for the water level
      const levelMap: Record<number, number> = {};
      const updatedMap: Record<number, string> = {};
      await Promise.all(
        sensors.map(async (sn: any) => {
          const { data: reading } = await supabase
            .from('sensor_readings')
            .select('water_level_cm, recorded_at')
            .eq('sensor_id', sn.sensor_id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (reading) {
            levelMap[sn.sensor_id] = Number((reading as any).water_level_cm);
            updatedMap[sn.sensor_id] = (reading as any).recorded_at;
          }
        }),
      );

      const markers: SensorMarker[] = sensors.map((sn: any) => ({
        id: `sensor_${sn.sensor_id}`,
        latitude: Number(sn.gps_latitude),
        longitude: Number(sn.gps_longitude),
        name: sn.sensor_name || sn.device_hardware_id || `Sensor ${sn.sensor_id}`,
        waterLevelCm: sn.sensor_id in levelMap ? levelMap[sn.sensor_id] : null,
        updatedAt: updatedMap[sn.sensor_id] ? new Date(updatedMap[sn.sensor_id]).toLocaleString() : '',
      }));

      setSensorMarkers(markers);
    } catch (err) {
      console.error('[Map] Error fetching sensors:', err);
    }
  };

  useEffect(() => {
    fetchSosAlerts();
    fetchSensors();

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchSosAlerts();
      fetchSensors();
    }, 15000);
    return () => clearInterval(interval);
  }, [authUserId]);

  // Subscribe to realtime SOS updates
  useEffect(() => {
    const channel = supabase
      .channel('map_sos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_alerts' },
        () => {
          fetchSosAlerts();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSosAlerts();
    fetchSensors();
  };

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const activeAlerts = sosMarkers.filter(m => m.status === 'Sent' || m.status === 'Dispatched');

  return (
    <View style={s.container}>
      {/* Map — native uses react-native-maps with OSM + OpenWeather tiles */}
      {MapView ? (
        <MapView
          ref={mapRef}
          style={s.map}
          provider={PROVIDER_DEFAULT}
          mapType="none"
          initialRegion={userLocation ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
        >
          {/* OpenStreetMap base layer (free, no Google key) */}
          {UrlTile && (
            <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} zIndex={-1} tileSize={256} />
          )}
          {/* OpenWeather precipitation overlay */}
          {UrlTile && showRain && OWM_KEY ? (
            <UrlTile urlTemplate={OWM_PRECIP_URL} maximumZ={19} zIndex={1} opacity={0.55} tileSize={256} />
          ) : null}

          {/* SOS Alert Markers */}
          {sosMarkers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              pinColor={getMarkerColor(marker.status === 'Sent' ? 1 : marker.status === 'Dispatched' ? 2 : marker.status === 'Rescued' ? 3 : 0)}
            >
              <Callout>
                <View style={s.callout}>
                  <Text style={s.calloutTitle}>🚨 SOS Alert</Text>
                  <Text style={s.calloutText}>{marker.userName}</Text>
                  <Text style={[s.calloutStatus, { color: getStatusColor(marker.status === 'Sent' ? 1 : marker.status === 'Dispatched' ? 2 : 3) }]}>
                    Status: {marker.status}
                  </Text>
                  <Text style={s.calloutTime}>{marker.createdAt}</Text>
                  <Text style={s.calloutCoords}>
                    {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {/* Flood Sensor Markers */}
          {sensorMarkers.map(sensor => (
            <Marker
              key={sensor.id}
              coordinate={{ latitude: sensor.latitude, longitude: sensor.longitude }}
              pinColor="#2563eb"
            >
              <Callout>
                <View style={s.callout}>
                  <Text style={s.calloutTitle}>📡 {sensor.name}</Text>
                  <Text style={[s.calloutStatus, { color: '#2563eb' }]}>
                    Water level: {sensor.waterLevelCm != null ? `${sensor.waterLevelCm > 0 ? '+' : ''}${sensor.waterLevelCm} cm` : 'N/A'}
                  </Text>
                  <Text style={s.calloutTime}>{sensor.updatedAt}</Text>
                  <Text style={s.calloutCoords}>
                    {sensor.latitude.toFixed(5)}, {sensor.longitude.toFixed(5)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) : (
        // Web: real interactive Leaflet map (OSM base + OpenWeather precipitation)
        <View style={s.map}>
          <WebFloodMap
            center={userLocation ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude }}
            markers={[
              ...sosMarkers.map(m => ({
                id: m.id,
                latitude: m.latitude,
                longitude: m.longitude,
                color: getStatusColor(m.status === 'Sent' ? 1 : m.status === 'Dispatched' ? 2 : m.status === 'Rescued' ? 3 : 0),
                title: `🚨 ${m.userName}`,
                status: m.status,
              })),
              ...sensorMarkers.map(sn => ({
                id: sn.id,
                latitude: sn.latitude,
                longitude: sn.longitude,
                color: '#2563eb',
                title: `📡 ${sn.name}`,
                status: sn.waterLevelCm != null ? `${sn.waterLevelCm > 0 ? '+' : ''}${sn.waterLevelCm} cm` : 'No reading',
              })),
            ]}
            showRain={showRain}
            owmKey={OWM_KEY}
          />
        </View>
      )}

      {/* Top info banner */}
      <View style={s.topBanner}>
        <View style={s.topBannerLeft}>
          <Ionicons name="alert-circle" size={16} color={activeAlerts.length > 0 ? '#dc2626' : '#16a34a'} />
          <Text style={s.topBannerText}>
            {loading ? 'Loading...' : activeAlerts.length > 0
              ? `${activeAlerts.length} of your active SOS report${activeAlerts.length > 1 ? 's' : ''}`
              : sosMarkers.length > 0 ? `${sosMarkers.length} of your SOS report${sosMarkers.length > 1 ? 's' : ''}` : 'No SOS reports from you'}
          </Text>
        </View>
        {refreshing && <ActivityIndicator size="small" color="#2563eb" />}
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity
          style={[s.controlBtn, showRain && s.controlBtnActive]}
          onPress={() => setShowRain(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="rainy" size={20} color={showRain ? '#2563eb' : '#9ca3af'} />
        </TouchableOpacity>
        <TouchableOpacity style={s.controlBtn} onPress={handleRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={20} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={s.controlBtn} onPress={handleCenterOnUser} activeOpacity={0.7}>
          <Ionicons name="locate" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <Text style={s.legendTitle}>Your SOS Reports</Text>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#dc2626' }]} />
          <Text style={s.legendText}>Active</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={s.legendText}>Dispatched</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#16a34a' }]} />
          <Text style={s.legendText}>Rescued</Text>
        </View>
        <View style={[s.legendRow, { marginTop: 4 }]}>
          <View style={[s.legendDot, { backgroundColor: '#2563eb' }]} />
          <Text style={s.legendText}>Flood sensor</Text>
        </View>
        {showRain && OWM_KEY ? (
          <View style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: '#38bdf8' }]} />
            <Text style={s.legendText}>Rain (OpenWeather)</Text>
          </View>
        ) : null}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Loading SOS alerts...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },

  topBanner: {
    position: 'absolute', top: 10, left: 14, right: 14,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  topBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBannerText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  controls: {
    position: 'absolute', right: 14, bottom: 100,
    gap: 8,
  },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  controlBtnActive: { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe' },

  legend: {
    position: 'absolute', bottom: 20, left: 14,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10,
    padding: 10, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  legendTitle: { fontSize: 10, fontWeight: '700', color: '#374151', marginBottom: 2 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: '#6b7280' },

  callout:       { padding: 4, minWidth: 150 },
  calloutTitle:  { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  calloutText:   { fontSize: 12, color: '#374151', marginBottom: 2 },
  calloutStatus: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  calloutTime:   { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  calloutCoords: { fontSize: 9, color: '#9ca3af' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { fontSize: 13, color: '#6b7280', marginTop: 8 },

  webFallback:      { flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 24 },
  webFallbackTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 12 },
  webFallbackText:  { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  webAlertList:     { marginTop: 20, width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  webAlertListTitle:{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  webAlertItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#f3f4f6' },
  webAlertDot:      { width: 10, height: 10, borderRadius: 5 },
  webAlertName:     { fontSize: 13, fontWeight: '600', color: '#111827' },
  webAlertInfo:     { fontSize: 11, color: '#6b7280', marginTop: 1 },
});
