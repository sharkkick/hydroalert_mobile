import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { MapView, Marker, Callout, PROVIDER_GOOGLE } from '../../components/MapViewNative';

const { width, height } = Dimensions.get('window');

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch SOS alerts from Supabase
  const fetchSosAlerts = async () => {
    try {
      // Try sos_alerts table first
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('sos_id, latitude, longitude, status_id, user_id')
        .not('latitude', 'eq', 0)
        .not('longitude', 'eq', 0)
        .order('sos_id', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Map] Error fetching SOS alerts:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Fetch user names for the alerts
        const userIds = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
        let userMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('user_id, full_name, barangay')
            .in('user_id', userIds);

          if (users) {
            users.forEach((u: any) => {
              userMap[u.user_id] = u.full_name || 'Resident';
            });
          }
        }

        const markers: SosMarker[] = data.map((alert: any) => ({
          id: String(alert.sos_id),
          latitude: alert.latitude,
          longitude: alert.longitude,
          status: getStatusLabel(alert.status_id),
          userName: userMap[alert.user_id] || 'Resident',
          createdAt: '',
          barangay: '',
        }));

        setSosMarkers(markers);
      }
    } catch (err) {
      console.error('[Map] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSosAlerts();

    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchSosAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Map — native only */}
      {MapView ? (
        <MapView
          ref={mapRef}
          style={s.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={userLocation ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
        >
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
        </MapView>
      ) : (
        <View style={s.webFallback}>
          <Ionicons name="map-outline" size={48} color="#9ca3af" />
          <Text style={s.webFallbackTitle}>Map View</Text>
          <Text style={s.webFallbackText}>
            The map is available on mobile devices only.{'\n'}Open this app in Expo Go on your phone to see the map.
          </Text>
          {sosMarkers.length > 0 && (
            <View style={s.webAlertList}>
              <Text style={s.webAlertListTitle}>Active SOS Alerts ({activeAlerts.length})</Text>
              {sosMarkers.slice(0, 10).map(marker => (
                <View key={marker.id} style={s.webAlertItem}>
                  <View style={[s.webAlertDot, { backgroundColor: getStatusColor(marker.status === 'Sent' ? 1 : marker.status === 'Dispatched' ? 2 : 3) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.webAlertName}>{marker.userName}</Text>
                    <Text style={s.webAlertInfo}>{marker.status} • {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Top info banner */}
      <View style={s.topBanner}>
        <View style={s.topBannerLeft}>
          <Ionicons name="alert-circle" size={16} color={activeAlerts.length > 0 ? '#dc2626' : '#16a34a'} />
          <Text style={s.topBannerText}>
            {loading ? 'Loading...' : activeAlerts.length > 0
              ? `${activeAlerts.length} active SOS alert${activeAlerts.length > 1 ? 's' : ''}`
              : 'No active SOS alerts'}
          </Text>
        </View>
        {refreshing && <ActivityIndicator size="small" color="#2563eb" />}
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity style={s.controlBtn} onPress={handleRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={20} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={s.controlBtn} onPress={handleCenterOnUser} activeOpacity={0.7}>
          <Ionicons name="locate" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <Text style={s.legendTitle}>SOS Status</Text>
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
