import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform, Modal,
  TextInput, Alert, Dimensions, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './app-context';
import { supabase } from '../lib/supabase';

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

const STATUS_CONFIG = {
  sent:       { label: 'PENDING',    color: '#ca8a04', border: '#fbbf24', bg: '#fffbeb', icon: 'time-outline'            },
  pending:    { label: 'PENDING',    color: '#ca8a04', border: '#fbbf24', bg: '#fffbeb', icon: 'time-outline'            },
  dispatched: { label: 'DISPATCHED', color: '#2563eb', border: '#93c5fd', bg: '#eff6ff', icon: 'car-outline'             },
  rescued:    { label: 'RESCUED',    color: '#16a34a', border: '#86efac', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
} as const;

function peopleToNumber(value: string | null): number | null {
  if (!value) return null;
  if (value === '1') return 1;
  if (value === '2-5') return 5;
  if (value === '6-10') return 10;
  if (value === '10+') return 10;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

async function updateRemoteSosAlert(
  remoteId: string,
  people: string,
  situation: string,
) {
  const peopleCount = peopleToNumber(people || null);

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

  let situationTypeId: number | null = null;
  if (situation) {
    // Try exact match first, then check if the situation contains one of the keys
    situationTypeId = SITUATION_TYPE_MAP[situation] ?? null;
    if (!situationTypeId) {
      for (const [key, id] of Object.entries(SITUATION_TYPE_MAP)) {
        if (situation.includes(key)) { situationTypeId = id; break; }
      }
    }
    if (!situationTypeId) situationTypeId = 6; // default to Other
  }

  // Build payload matching actual schema
  const payload: Record<string, any> = {};
  if (peopleCount !== null) payload.number_of_people = peopleCount;
  if (situationTypeId !== null) payload.situation_type_id = situationTypeId;

  if (Object.keys(payload).length === 0) {
    return { table: 'sos_alerts', idColumn: 'sos_id', id: remoteId };
  }

  // The primary key column is sos_id
  const { data, error } = await supabase
    .from('sos_alerts')
    .update(payload)
    .eq('sos_id', remoteId)
    .select('sos_id, number_of_people, situation_type_id');

  console.log('[updateRemoteSosAlert] result:', { data, error: error?.message });

  if (error) {
    throw new Error(error.message);
  }

  return { table: 'sos_alerts', idColumn: 'sos_id', id: remoteId };
}

function readableSupabaseError(error: any): string {
  if (!error) return 'Unknown error.';
  const message = String(error.message || error.error_description || error.details || 'Unknown error.');
  if (message.toLowerCase().includes('row-level security')) return 'Permission denied by Supabase RLS policy.';
  return message;
}

export default function MyAlertsScreen() {
  const { alerts, updateAlert, updateAlertFields, logActivity, loadingAlerts, refreshAlerts } = useApp();
  const [editingAlert,       setEditingAlert]       = useState<string | null>(null);
  const [editPeople,         setEditPeople]         = useState('');
  const [editSituation,      setEditSituation]      = useState('');
  const [editDescription,    setEditDescription]    = useState('');
  const [showSituationDrop,  setShowSituationDrop]  = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);

  const openEdit = (firestoreId: string, people: string | null, situation: string | null) => {
    setEditingAlert(firestoreId);
    setEditPeople(people || '');
    if (situation && SITUATION_OPTIONS.includes(situation)) {
      setEditSituation(situation);
      setEditDescription('');
    } else {
      setEditSituation('');
      setEditDescription(situation || '');
    }
    setShowSituationDrop(false);
  };

  const handleSave = async () => {
    if (!editingAlert) return;
    const combinedSituation = [editSituation, editDescription.trim()]
      .filter(Boolean).join(' — ');

    // Find the actual alert to get the real firestoreId (Supabase remote ID)
    const targetAlert = alerts.find(a => a.id === editingAlert || a.firestoreId === editingAlert);
    const firestoreId = targetAlert?.firestoreId || '';
    // Only use firestoreId if it's a real remote ID (not empty, not local)
    const remoteId = (firestoreId && firestoreId.length > 0 && !firestoreId.startsWith('alert_'))
      ? firestoreId
      : null;

    // Optimistic: update local state and close modal immediately
    const alertKey = editingAlert;
    updateAlert(alertKey, editPeople, combinedSituation || '');
    logActivity({
      type: 'alert_edited',
      title: 'Alert Edited',
      description: `Updated emergency alert — ${editPeople} people${combinedSituation ? `: ${combinedSituation}` : ''}`,
    });
    setEditingAlert(null);

    if (!remoteId) {
      console.warn('[handleSave] No remote ID available, cannot sync to Supabase. firestoreId:', firestoreId);
      if (updateAlertFields) updateAlertFields(alertKey, { lastError: 'Alert not yet synced to server', syncInfo: null });
      return;
    }

    // Sync to Supabase in background (no waiting)
    updateRemoteSosAlert(remoteId, editPeople, combinedSituation || editSituation || editDescription)
      .then((res) => {
        if (res && res.table) {
          updateAlertFields(alertKey, { lastError: null, syncInfo: `${res.table}.${res.idColumn}:${res.id}` });
        } else {
          updateAlertFields(alertKey, { lastError: 'No matching remote row', syncInfo: null });
        }
      })
      .catch((error) => {
        console.error('[handleSave] Failed to sync edited alert to Supabase:', error);
        updateAlertFields(alertKey, { lastError: readableSupabaseError(error), syncInfo: null });
      });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAlerts();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Section title + Refresh button */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Emergency Alerts</Text>
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing
              ? <ActivityIndicator size="small" color="#2563eb" />
              : <Ionicons name="sync" size={20} color="#2563eb" />
            }
          </TouchableOpacity>
        </View>

        {loadingAlerts ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={s.loadingText}>Loading alerts...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyTitle}>No alerts yet</Text>
            <Text style={s.emptySub}>When you send an SOS, it will appear here.</Text>
          </View>
        ) : (
          alerts.map(alert => {
            const statusKey = (alert.status in STATUS_CONFIG)
              ? alert.status as keyof typeof STATUS_CONFIG
              : 'pending';
            const statusCfg = STATUS_CONFIG[statusKey];
            const fid = alert.firestoreId || alert.id;

            return (
              <View key={alert.id} style={s.alertCard}>
                {(statusKey === 'dispatched' || statusKey === 'rescued') && (
                  <View style={[s.statusBanner, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                    <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
                    <Text style={[s.statusBannerText, { color: statusCfg.color }]}>
                      {statusKey === 'dispatched'
                        ? 'Rescue team has been dispatched to your location!'
                        : 'You have been successfully rescued!'}
                    </Text>
                  </View>
                )}

                <View style={s.alertTop}>
                  <View style={s.alertTitleRow}>
                    <Text style={s.alertId}>Emergency Alert ALT-{alert.firestoreId && !alert.firestoreId.startsWith('alert_') ? alert.firestoreId : '...'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {alert.syncInfo ? (
                        <View style={s.syncBadge}>
                          <Text style={s.syncBadgeText}>Synced</Text>
                        </View>
                      ) : alert.lastError ? (
                        <View style={s.errBadge}>
                          <Text style={s.errBadgeText}>Error</Text>
                        </View>
                      ) : null}
                      <View style={[s.sentBadge, { borderColor: statusCfg.border, backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
                        <Text style={[s.sentText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.alertTime}>{alert.timeAgo}</Text>
                </View>

                <View style={s.alertDetails}>
                  <View style={s.detailRow}>
                    <Ionicons name="location" size={14} color="#2563eb" />
                    <View>
                      <Text style={s.detailLabel}>Location</Text>
                      <Text style={s.detailValue}>{alert.location}</Text>
                    </View>
                  </View>
                  {alert.people && (
                    <View style={s.detailRow}>
                      <Ionicons name="people" size={14} color="#2563eb" />
                      <View>
                        <Text style={s.detailLabel}>People</Text>
                        <Text style={s.detailValue}>{alert.people}</Text>
                      </View>
                    </View>
                  )}
                  {alert.situation && (
                    <View style={s.detailRow}>
                      <Ionicons name="warning" size={14} color="#dc2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLabel}>Situation</Text>
                        <Text style={s.detailValue}>{alert.situation}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Action buttons row */}
                <View style={s.actionRow}>
                  {/* Edit button — hidden if rescued */}
                  {statusKey !== 'rescued' && (
                    <TouchableOpacity
                      style={s.editBtn}
                      onPress={() => openEdit(fid, alert.people, alert.situation)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="pencil" size={14} color="#ffffff" />
                      <Text style={s.editBtnText}>Edit Alert</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={!!editingAlert}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingAlert(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditingAlert(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <ScrollView
                style={s.modalSheet}
                contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Emergency Alert</Text>
                  <TouchableOpacity onPress={() => setEditingAlert(null)} style={s.modalClose}>
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                <Text style={s.modalLabel}>Number of People</Text>
                <View style={s.peoplePicker}>
                  {PEOPLE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.peopleOpt, editPeople === opt && s.peopleOptSelected]}
                      onPress={() => setEditPeople(opt)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="people" size={20} color={editPeople === opt ? '#2563eb' : '#6b7280'} />
                      <Text style={[s.peopleOptText, editPeople === opt && s.peopleOptTextSelected]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.modalLabel, { marginTop: 18 }]}>Emergency Situation</Text>
                <TouchableOpacity style={s.dropdown} onPress={() => setShowSituationDrop(v => !v)} activeOpacity={0.7}>
                  <Text style={editSituation ? s.dropdownValue : s.dropdownPlaceholder}>
                    {editSituation || 'Select situation…'}
                  </Text>
                  <Ionicons name={showSituationDrop ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
                </TouchableOpacity>

                {showSituationDrop && (
                  <View style={s.dropdownList}>
                    {SITUATION_OPTIONS.map((opt, i) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          s.dropdownItem,
                          i === SITUATION_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                          editSituation === opt && s.dropdownItemSelected,
                        ]}
                        onPress={() => { setEditSituation(opt); setShowSituationDrop(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.dropdownItemText, editSituation === opt && s.dropdownItemTextSelected]}>{opt}</Text>
                        {editSituation === opt && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[s.modalLabel, { marginTop: 18 }]}>
                  Additional Description <Text style={s.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={s.descInput}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="e.g. 3rd floor, near the elevator, landmark nearby…"
                  placeholderTextColor="#9ca3af"
                  multiline numberOfLines={3} maxLength={200}
                  textAlignVertical="top" returnKeyType="done" blurOnSubmit
                />
                <Text style={s.charCount}>{editDescription.length}/200</Text>

                <View style={s.modalBtns}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingAlert(null)} activeOpacity={0.7}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Text style={s.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#dbeafe' },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 4,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bfdbfe',
  },

  loadingCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  loadingText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },

  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  alertCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12,
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  alertTop: { gap: 2 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  sentText:  { fontSize: 10, fontWeight: '700' },
  alertTime: { fontSize: 12, color: '#9ca3af' },
  syncBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  syncBadgeText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  errBadge: {
    backgroundColor: '#fff1f2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errBadgeText: { fontSize: 11, color: '#dc2626', fontWeight: '700' },
  alertDetails: { gap: 8, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#374151', fontWeight: '600' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: {
    flex: 1, backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  editBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  optional:   { fontSize: 13, fontWeight: '400', color: '#9ca3af' },
  peoplePicker: { flexDirection: 'row', gap: 8 },
  peopleOpt: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', gap: 5, backgroundColor: '#ffffff',
  },
  peopleOptSelected:     { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  peopleOptText:         { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  peopleOptTextSelected: { color: '#2563eb' },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#ffffff',
  },
  dropdownValue:       { fontSize: 14, color: '#111827' },
  dropdownPlaceholder: { fontSize: 14, color: '#9ca3af' },
  dropdownList: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#ffffff', marginTop: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dropdownItemSelected:     { backgroundColor: '#eff6ff' },
  dropdownItemText:         { fontSize: 14, color: '#374151' },
  dropdownItemTextSelected: { color: '#2563eb', fontWeight: '600' },
  descInput: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#111827',
    minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  modalBtns:   { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:   {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveBtn:       { flex: 2, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});