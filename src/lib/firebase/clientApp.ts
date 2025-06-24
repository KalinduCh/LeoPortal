// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getMessaging, onMessage, type Messaging } from 'firebase/messaging';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let analytics: Analytics | undefined;
let messaging: Messaging | undefined;

// Check if all required Firebase config values are present
export const isFirebaseConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
);

if (isFirebaseConfigured) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);

    if (typeof window !== 'undefined') {
        isSupported().then((supported) => {
            if (supported) {
                analytics = getAnalytics(app);
                messaging = getMessaging(app);

                onMessage(messaging, (payload) => {
                    console.log('Foreground message received. ', payload);
                    const notificationTitle = payload.notification?.title || "New Notification";
                    const notificationBody = payload.notification?.body || "";
                    new Notification(notificationTitle, { body: notificationBody });
                });
            }
        });
    }
} else {
    console.error("Firebase is not configured. Please add your Firebase config to .env.local and restart the development server.");
    // @ts-ignore - These will be guarded by isFirebaseConfigured in the app
    app = null;
    // @ts-ignore
    auth = null;
    // @ts-ignore
    db = null;
    // @ts-ignore
    functions = null;
    analytics = undefined;
    messaging = undefined;
}


export { app, auth, db, analytics, messaging, functions, httpsCallable };
