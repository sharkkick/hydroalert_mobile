import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';

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
  time: string;
  timeAgo: string;
  people: string | null;
  situation: string | null;
  location: string;
  status: 'sent';
}

export interface UserData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  barangay: string;
}

interface AppContextType {
  user: UserData;
  setUser: (u: UserData) => void;
  alerts: Alert[];
  addAlert: (a: Alert) => void;
  updateAlert: (id: string, people: string, situation: string) => void;
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

  // Load user data from AsyncStorage on app start
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUserData = await AsyncStorage.getItem('userData');
        if (savedUserData) {
          setUserState(JSON.parse(savedUserData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // Real-time listener for activities from Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const activitiesRef = collection(db, 'users', currentUser.uid, 'activities');
          const q = query(activitiesRef, orderBy('timestamp', 'desc'));
          
          const unsubscribeActivities = onSnapshot(q, (snapshot) => {
            const activitiesData: ActivityEntry[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              const firestoreTimestamp = data.timestamp;
              let timestampMs = Date.now();
              
              // Handle both Firestore Timestamp and milliseconds
              if (firestoreTimestamp instanceof Timestamp) {
                timestampMs = firestoreTimestamp.toMillis();
              } else if (typeof firestoreTimestamp === 'number') {
                timestampMs = firestoreTimestamp;
              }
              
              activitiesData.push({
                id: doc.id,
                type: data.type,
                title: data.title,
                description: data.description,
                timeAgo: getTimeAgo(timestampMs),
                timestamp: timestampMs,
              });
            });
            setActivities(activitiesData);
            setLoadingActivities(false);
          });
          
          return () => unsubscribeActivities();
        } catch (error) {
          console.error('Error setting up activities listener:', error);
          setLoadingActivities(false);
        }
      } else {
        setActivities([]);
        setLoadingActivities(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for alerts from Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const alertsRef = collection(db, 'users', currentUser.uid, 'alerts');
          const q = query(alertsRef, orderBy('timestamp', 'desc'));
          
          const unsubscribeAlerts = onSnapshot(q, (snapshot) => {
            const alertsData: Alert[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              const firestoreTimestamp = data.timestamp;
              let timestampMs = Date.now();
              
              // Handle both Firestore Timestamp and milliseconds
              if (firestoreTimestamp instanceof Timestamp) {
                timestampMs = firestoreTimestamp.toMillis();
              } else if (typeof firestoreTimestamp === 'number') {
                timestampMs = firestoreTimestamp;
              }
              
              alertsData.push({
                id: doc.id,
                time: new Date(timestampMs).toLocaleString(),
                timeAgo: getTimeAgo(timestampMs),
                people: data.people || null,
                situation: data.situation || null,
                location: data.location || 'Detected',
                status: 'sent' as const,
              });
            });
            setAlerts(alertsData);
            setLoadingAlerts(false);
          });
          
          return () => unsubscribeAlerts();
        } catch (error) {
          console.error('Error setting up alerts listener:', error);
          setLoadingAlerts(false);
        }
      } else {
        setAlerts([]);
        setLoadingAlerts(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Log activity to Firestore
  const logActivity = async (entry: Omit<ActivityEntry, 'id' | 'timeAgo' | 'timestamp'>) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const activitiesRef = collection(db, 'users', currentUser.uid, 'activities');
        await addDoc(activitiesRef, {
          type: entry.type,
          title: entry.title,
          description: entry.description,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const setUser = async (u: UserData) => {
    setUserState(u);
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(u));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const addAlert = async (a: Alert) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const alertsRef = collection(db, 'users', currentUser.uid, 'alerts');
        await addDoc(alertsRef, {
          people: a.people || null,
          situation: a.situation || null,
          location: a.location,
          status: a.status,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding alert:', error);
    }
  };

  const updateAlert = async (id: string, people: string, situation: string) => {
    // Note: For full functionality, you might want to update Firestore here too
    // For now, just update local state
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, people, situation } : a));
  };

  // Refresh timeAgo values every minute
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activitiesWithFreshTime = activities.map(a => ({
    ...a,
    timeAgo: getTimeAgo(a.timestamp),
  }));

  const alertsWithFreshTime = alerts.map(a => ({
    ...a,
    timeAgo: getTimeAgo(new Date(a.time).getTime()),
  }));

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      alerts: alertsWithFreshTime,
      addAlert,
      updateAlert,
      activities: activitiesWithFreshTime,
      logActivity,
      loadingActivities,
      loadingAlerts,
    }}>
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