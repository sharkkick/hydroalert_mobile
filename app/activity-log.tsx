import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './AppContext';

const TYPE_CONFIG = {
  login: {
    icon: 'log-in-outline' as const,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    timeBg: '#dcfce7',
    timeColor: '#16a34a',
  },
  logout: {
    icon: 'log-out-outline' as const,
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
    timeBg: '#f3f4f6',
    timeColor: '#6b7280',
  },
  register: {
    icon: 'person-add-outline' as const,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    timeBg: '#eff6ff',
    timeColor: '#2563eb',
  },
  alert_created: {
    icon: 'warning-outline' as const,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    timeBg: '#fee2e2',
    timeColor: '#dc2626',
  },
  alert_edited: {
    icon: 'create-outline' as const,
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    timeBg: '#fef3c7',
    timeColor: '#d97706',
  },
  profile_updated: {
    icon: 'person-outline' as const,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    timeBg: '#eff6ff',
    timeColor: '#2563eb',
  },
  sos_sent: {
    icon: 'alert-circle-outline' as const,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    timeBg: '#fee2e2',
    timeColor: '#dc2626',
  },
};

export default function ActivityLogScreen() {
  const { activities, loadingActivities } = useApp();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Activity Log</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.sectionTitle}>Activity Log</Text>

        {/* Loading State */}
        {loadingActivities ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={s.loadingText}>Loading activities...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="time-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyTitle}>No activity yet</Text>
            <Text style={s.emptySub}>Your actions will be recorded here.</Text>
          </View>
        ) : (
          activities.map(activity => {
            const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.login;
            return (
              <View key={activity.id} style={s.activityCard}>
                <View style={[s.iconCircle, { backgroundColor: config.iconBg }]}>
                  <Ionicons name={config.icon} size={24} color={config.iconColor} />
                </View>
                <View style={s.activityBody}>
                  <View style={s.activityTop}>
                    <Text style={s.activityTitle}>{activity.title}</Text>
                    <View style={[s.timeBadge, { backgroundColor: config.timeBg }]}>
                      <Text style={[s.timeText, { color: config.timeColor }]}>{activity.timeAgo}</Text>
                    </View>
                  </View>
                  <Text style={s.activityDesc}>{activity.description}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },

  loadingCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  loadingText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },

  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  activityBody: { flex: 1 },
  activityTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  activityTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  timeBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8, flexShrink: 0,
  },
  timeText: { fontSize: 11, fontWeight: '600' },
  activityDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
});