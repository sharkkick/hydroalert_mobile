import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { getRainfallForecast } from '../lib/sensor-api';

const USER_STORAGE_KEY = 'hydroalert_user_data';
const ALERTS_STORAGE_KEY = 'hydroalert_alerts';
const ACTIVITIES_STORAGE_KEY = 'hydroalert_activities';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface ActivityEntry {
  id: string;
  type: 'login' | 'logout' | 'alert_created' | 'alert_edited' | 'profile_updated' | 'register' | 'sos_sent';
  title: string;
  description: string;
  timeAgo: string;
  timestamp: number;
}

interface Alert {
  id: string;
  firestoreId?: string;
  time: string;
  timeAgo: string;
  people: string | null;
  situation: string | null;
  location: string;
  status: 'sent' | 'pending' | 'dispatched' | 'rescued';
  lastError?: string | null;
  syncInfo?: string | null;
  timestamp?: number;
}

export interface UserData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  barangay: string;
  roleId?: number | null;
  barangayId?: number | null;
  fcmToken?: string;
}

interface AppContextType {
  user: UserData;
  setUser: (u: UserData) => void;
  alerts: Alert[];
  addAlert: (a: Alert) => void;
  updateAlertFields: (idOrFirestoreId: string, fields: Partial<Alert>) => void;
  updateAlert: (id: string, people: string, situation: string) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
  refreshAlerts: () => Promise<void>;
  activities: ActivityEntry[];
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'timeAgo' | 'timestamp'>) => void;
  loadingActivities: boolean;
  loadingAlerts: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function normalizeRemoteStatus(value: unknown): Alert['status'] {
  const text = String(value ?? '').toLowerCase().trim();
  if (text.includes('dispatch')) return 'dispatched';
  if (text.includes('rescue') || text.includes('resolved') || text.includes('complete')) return 'rescued';
  if (text.includes('sent') || text.includes('active')) return 'sent';
  if (text.includes('pending')) return 'pending';

  const numeric = Number(value);
  if (numeric === 1) return 'sent';
  if (numeric === 2) return 'dispatched';
  if (numeric === 3) return 'rescued';
  return 'pending';
}

function stringifyPeopleCount(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return String(numeric);
  const text = String(value).trim();
  return text || null;
}

async function sendStatusNotification(status: string) {
  if (Platform.OS === 'web') return;

  const config: Record<string, { title: string; body: string }> = {
    dispatched: {
      title: '🚨 Rescue Team Dispatched',
      body: 'A rescue team has been dispatched to your location. Please stay where you are.',
    },
    rescued: {
      title: '✅ You Have Been Rescued',
      body: 'Your rescue has been confirmed. Please follow rescue team instructions.',
    },
  };

  const notif = config[status];
  if (!notif) return;

  // Vibrate the phone (pattern: vibrate 500ms, pause 200ms, vibrate 500ms)
  if (Platform.OS !== 'web') {
    Vibration.vibrate([0, 500, 200, 500]);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notif.title,
      body: notif.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

// ── Rain Forecast Daily Notification ──────────────────────────────────────────
const RAIN_NOTIF_LAST_CHECK_KEY = 'hydroalert_rain_notif_last_check';
const RAIN_NOTIF_CHANNEL_ID = 'rain_forecast';

async function setupRainForecastChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(RAIN_NOTIF_CHANNEL_ID, {
      name: 'Rain Forecast Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      sound: 'default',
    });
  }
}

