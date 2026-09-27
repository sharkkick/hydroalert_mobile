import { Tabs, router } from 'expo-router';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useApp } from '../app-context';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');

// ── Slide-out Menu ──
function SideMenu({ visible, onClose, onLogout }: { visible: boolean; onClose: () => void; onLogout: () => void }) {
  const { user } = useApp();
  
  const displayName = user.firstName
    ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName)
    : (user.email ? user.email.split('@')[0] : 'User');

  const menuItems = [
    { icon: 'person-outline' as const,        label: 'Profile',      route: '/profile'      },
    { icon: 'notifications-outline' as const,  label: 'My Alerts',   route: '/my-alerts'   },
    { icon: 'time-outline' as const,           label: 'Activity Log', route: '/activity-log' },
  ];

  const handleMenuItem = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={m.overlay}>
        <TouchableOpacity style={m.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={m.drawer}>
          <View style={m.drawerHeader}>
            <View style={m.avatarCircle}>
              <Ionicons name="person" size={36} color="#ffffff" />
            </View>
            <Text style={m.menuTitle}>{displayName}</Text>
          </View>

          <View style={m.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.label} style={m.menuItem} activeOpacity={0.7} onPress={() => handleMenuItem(item.route)}>
                <View style={m.menuIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#2563eb" />
                </View>
                <Text style={m.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={m.divider} />

          <TouchableOpacity style={m.signOutBtn} activeOpacity={0.7} onPress={onLogout}>
            <View style={m.signOutIconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={m.signOutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:  { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    width: width * 0.72,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 24,
    gap: 12,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuTitle:       { fontSize: 22, fontWeight: '700', color: '#ffffff', marginTop: 4, textAlign: 'center' },
  menuList:        { paddingTop: 8 },
  menuItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, gap: 14 },
  menuIconWrap:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  menuLabel:       { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  divider:         { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 24, marginVertical: 8 },
  signOutBtn:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, gap: 14 },
  signOutIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  signOutLabel:    { fontSize: 15, fontWeight: '600', color: '#ef4444' },
});

// ── Header ──
function HeaderLeft({ title }: { title: string }) {
  return (
    <View style={h.headerLeft}>
      <View style={h.logoCircle}>
        <Ionicons name="water" size={22} color="#ffffff" />
      </View>
      <View>
        <Text style={h.headerTitle}>HydroAlert</Text>
        <Text style={h.headerSub}>{title}</Text>
      </View>
    </View>
  );
}

function HeaderRight({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={h.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="menu" size={28} color="#ffffff" />
    </TouchableOpacity>
  );
}

const h = StyleSheet.create({
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 0 },
  logoCircle:  { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', lineHeight: 22 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 16 },
  menuBtn:     { marginRight: 0, paddingRight: 16 },
});

// ── Root Tab Layout ──
export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Request notification permissions on app start ──
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Notification permission not granted');
        } else {
          console.log('✅ Notification permission granted');
        }
      } catch (err) {
        console.error('Error requesting notification permissions:', err);
      }
    };
    requestPermissions();
  }, []);

  const { setUser, logActivity } = useApp();

  const handleLogout = async () => {
    setMenuVisible(false);
    // Clear local user so UI components (like SOS) can reset themselves on logout.
    setUser({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      barangay: '',
    });
    logActivity({ type: 'logout', title: 'Logged Out', description: 'User signed out' });
    router.replace('/login');
  };

  const sharedOptions = (title: string) => ({
    headerTitle: () => <HeaderLeft title={title} />,
    headerLeft:  () => null,
    headerRight: () => <HeaderRight onPress={() => setMenuVisible(true)} />,
    headerStyle: {
      backgroundColor: '#2563eb',
      height: Platform.OS === 'ios' ? 100 : 80,
    },
    headerTintColor: '#ffffff',
    headerTitleAlign: 'left' as const,
    headerLeftContainerStyle:  { paddingLeft: 0, width: 0 },
    headerTitleContainerStyle: { paddingLeft: 16, marginLeft: 0, left: 0, right: 0 },
    headerRightContainerStyle: { paddingRight: 0 },
  });

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor:   '#2563eb',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor:  '#e5e7eb',
            borderTopWidth:  1,
            height:          Platform.OS === 'ios' ? 88 : 68,
            paddingBottom:   Platform.OS === 'ios' ? 24 : 10,
            paddingTop:      10,
            shadowColor:     '#000',
            shadowOffset:    { width: 0, height: -2 },
            shadowOpacity:   0.06,
            shadowRadius:    8,
            elevation:       10,
          },
          tabBarLabelStyle: {
            fontSize:      12,
            fontWeight:    '600',
            marginTop:     3,
            letterSpacing: 0.2,
          },
          tabBarItemStyle: {
            flex:              1,
            paddingHorizontal: 0,
            minWidth:          0,
          },
          tabBarIconStyle: { marginBottom: 0 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            ...sharedOptions('Flood Awareness'),
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="info"
          options={{
            title: 'Status',
            ...sharedOptions('Flood Status'),
            tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            ...sharedOptions('Analytics'),
            tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sos"
          options={{
            title: 'SOS',
            ...sharedOptions('SOS'),
            tabBarIcon: ({ color }) => <Ionicons name="alert-circle-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            ...sharedOptions('SOS Map'),
            tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="water"
          options={{ href: null, ...sharedOptions('Water Levels') }}
        />
        <Tabs.Screen
          name="rainfall"
          options={{ href: null, ...sharedOptions('Rainfall') }}
        />
      </Tabs>

      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} onLogout={handleLogout} />
    </>
  );
}