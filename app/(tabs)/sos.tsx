import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../app-context';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const PEOPLE_OPTIONS = ['1', '2-5', '6-10', '10+'];
const SITUATION_OPTIONS = [
  'Trapped in building',
  'Flood rising rapidly',
  'Medical emergency',
  'Stranded on rooftop',
  'Vehicle submerged',
  'Other emergency',
];

const HOTLINES = [
  { label: 'National Emergency', number: '911' },
  { label: 'NDRRMC Hotline',     number: '911-1406' },
  { label: 'Red Cross',          number: '143' },
];

function readableSupabaseError(error: any): string {
  if (!error) return 'Unknown error.';
  const message = String(error.message || error.error_description || error.details || 'Unknown error.');
  if (message.toLowerCase().includes('row-level security')) {
    return 'Permission denied by Supabase RLS policy.';
  }
  return message;
}

function getMissingColumnName(error: any): string | null {
  if (!error || error.code !== 'PGRST204') return null;
  const message = String(error.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

function peopleToNumber(value: string | null): number | null {
  if (!value) return null;
  if (value === '1') return 1;
  if (value === '2-5') return 5;
  if (value === '6-10') return 10;
  if (value === '10+') return 10;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function upsertProfileRow(tableName: string, payload: Record<string, any>) {
  const payloadAttempts: Array<Record<string, any>> = [
    { ...payload },
    {
      user_id: payload.user_id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      full_name: payload.full_name,
      email: payload.email,
    },
    {
      user_id: payload.user_id,
      email: payload.email,
    },
    {
      user_id: payload.user_id,
    },
  ];

  let lastError: any = null;

  for (const rawAttempt of payloadAttempts) {
    const attempt = Object.fromEntries(Object.entries(rawAttempt).filter(([, value]) => value !== undefined));

    if (!attempt.user_id) {
      continue;
    }

    for (let i = 0; i < 8; i++) {
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert(attempt, { onConflict: 'user_id' });

      if (!upsertError) {
        return;
      }

      const missingColumn = getMissingColumnName(upsertError);
      if (missingColumn && Object.prototype.hasOwnProperty.call(attempt, missingColumn)) {
        delete attempt[missingColumn];
        if (Object.keys(attempt).length === 0) {
          lastError = upsertError;
          break;
        }
        continue;
      }

      // Fallback for schemas that don't support upsert by user_id.
      const noConflictSupport = String(upsertError.message || '').toLowerCase().includes('no unique or exclusion constraint');
      if (upsertError.code === '42P10' || noConflictSupport) {
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(attempt);

        if (!insertError || insertError.code === '23505') {
          return;
        }

        const insertMissingColumn = getMissingColumnName(insertError);
        if (insertMissingColumn && Object.prototype.hasOwnProperty.call(attempt, insertMissingColumn)) {
          delete attempt[insertMissingColumn];
          if (Object.keys(attempt).length === 0) {
            lastError = insertError;
            break;
          }
          continue;
        }

        lastError = insertError;
        break;
      }

      // If table doesn't exist in PostgREST cache, skip this table attempt.
      if (upsertError.code === 'PGRST205' || upsertError.code === '42P01') {
        return;
      }

      lastError = upsertError;
      break;
    }
  }

  throw lastError ?? new Error(`Unable to create profile row in ${tableName}.`);
}

async function ensureUserProfileForSos(params: {
  authUserId: string;
  authEmail?: string;
  user: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    city?: string;
    barangay?: string;
    roleId?: number | null;
    barangayId?: number | null;
    fcmToken?: string;
  };
}) {
  const firstName = params.user.firstName?.trim() || 'Resident';
  const middleName = params.user.middleName?.trim() || '';
  const lastName = params.user.lastName?.trim() || 'User';
  const email = (params.authEmail || params.user.email || '').trim().toLowerCase();

  if (!email) {
    throw new Error('Authenticated user email is missing; cannot create SOS profile.');
  }

  // The sos_alerts.user_id FK references the `users` table.
  // Only send columns that actually exist in the real `users` schema:
  // user_id, first_name, middle_name, last_name, email_address,
  // contact_number, address_province, address_city, address_street, role_id, barangay_id
  const payload: Record<string, any> = {
    user_id: params.authUserId,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email_address: email,
    contact_number: params.user.phone?.trim() || '',
    address_province: 'Cavite',
    address_city: params.user.city?.trim() || null,
    address_street: '',
    role_id: params.user.roleId ?? 1,
    barangay_id: params.user.barangayId ?? null,
  };

  await upsertProfileRow('users', payload);
}

// Real sos_alerts schema: user_id (FK -> users), sos_status_id (NOT NULL),
// situation_type_id, created_at, plus an auto integer primary key.
// It has NO latitude/longitude columns, so we optimistically include them
// and let the missing-column self-healing drop them if absent.
const SOS_STATUS_PENDING = 1;

async function insertSosAlert(params: {
  authUserId: string;
  latitude?: number;
  longitude?: number;
}) {
  const lat = params.latitude ?? null;
  const lng = params.longitude ?? null;

  // Real columns: sos_alert_id (PK), user_id, gps_latitude, gps_longitude,
  // situation_type_id, affected_people_count, sos_status_id, created_at.
  const payload: Record<string, any> = {
    user_id: params.authUserId,
    sos_status_id: SOS_STATUS_PENDING,
  };
  if (lat !== null) payload.gps_latitude = lat;
  if (lng !== null) payload.gps_longitude = lng;

  let lastError: any = null;

  for (let i = 0; i < 8; i++) {
    const { data, error } = await supabase
      .from('sos_alerts')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (!error) {
      const row = (data as Record<string, any> | null) ?? {};
      const dbId = row.sos_alert_id ?? row.sos_id ?? row.id ?? null;
      return { table: 'sos_alerts', idColumn: 'sos_alert_id', id: dbId };
    }

    try {
      console.error('[SOS] insert error', { payload, code: error.code, message: error.message });
    } catch {}

    const missingColumn = getMissingColumnName(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      continue;
    }

    lastError = error;
    break;
  }

  throw lastError ?? new Error('Unable to insert SOS alert into Supabase.');
}

async function lookupSituationTypeId(situationName: string): Promise<number | null> {
  const tableNames = ['v_situation_types', 'situation_types'];
  const idColumns = ['situation_type_id', 'id'];
  const nameColumns = ['situation_type', 'situation_name', 'name', 'type_name'];

  for (const tableName of tableNames) {
    for (const idColumn of idColumns) {
      for (const nameColumn of nameColumns) {
        const { data, error } = await supabase
          .from(tableName)
          .select(`${idColumn}, ${nameColumn}`)
          .eq(nameColumn, situationName)
          .maybeSingle();

        if (!error && data && typeof data === 'object' && idColumn in data) {
          const value = (data as Record<string, any>)[idColumn];
          if (typeof value === 'number') return value;
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
    }
  }

  return null;
}

// Map mobile situation options to Supabase situation_type_id
// Matches v_situation_types table exactly
const SITUATION_TYPE_MAP: Record<string, number> = {
  'Trapped in building': 1,
  'Flood rising rapidly': 2,
  'Medical emergency': 3,
  'Stranded on rooftop': 4,
  'Vehicle submerged': 5,
  'Other emergency': 6,
};

function mapSituationToTypeId(situation: string | null): number | null {
  if (!situation) return null;
  return SITUATION_TYPE_MAP[situation] ?? 6; // default to 'Other emergency'
}

async function updateSosAlert(
  remoteRefOrId: { table: string; idColumn: string; id: string | number } | string | null,
  selectedPeople: string | null,
  selectedSituation: string | null,
) {
  const peopleCount = peopleToNumber(selectedPeople);
  const situationTypeId = mapSituationToTypeId(selectedSituation);

  const payload: Record<string, any> = {};
  if (peopleCount !== null) payload.affected_people_count = peopleCount;
  if (situationTypeId !== null) payload.situation_type_id = situationTypeId;

  if (Object.keys(payload).length === 0) return;

  // Determine the id + the column name to match on.
  let sosId: string | number | null = null;
  let idColumn = 'sos_alert_id';

  if (remoteRefOrId && typeof remoteRefOrId === 'object' && 'id' in remoteRefOrId) {
    sosId = remoteRefOrId.id;
    idColumn = remoteRefOrId.idColumn || 'id';
  } else if (typeof remoteRefOrId === 'string' || typeof remoteRefOrId === 'number') {
    sosId = remoteRefOrId as any;
  }

  if (sosId === null || sosId === undefined) {
    throw new Error('No remote reference or ID provided for update.');
  }

  const attempt = { ...payload };
  let lastError: any = null;

  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from('sos_alerts')
      .update(attempt)
      .eq(idColumn, sosId)
      .select('*');

    console.log('[updateSosAlert] result:', { idColumn, sosId, attempt, ok: !error, error: error?.message });

    if (!error) return;

    const missingColumn = getMissingColumnName(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(attempt, missingColumn)) {
      delete attempt[missingColumn];
      if (Object.keys(attempt).length === 0) return; // nothing left to update
      continue;
    }

    lastError = error;
    break;
  }

  if (lastError) throw new Error(lastError.message);
}

export default function SOSScreen() {
  const { addAlert, updateAlert, updateAlertFields, logActivity, alerts, user } = useApp();
  const [showDetails, setShowDetails]               = useState(false);
  const [selectedPeople, setSelectedPeople]         = useState<string | null>(null);
  const [selectedSituation, setSelectedSituation]   = useState<string | null>(null);
  const [showSituationDropdown, setShowSituationDropdown] = useState(false);
  const [showConfirmModal, setShowConfirmModal]           = useState(false);
  const [updateSent,       setUpdateSent]                 = useState(false);

  const [sosPressed, setSosPressed]     = useState(false);
  const [firestoreId, setFirestoreId]   = useState<string | null>(null);
  const [remoteAlertRef, setRemoteAlertRef] = useState<{ table: string; idColumn: string; id: string | number } | null>(null);
  const [activeSosUserEmail, setActiveSosUserEmail] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const retryCounts = useRef<Record<string, number>>({});

  // Reset local SOS UI state when user logs out so tests can be repeated.
  useEffect(() => {
    if (!user || !user.email) {
      setSosPressed(false);
      setFirestoreId(null);
      setRemoteAlertRef(null);
      setActiveSosUserEmail(null);
      setShowDetails(false);
      setUpdateSent(false);
    }
  }, [user && user.email]);

  // Unlock SOS button when all alerts are resolved (rescued)
  useEffect(() => {
    if (sosPressed && alerts.length > 0) {
      const allResolved = alerts.every(a => a.status === 'rescued');
      if (allResolved) {
        setSosPressed(false);
        setUpdateSent(false);
      }
    }
  }, [alerts, sosPressed]);

  const scheduleRetryInsert = (localId: string, authUserId: string, attempt = 1) => {
    const maxAttempts = 5;
    const delay = 10000 * attempt; // exponential-ish backoff: 10s,20s,...
    retryCounts.current[localId] = attempt;
    setTimeout(async () => {
      try {
        const remote = await insertSosAlert({ authUserId });
        const remoteId = remote.id ? String(remote.id) : null;
        if (remoteId) {
          updateAlertFields(localId, { firestoreId: remoteId, status: 'sent' });
          setRemoteAlertRef(remote.id ? remote : null);
          logActivity({ type: 'sos_sent', title: 'SOS Sent', description: 'Emergency request synced after retry' });
          delete retryCounts.current[localId];
          return;
        }
      } catch (err) {
        console.error('Retry insert failed for', localId, err);
        updateAlertFields(localId, { lastError: readableSupabaseError(err) });
      }

      const nextAttempt = (retryCounts.current[localId] || 0) + 1;
      if (nextAttempt <= maxAttempts) {
        scheduleRetryInsert(localId, authUserId, nextAttempt);
      } else {
        updateAlertFields(localId, { status: 'pending' });
        logActivity({ type: 'alert_edited', title: 'SOS Failed', description: 'Failed to sync SOS after retries' });
      }
    }, delay);
  };
  const hasActiveSosAlert = alerts.some((alert) =>
    alert.status === 'sent' ||
    alert.status === 'pending' ||
    alert.status === 'dispatched',
  );
  const isSosActive = sosPressed || (activeSosUserEmail === user.email && hasActiveSosAlert);

  const handleSOSPress = async () => {
    if (sosPressed) return;

    // Limit: max 5 active (unresolved) SOS alerts per user
    const activeAlertCount = alerts.filter(a => a.status === 'sent' || a.status === 'pending' || a.status === 'dispatched').length;
    if (activeAlertCount >= 5) {
      Alert.alert(
        'SOS Limit Reached',
        'You have 5 active SOS alerts. Please wait for your current alerts to be resolved before sending another.',
        [{ text: 'OK' }],
      );
      return;
    }

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    setSosPressed(true);
    setShowDetails(true);

    let localAlertId = `alert_${Date.now()}`;
    try {
      // Get user's current location
      let latitude = 0;
      let longitude = 0;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          console.log('[SOS] Got location:', latitude, longitude);
        } else {
          console.warn('[SOS] Location permission not granted, sending without coordinates');
        }
      } catch (locErr) {
        console.warn('[SOS] Could not get location:', locErr);
      }

      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      const authEmail = authData.user?.email;
      if (!authUserId) {
        throw new Error('No authenticated user found for SOS alert.');
      }

      await ensureUserProfileForSos({ authUserId, authEmail, user });
      setActiveSosUserEmail(authEmail || user.email || null);

      // Optimistic: add local alert first so UI locks immediately and it appears in My Alerts.
      localAlertId = `alert_${Date.now()}`;
      addAlert({
        id:          localAlertId,
        firestoreId: localAlertId,
        time:        new Date().toLocaleString(),
        timeAgo:     'Just now',
        people:      null,
        situation:   null,
        location:    user.barangay || 'Detected',
        status:      'pending',
        timestamp:   Date.now(),
      });

      // Attempt to persist to Supabase; if it fails we'll mark pending and schedule retries.
      try {
        const remote = await insertSosAlert({ authUserId, latitude, longitude });
        const remoteId = remote.id ? String(remote.id) : null;
        if (remoteId) {
          setFirestoreId(remoteId);
          setRemoteAlertRef(remote.id ? remote : null);
          if (updateAlertFields) updateAlertFields(localAlertId, { firestoreId: remoteId, status: 'sent', lastError: null });
        }
      } catch (err) {
        console.error('Initial insert failed, scheduling retries:', err);
        if (updateAlertFields) updateAlertFields(localAlertId, { status: 'pending', lastError: readableSupabaseError(err) });
        scheduleRetryInsert(localAlertId, authUserId, 1);
      }

      logActivity({
        type:        'sos_sent',
        title:       'SOS Sent',
        description: `Emergency rescue request sent${latitude ? ` from ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''}`,
      });

      Alert.alert(
        '🚨 SOS Sent',
        'Your location has been sent to rescue teams. Please also call the emergency hotlines below.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      console.error('Failed to save SOS:', err);
      setSosPressed(false);
      Alert.alert('SOS Failed', `Could not send alert: ${readableSupabaseError(err)}`);
    }

  };

  const handleSendDetailed = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmModal(false);

    try {
      const targetId = firestoreId || alerts?.[0]?.firestoreId || alerts?.[0]?.id;

      // Try to update remote alert. First try with full remoteRef if available, otherwise use firestoreId alone
      try {
        if (remoteAlertRef) {
          await updateSosAlert(remoteAlertRef, selectedPeople, selectedSituation);
        } else if (targetId) {
          await updateSosAlert(targetId, selectedPeople, selectedSituation);
        }
      } catch (updateErr) {
        console.error('Failed to update remote SOS details:', updateErr);
        // Continue to update locally even if remote update fails
      }

      // Always update local alert
      if (targetId) {
        updateAlert(targetId, selectedPeople || '', selectedSituation || '');
      } else {
        console.warn('No alert id found - cannot update');
      }
    } catch (err) {
      console.error('Failed to update SOS details:', err);
    }

    logActivity({
      type:        'alert_created',
      title:       'Alert Updated',
      description: `Updated SOS: ${selectedPeople} people${selectedSituation ? ` — ${selectedSituation}` : ''}`,
    });

    setSelectedPeople(null);
    setSelectedSituation(null);
    setShowDetails(false);
    setUpdateSent(true);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      <View style={s.banner}>
        <View style={s.bannerIcon}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#ffffff" />
        </View>
        <View style={s.bannerText}>
          <Text style={s.bannerTitle}>Emergency Rescue Request</Text>
          <Text style={s.bannerSub}>Use this only if you or others need immediate rescue assistance</Text>
        </View>
      </View>

      <View style={s.sosCard}>

        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
          <TouchableOpacity
            style={[s.sosButton, isSosActive && s.sosButtonSent]}
            onPress={handleSOSPress}
            activeOpacity={isSosActive ? 1 : 0.85}
            disabled={isSosActive}
          >
            <Ionicons
              name={isSosActive ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={22}
              color={isSosActive ? '#16a34a' : '#ffffff'}
            />
            <Text style={[s.sosButtonText, isSosActive && s.sosButtonTextSent]}>
              {isSosActive ? 'SOS Sent' : 'Send Emergency Alert'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {isSosActive && (
          <View style={s.lockNotice}>
            <Ionicons name="lock-closed-outline" size={14} color="#6b7280" />
            <Text style={s.lockText}>Button locked to prevent duplicate alerts. You can still update your details below.</Text>
          </View>
        )}

        {/* SOS Status Tracker */}
        {isSosActive && (() => {
          const latestAlert = alerts.find(a => a.status === 'dispatched' || a.status === 'rescued' || a.status === 'sent' || a.status === 'pending');
          if (!latestAlert) return null;

          const isDispatched = latestAlert.status === 'dispatched';
          const isRescued = latestAlert.status === 'rescued';

          return (
            <View style={s.statusTracker}>
              <Text style={s.statusTrackerTitle}>Rescue Status</Text>

              {/* Step indicators */}
              <View style={s.statusSteps}>
                {/* Step 1: Sent */}
                <View style={s.statusStep}>
                  <View style={[s.statusStepCircle, { backgroundColor: '#2563eb' }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  <Text style={[s.statusStepLabel, { color: '#2563eb', fontWeight: '700' }]}>Sent</Text>
                </View>

                <View style={[s.statusStepLine, { backgroundColor: isDispatched || isRescued ? '#f59e0b' : '#e5e7eb' }]} />

                {/* Step 2: Dispatched */}
                <View style={s.statusStep}>
                  <View style={[s.statusStepCircle, {
                    backgroundColor: isDispatched || isRescued ? '#f59e0b' : '#e5e7eb',
                  }]}>
                    {isDispatched || isRescued
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '700' }}>2</Text>
                    }
                  </View>
                  <Text style={[s.statusStepLabel, {
                    color: isDispatched || isRescued ? '#f59e0b' : '#9ca3af',
                    fontWeight: isDispatched ? '700' : '500',
                  }]}>Dispatched</Text>
                </View>

                <View style={[s.statusStepLine, { backgroundColor: isRescued ? '#16a34a' : '#e5e7eb' }]} />

                {/* Step 3: Rescued */}
                <View style={s.statusStep}>
                  <View style={[s.statusStepCircle, {
                    backgroundColor: isRescued ? '#16a34a' : '#e5e7eb',
                  }]}>
                    {isRescued
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '700' }}>3</Text>
                    }
                  </View>
                  <Text style={[s.statusStepLabel, {
                    color: isRescued ? '#16a34a' : '#9ca3af',
                    fontWeight: isRescued ? '700' : '500',
                  }]}>Rescued</Text>
                </View>
              </View>

              {/* Status message */}
              {isDispatched && (
                <View style={s.statusMessage}>
                  <View style={[s.statusMessageIcon, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="car-outline" size={20} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusMessageTitle, { color: '#92400e' }]}>Rescue Team Dispatched</Text>
                    <Text style={s.statusMessageBody}>A rescue team is on the way to your location. Stay where you are and keep your phone accessible.</Text>
                  </View>
                </View>
              )}

              {isRescued && (
                <View style={s.statusMessage}>
                  <View style={[s.statusMessageIcon, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusMessageTitle, { color: '#166534' }]}>You Have Been Rescued</Text>
                    <Text style={s.statusMessageBody}>Your rescue has been confirmed. Follow the rescue team's instructions for your safety.</Text>
                  </View>
                </View>
              )}

              {!isDispatched && !isRescued && (
                <View style={s.statusMessage}>
                  <View style={[s.statusMessageIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="time-outline" size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusMessageTitle, { color: '#1e40af' }]}>Waiting for Response</Text>
                    <Text style={s.statusMessageBody}>Your SOS has been received. Rescue teams are being notified. Please stay calm.</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {/* Resend SOS Button */}
        {isSosActive && (() => {
          const activeCount = alerts.filter(a => a.status === 'sent' || a.status === 'pending' || a.status === 'dispatched').length;
          if (activeCount >= 5) return (
            <View style={s.resendLimitBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#6b7280" />
              <Text style={s.resendLimitText}>SOS limit reached (5/5). Wait for alerts to be resolved.</Text>
            </View>
          );
          return (
            <TouchableOpacity
              style={s.resendBtn}
              onPress={() => {
                setSosPressed(false);
                setFirestoreId(null);
                setRemoteAlertRef(null);
                setShowDetails(false);
                setUpdateSent(false);
                // Trigger SOS press again after state resets
                setTimeout(() => handleSOSPress(), 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color="#dc2626" />
              <Text style={s.resendBtnText}>Resend SOS ({activeCount}/5)</Text>
            </TouchableOpacity>
          );
        })()}

        {updateSent && (
          <View style={s.updateSentBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={s.updateSentText}>Details updated — rescue teams have been notified</Text>
          </View>
        )}

        <TouchableOpacity
          style={s.detailsToggle}
          onPress={() => setShowDetails(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.detailsToggleText}>
            {showDetails ? 'Hide details (optional)' : 'Add details (optional)'}
          </Text>
          <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color="#374151" />
        </TouchableOpacity>

        {showDetails && (
          <View style={s.detailsSection}>
            <View style={s.divider} />

            <Text style={s.detailLabel}>
              How many people need rescue? <Text style={s.required}>*</Text>
            </Text>
            <View style={s.peopleGrid}>
              {PEOPLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.peopleBtn, selectedPeople === opt && s.peopleBtnSelected]}
                  onPress={() => { setSelectedPeople(opt); setUpdateSent(false); }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="people"
                    size={22}
                    color={selectedPeople === opt ? '#2563eb' : '#6b7280'}
                  />
                  <Text style={[s.peopleBtnText, selectedPeople === opt && s.peopleBtnTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.detailLabel, { marginTop: 16 }]}>Emergency Situation</Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setShowSituationDropdown(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={selectedSituation ? s.dropdownValue : s.dropdownPlaceholder}>
                {selectedSituation || 'Select situation…'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>

            {showSituationDropdown && (
              <View style={s.dropdownList}>
                {SITUATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={s.dropdownItem}
                    onPress={() => { setSelectedSituation(opt); setShowSituationDropdown(false); }}
                  >
                    <Text style={s.dropdownItemText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.detailHint}>Be specific: building type, floor level, landmarks nearby</Text>

            {(() => {
              const canSend = !!selectedPeople && !!selectedSituation;
              return (
                <TouchableOpacity
                  style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
                  onPress={canSend ? handleSendDetailed : undefined}
                  activeOpacity={canSend ? 0.85 : 1}
                >
                  <Ionicons name={isSosActive ? 'refresh' : 'send'} size={16} color={canSend ? '#ffffff' : '#9ca3af'} />
                  <Text style={[s.sendBtnText, !canSend && s.sendBtnTextDisabled]}>
                    {isSosActive ? 'UPDATE DETAILS' : 'SEND DETAILED REQUEST'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
      </View>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Ionicons name="send-outline" size={28} color="#2563eb" />
            </View>
            <Text style={s.modalTitle}>Update rescue details?</Text>
            <Text style={s.modalBody}>
              You are about to send updated details to rescue teams:
            </Text>
            <View style={s.modalDetails}>
              <View style={s.modalDetailRow}>
                <Ionicons name="people-outline" size={14} color="#374151" />
                <Text style={s.modalDetailText}>{selectedPeople} {parseInt(selectedPeople || '1') === 1 ? 'person needs' : 'people need'} rescue</Text>
              </View>
              {selectedSituation && (
                <View style={s.modalDetailRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#374151" />
                  <Text style={s.modalDetailText}>{selectedSituation}</Text>
                </View>
              )}
            </View>
            <Text style={s.modalNote}>Rescue teams will be notified immediately.</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalConfirmBtn}
                onPress={handleConfirmUpdate}
                activeOpacity={0.85}
              >
                <Text style={s.modalConfirmText}>Yes, send update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={s.hotlineCard}>
        <Text style={s.hotlineTitle}>CALL THESE NUMBERS NOW:</Text>
        {HOTLINES.map((h, i) => (
          <View key={h.label}>
            {i > 0 && <View style={s.divider} />}
            <View style={s.hotlineRow}>
              <Text style={s.hotlineLabel}>{h.label}</Text>
              <View style={s.hotlineRight}>
                <Text style={s.hotlineNumber}>{h.number}</Text>
                <Ionicons name="call" size={18} color="#dc2626" />
              </View>
            </View>
          </View>
        ))}

        <View style={s.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color="#dc2626" />
          <Text style={s.infoText}>
            This app sends your location to rescue teams. Always call emergency hotlines as well for fastest response.
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dbeafe' },
  scroll: { padding: 14, gap: 14, paddingBottom: 32 },

  banner: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerIcon: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.1 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 3, lineHeight: 17 },

  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },

  sosButton: {
    width: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sosButtonSent: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  sosButtonText:     { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  sosButtonTextSent: { color: '#16a34a' },
  sosInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sosTapHint: { fontSize: 13, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
  sosSentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6,
  },
  sosSentText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  lockNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#f9fafb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4, marginTop: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  lockText: { flex: 1, fontSize: 11.5, color: '#6b7280', lineHeight: 17 },

  statusTracker: {
    width: '100%', backgroundColor: '#f9fafb', borderRadius: 14,
    padding: 16, marginTop: 8, marginBottom: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statusTrackerTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 14 },
  statusSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusStep: { alignItems: 'center', gap: 4 },
  statusStepCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  statusStepLabel: { fontSize: 10 },
  statusStepLine: { width: 36, height: 3, borderRadius: 2, marginHorizontal: 6, marginBottom: 14 },
  statusMessage: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  statusMessageIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statusMessageTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  statusMessageBody: { fontSize: 12, color: '#6b7280', lineHeight: 17 },

  resendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', paddingVertical: 13, marginTop: 8, marginBottom: 4,
    backgroundColor: '#fef2f2', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  resendBtnText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  resendLimitBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    width: '100%', paddingVertical: 10, paddingHorizontal: 12, marginTop: 8,
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  resendLimitText: { flex: 1, fontSize: 11.5, color: '#6b7280', lineHeight: 17 },

  detailsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingVertical: 14, marginTop: 4,
  },
  detailsToggleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#f3f4f6', width: '100%', marginBottom: 14 },

  detailsSection: { width: '100%', gap: 0 },
  detailLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  required: { color: '#dc2626' },

  peopleGrid: { flexDirection: 'row', gap: 8 },
  peopleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', gap: 6, backgroundColor: '#f9fafb',
  },
  peopleBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  peopleBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  peopleBtnTextSelected: { color: '#2563eb' },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#f9fafb',
  },
  dropdownValue: { fontSize: 14, color: '#111827' },
  dropdownPlaceholder: { fontSize: 14, color: '#9ca3af' },
  dropdownList: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#ffffff', marginTop: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },

  detailHint: { fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 14 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#2563eb', borderRadius: 12,
    paddingVertical: 14, width: '100%',
  },
  sendBtnDisabled: { backgroundColor: '#e5e7eb' },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  sendBtnTextDisabled: { color: '#9ca3af' },

  hotlineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  hotlineTitle: { fontSize: 13, fontWeight: '800', color: '#dc2626', letterSpacing: 0.4, marginBottom: 12 },
  hotlineRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 13,
  },
  hotlineLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  hotlineRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hotlineNumber: { fontSize: 16, fontWeight: '700', color: '#dc2626' },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    padding: 12, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 18 },

  updateSentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#86efac',
    width: '100%',
  },
  updateSentText: { fontSize: 13, color: '#16a34a', fontWeight: '600', flex: 1 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:       { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  modalIconWrap:   { width: 56, height: 56, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle:      { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  modalBody:       { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  modalDetails:    { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, width: '100%', gap: 8, marginBottom: 12 },
  modalDetailRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalDetailText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  modalNote:       { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20, lineHeight: 17 },
  modalBtns:       { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalConfirmBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText:{ fontSize: 14, fontWeight: '600', color: '#ffffff' },
});