async function checkAndNotifyRainForecast() {
  if (Platform.OS === 'web') return;

  try {
    // Check if we already sent a notification in the last 6 hours
    const now = Date.now();
    const lastCheck = await AsyncStorage.getItem(RAIN_NOTIF_LAST_CHECK_KEY);
    const lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : 0;
    const sixHours = 6 * 60 * 60 * 1000;

    if (now - lastCheckTime < sixHours) {
      console.log('[RainForecast] Checked less than 6 hours ago, skipping.');
      return;
    }

    // Fetch the forecast
    const forecast = await getRainfallForecast();
    if (!forecast || forecast.days.length === 0) {
      console.log('[RainForecast] No forecast data available.');
      return;
    }

    // Find days with >= 70% precipitation probability
    const rainyDays = forecast.days.filter(day => day.maxPop >= 0.7);

    if (rainyDays.length > 0) {
      // Build notification message with rain percentages
      const heavyDays = rainyDays.filter(d => d.totalRain >= 15 || d.maxPop >= 0.9);

      let title = '🌧️ Rain Alert for Cavite';
      let body = '';

      if (heavyDays.length > 0) {
        title = '⚠️ Heavy Rain Expected';
        body = rainyDays.slice(0, 4).map(d =>
          `${d.dayLabel}: ${Math.round(d.maxPop * 100)}% chance, ~${d.totalRain}mm`
        ).join('\n');
        body += '\nPrepare for possible flooding.';
      } else {
        body = rainyDays.slice(0, 4).map(d =>
          `${d.dayLabel}: ${Math.round(d.maxPop * 100)}% chance, ~${d.totalRain}mm`
        ).join('\n');
        body += '\nStay prepared and monitor updates.';
      }

      await setupRainForecastChannel();

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' ? { channelId: RAIN_NOTIF_CHANNEL_ID } : {}),
        },
        trigger: null,
      });

      console.log('[RainForecast] Notification sent:', title);
    } else {
      console.log('[RainForecast] No days with >=70% rain probability. No notification sent.');
    }

    // Mark current time as last check
    await AsyncStorage.setItem(RAIN_NOTIF_LAST_CHECK_KEY, String(now));
  } catch (err) {
    console.error('[RainForecast] Error checking forecast:', err);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    barangay: '',
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const prevStatusMap = useRef<Record<string, string>>({});
  const firstSyncDone = useRef(false);
  const syncInFlight = useRef(false);

  // ── Register for FCM push notifications and store token in Supabase ──
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const registerForPushNotifications = async () => {
      try {
        // Set up Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('sos_alerts', {
            name: 'SOS Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500],
            sound: 'default',
          });
        }

        // Get permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Push notification permission not granted');
          return;
        }

        // Get Expo push token (this is what Expo's push service uses)
        let expoPushToken: string | null = null;
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'hydroalert_mobile',
          });
          expoPushToken = tokenData.data;
          console.log('📱 Expo Push Token:', expoPushToken);
        } catch (tokenErr: any) {
          // Expo Go doesn't support push tokens — this will work in dev builds/APK
          console.warn('[FCM] Could not get Expo push token (expected in Expo Go):', tokenErr.message);
          return;
        }

        // Store the Expo push token in Supabase (linked to the authenticated user)
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (userId && expoPushToken) {
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
              user_id: userId,
              token: expoPushToken,
              platform: Platform.OS,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          if (error) {
            console.error('[FCM] Could not store token:', error.message);
          } else {
            console.log('[FCM] Expo push token stored in Supabase');
          }
        }
      } catch (err) {
        console.error('Error registering for push notifications:', err);
      }
    };

    registerForPushNotifications();
  }, []);

  // ── Daily rain forecast notification check ──
  useEffect(() => {
    // Small delay to let notification permissions settle first
    const timer = setTimeout(() => {
      checkAndNotifyRainForecast();
    }, 5000);

    // Also re-check every 6 hours in case the app stays open
    const interval = setInterval(() => {
      checkAndNotifyRainForecast();
    }, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [savedUserData, savedAlerts, savedActivities] = await Promise.all([
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(ALERTS_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY),
        ]);

        if (savedUserData) {
          setUserState(JSON.parse(savedUserData));
        }
        if (savedAlerts) {
          const parsed = JSON.parse(savedAlerts) as Alert[];
          setAlerts(Array.isArray(parsed) ? parsed : []);
        }
        if (savedActivities) {
          const parsed = JSON.parse(savedActivities) as ActivityEntry[];
          setActivities(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Error loading app state:', error);
      } finally {
        setLoadingAlerts(false);
        setLoadingActivities(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (loadingAlerts) return;

    const persistAlerts = async () => {
      try {
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
      } catch (error) {
        console.error('Error saving alerts:', error);
      }
    };

    if (firstSyncDone.current) {
      for (const alert of alerts) {
        const prevStatus = prevStatusMap.current[alert.id];
        if (prevStatus && prevStatus !== alert.status) {
          void sendStatusNotification(alert.status);
        }
      }
    }

    const nextStatusMap: Record<string, string> = {};
    alerts.forEach((alert) => {
      nextStatusMap[alert.id] = alert.status;
    });
    prevStatusMap.current = nextStatusMap;
    firstSyncDone.current = true;

    void persistAlerts();
  }, [alerts, loadingAlerts]);

  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const refreshAlerts = async () => {
    if (syncInFlight.current) return;
    const remoteIds = alertsRef.current
      .map((a) => a.firestoreId)
      .filter((id): id is string => !!id && id.length > 0 && !id.startsWith('alert_'));

    if (remoteIds.length === 0) return;

    syncInFlight.current = true;
    try {
      // Try fetching from sos_alerts first
      let baseData: Record<string, any>[] = [];
      let viewData: Record<string, any>[] = [];

      const baseRes = await supabase
        .from('sos_alerts')
        .select('sos_id, status_id, number_of_people, situation_type_id, user_id')
        .in('sos_id', remoteIds);

      if (!baseRes.error && Array.isArray(baseRes.data)) {
        baseData = baseRes.data as Record<string, any>[];
      }

      // If base table returned nothing, try the view
      if (baseData.length === 0) {
        const viewRes = await supabase
          .from('v_sos_alerts')
          .select('sos_id, status_id, number_of_people, situation_type_id, user_id')
          .in('sos_id', remoteIds);

        if (!viewRes.error && Array.isArray(viewRes.data)) {
          viewData = viewRes.data as Record<string, any>[];
        }
      }

      // If both returned nothing, try fetching by current user
      if (baseData.length === 0 && viewData.length === 0) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData?.user?.id;
          if (userId) {
            const userRes = await supabase
              .from('sos_alerts')
              .select('sos_id, status_id, number_of_people, situation_type_id')
              .eq('user_id', userId)
              .order('sos_id', { ascending: false })
              .limit(20);

            if (!userRes.error && Array.isArray(userRes.data)) {
              baseData = userRes.data as Record<string, any>[];
            }
          }
        } catch (_) {}
      }

      if (baseData.length === 0 && viewData.length === 0) {
        return;
      }

      const byId = new Map<string, Record<string, any>>();
      for (const row of baseData) {
        const key = String(row.sos_id ?? '');
        if (key) byId.set(key, row);
      }
      for (const row of viewData) {
        const key = String(row.sos_id ?? '');
        if (key) byId.set(key, row);
      }

      setAlerts((prev) =>
        prev.map((alert) => {
          const key = alert.firestoreId ? String(alert.firestoreId) : '';
          const remote = key ? byId.get(key) : undefined;
          if (!remote) return alert;

          const nextStatus = normalizeRemoteStatus(remote.status_id);
          const remotePeople = stringifyPeopleCount(remote.number_of_people);
          const remoteSituation = null as string | null; // situation_type_id is a FK, not text

          return {
            ...alert,
            status: nextStatus,
            ...(remotePeople ? { people: remotePeople } : {}),
            ...(remoteSituation ? { situation: remoteSituation } : {}),
          };
        }),
      );
    } catch (error) {
      console.error('Error syncing alerts from Supabase:', error);
    } finally {
      syncInFlight.current = false;
    }
  };

  useEffect(() => {
    if (loadingAlerts) return;

    void refreshAlerts();
    const interval = setInterval(() => {
      void refreshAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadingAlerts]);

  // ── Supabase Realtime subscription for instant status updates ──
  useEffect(() => {
    if (loadingAlerts) return;

    const channel = supabase
      .channel('sos_alerts_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const updated = payload.new as Record<string, any>;
          const remoteId = String(updated.sos_id ?? '');
          if (!remoteId) return;

          console.log('[Realtime] sos_alerts UPDATE received:', remoteId, updated);

          setAlerts((prev) =>
            prev.map((alert) => {
              if (String(alert.firestoreId) !== remoteId) return alert;

              const nextStatus = normalizeRemoteStatus(updated.status_id);
              const remotePeople = stringifyPeopleCount(updated.number_of_people);

              // Trigger push notification if status changed to dispatched or rescued
              if (nextStatus !== alert.status && (nextStatus === 'dispatched' || nextStatus === 'rescued')) {
                void sendStatusNotification(nextStatus);
              }

              return {
                ...alert,
                status: nextStatus,
                ...(remotePeople ? { people: remotePeople } : {}),
              };
            }),
          );
        },
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadingAlerts]);

  useEffect(() => {
    if (loadingActivities) return;

    const persistActivities = async () => {
      try {
        await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
      } catch (error) {
        console.error('Error saving activities:', error);
      }
    };

    void persistActivities();
  }, [activities, loadingActivities]);

  const setUser = async (u: UserData) => {
    setUserState(u);
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logActivity = (entry: Omit<ActivityEntry, 'id' | 'timeAgo' | 'timestamp'>) => {
    const timestamp = Date.now();
    const newEntry: ActivityEntry = {
      id: `act_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      timeAgo: 'Just now',
      timestamp,
    };

    setActivities((prev) => [newEntry, ...prev]);
  };

  const addAlert = (a: Alert) => {
    setAlerts((prev) => [{ ...a, timestamp: a.timestamp || Date.now() }, ...prev]);
  };

  const updateAlertFields = (idOrFirestoreId: string, fields: Partial<Alert>) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === idOrFirestoreId || alert.firestoreId === idOrFirestoreId
          ? { ...alert, ...fields }
          : alert,
      ),
    );
  };

  const updateAlert = (id: string, people: string, situation: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id || alert.firestoreId === id
          ? {
              ...alert,
              people,
              situation,
              timestamp: Date.now(),
              time: new Date().toLocaleString(),
            }
          : alert,
      ),
    );
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id && alert.firestoreId !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activitiesWithFreshTime = activities.map((a) => ({
    ...a,
    timeAgo: getTimeAgo(a.timestamp),
  }));

  const alertsWithFreshTime = alerts.map((a) => {
    const ts = a.timestamp ?? Date.parse(a.time) ?? Date.now();
    return {
      ...a,
      timeAgo: getTimeAgo(ts),
    };
  });

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        alerts: alertsWithFreshTime,
        addAlert,
        updateAlertFields,
        updateAlert,
        removeAlert,
        clearAlerts,
        refreshAlerts,
        activities: activitiesWithFreshTime,
        logActivity,
        loadingActivities,
        loadingAlerts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default function AppContextModule() {
  return null;
}
