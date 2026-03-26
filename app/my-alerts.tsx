import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform, Modal,
  TextInput, Alert, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './AppContext';

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

export default function MyAlertsScreen() {
  const { alerts, updateAlert, logActivity } = useApp();
  const [editingAlert, setEditingAlert]           = useState<string | null>(null);
  const [editPeople, setEditPeople]               = useState('');
  const [editSituation, setEditSituation]         = useState('');
  const [editDescription, setEditDescription]     = useState('');
  const [showSituationDrop, setShowSituationDrop] = useState(false);

  const openEdit = (id: string, people: string | null, situation: string | null) => {
    setEditingAlert(id);
    setEditPeople(people || '');
    // If the stored situation matches a preset option, pre-select it;
    // otherwise treat it as a free-text description
    if (situation && SITUATION_OPTIONS.includes(situation)) {
      setEditSituation(situation);
      setEditDescription('');
    } else {
      setEditSituation('');
      setEditDescription(situation || '');
    }
    setShowSituationDrop(false);
  };

  const handleSave = () => {
    if (!editingAlert) return;
    // Combine dropdown selection + optional description
    const combinedSituation = [editSituation, editDescription.trim()]
      .filter(Boolean)
      .join(' — ');

    updateAlert(editingAlert, editPeople, combinedSituation || null);
    logActivity({
      type: 'alert_edited',
      title: 'Alert Edited',
      description: `Updated emergency alert — ${editPeople} people${combinedSituation ? `: ${combinedSituation}` : ''}`,
    });
    setEditingAlert(null);
    if (Platform.OS === 'web') {
      window.alert('Alert details updated.');
    } else {
      Alert.alert('Saved', 'Alert details updated.');
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
        <Text style={s.sectionTitle}>Emergency Alerts</Text>

        {alerts.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyTitle}>No alerts yet</Text>
            <Text style={s.emptySub}>When you send an SOS, it will appear here.</Text>
          </View>
        ) : (
          alerts.map(alert => (
            <View key={alert.id} style={s.alertCard}>
              <View style={s.alertTop}>
                <View style={s.alertTitleRow}>
                  <Text style={s.alertId}>Emergency Alert #{alert.id.slice(-8)}</Text>
                  <View style={s.sentBadge}>
                    <Ionicons name="time-outline" size={12} color="#ca8a04" />
                    <Text style={s.sentText}>SENT</Text>
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

              <TouchableOpacity
                style={s.editBtn}
                onPress={() => openEdit(alert.id, alert.people, alert.situation)}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil" size={14} color="#ffffff" />
                <Text style={s.editBtnText}>Edit Alert</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={!!editingAlert}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingAlert(null)}
      >
        {/* KeyboardAvoidingView keeps the sheet visible when keyboard opens */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditingAlert(null)}
          >
            {/* Stop press propagation so tapping inside sheet doesn't close it */}
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <ScrollView
                style={s.modalSheet}
                contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Sheet header */}
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Emergency Alert</Text>
                  <TouchableOpacity onPress={() => setEditingAlert(null)} style={s.modalClose}>
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* ── People picker ── */}
                <Text style={s.modalLabel}>Number of People</Text>
                <View style={s.peoplePicker}>
                  {PEOPLE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.peopleOpt, editPeople === opt && s.peopleOptSelected]}
                      onPress={() => setEditPeople(opt)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="people"
                        size={20}
                        color={editPeople === opt ? '#2563eb' : '#6b7280'}
                      />
                      <Text style={[s.peopleOptText, editPeople === opt && s.peopleOptTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Situation dropdown ── */}
                <Text style={[s.modalLabel, { marginTop: 18 }]}>Emergency Situation</Text>
                <TouchableOpacity
                  style={s.dropdown}
                  onPress={() => setShowSituationDrop(v => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={editSituation ? s.dropdownValue : s.dropdownPlaceholder}>
                    {editSituation || 'Select situation…'}
                  </Text>
                  <Ionicons
                    name={showSituationDrop ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#6b7280"
                  />
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
                        onPress={() => {
                          setEditSituation(opt);
                          setShowSituationDrop(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          s.dropdownItemText,
                          editSituation === opt && s.dropdownItemTextSelected,
                        ]}>
                          {opt}
                        </Text>
                        {editSituation === opt && (
                          <Ionicons name="checkmark" size={16} color="#2563eb" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ── Optional description ── */}
                <Text style={[s.modalLabel, { marginTop: 18 }]}>
                  Additional Description{' '}
                  <Text style={s.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={s.descInput}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="e.g. 3rd floor, near the elevator, landmark nearby…"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                  returnKeyType="done"
                  blurOnSubmit
                />
                <Text style={s.charCount}>{editDescription.length}/200</Text>

                {/* ── Action buttons ── */}
                <View style={s.modalBtns}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => setEditingAlert(null)}
                    activeOpacity={0.7}
                  >
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },

  // Empty state
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  // Alert card
  alertCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12,
  },
  alertTop: { gap: 2 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertId: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#fbbf24', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  sentText:  { fontSize: 10, fontWeight: '700', color: '#ca8a04' },
  alertTime: { fontSize: 12, color: '#9ca3af' },

  alertDetails: { gap: 8, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#374151', fontWeight: '600' },

  editBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  editBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',          // never taller than 92% of screen
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  optional:   { fontSize: 13, fontWeight: '400', color: '#9ca3af' },

  // People picker
  peoplePicker: { flexDirection: 'row', gap: 8 },
  peopleOpt: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', gap: 5, backgroundColor: '#ffffff',
  },
  peopleOptSelected:     { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  peopleOptText:         { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  peopleOptTextSelected: { color: '#2563eb' },

  // Situation dropdown
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

  // Description input
  descInput: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#111827',
    minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },

  // Buttons
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