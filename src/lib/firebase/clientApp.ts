
// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getMessaging, onMessage, type Messaging } from 'firebase/messaging';
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

export { app, auth, db, analytics, messaging, functions, httpsCallable };
