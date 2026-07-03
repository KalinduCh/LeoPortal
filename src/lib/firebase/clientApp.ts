// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getMessaging, onMessage, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let analytics: Analytics | undefined;
let messaging: Messaging | undefined;

// Initialize Firebase
app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
auth = getAuth(app);
db = getFirestore(app);
functions = getFunctions(app);

// Safe initialization for client-side only services
if (typeof window !== 'undefined') {
    // Analytics initialization
    isAnalyticsSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });

    // Messaging initialization with robust feature detection
    isMessagingSupported().then((supported) => {
        // Standard Web Push requires Service Worker and Notification API
        const hasRequiredApis = 'serviceWorker' in navigator && 'Notification' in window;
        
        if (supported && hasRequiredApis) {
            try {
                messaging = getMessaging(app);

                onMessage(messaging, (payload) => {
                    console.log('Foreground message received. ', payload);
                    const notificationTitle = payload.notification?.title || "New Notification";
                    const notificationBody = payload.notification?.body || "";
                    
                    // Native notification fallback for foreground
                    if (Notification.permission === 'granted') {
                        new Notification(notificationTitle, { 
                            body: notificationBody,
                            icon: "https://i.imgur.com/MP1YFNf.png"
                        });
                    }
                });
            } catch (err) {
                console.warn('Firebase Messaging failed to initialize:', err);
            }
        } else {
            console.log('Firebase Messaging is not supported in this browser environment.');
        }
    });
}

export { app, auth, db, analytics, messaging, functions, httpsCallable };
