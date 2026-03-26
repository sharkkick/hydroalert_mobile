  import React, { createContext, useContext, useState, ReactNode } from 'react';

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

  interface UserData {
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
      firstName: '', middleName: '', lastName: '',
      email: '', phone: '', city: '', barangay: '',
    });
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [activities, setActivities] = useState<ActivityEntry[]>([]);

    const logActivity = (entry: Omit<ActivityEntry, 'id' | 'timeAgo' | 'timestamp'>) => {
      const timestamp = Date.now();
      setActivities(prev => [{
        ...entry,
        id: timestamp.toString(),
        timeAgo: 'Just now',
        timestamp,
      }, ...prev]);
    };

    const setUser = (u: UserData) => {
      setUserState(u);
    };

    const addAlert = (a: Alert) => {
      setAlerts(prev => [a, ...prev]);
    };

    const updateAlert = (id: string, people: string, situation: string) => {
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

    return (
      <AppContext.Provider value={{
        user, setUser, alerts, addAlert, updateAlert,
        activities: activitiesWithFreshTime, logActivity,
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

  export default function AppContextModule() { return null; }