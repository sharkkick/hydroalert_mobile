// firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// PASTE YOUR FIREBASE CONFIG HERE after setting up your project at
// https://console.firebase.google.com
// Project Settings → Your apps → Web app → SDK setup and configuration
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import { getAuth }                 from 'firebase/auth';
import { getFirestore }            from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDUclK_GhoYgIgsyyAeKYYMlTqY5-AjXmU',
  authDomain:        'hydroalertmobile.firebaseapp.com',
  projectId:         'hydroalertmobile',
  storageBucket:     'hydroalertmobile.firebasestorage.app',
  messagingSenderId: '588417645105',
  appId:             '1:588417645105:web:66599b1105eca9572cf310',
  measurementId:     'G-EMG743XF8P',
};

// Prevent re-initializing on hot reload
const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;