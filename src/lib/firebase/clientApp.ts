
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getMessaging, type Messaging } from 'firebase/messaging';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
};

let app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let auth: Auth = getAuth(app);
let db: Firestore = getFirestore(app);
let functions: Functions = getFunctions(app);
let analytics: Analytics | undefined;
let messaging: Messaging | undefined;

if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => { if (supported) analytics = getAnalytics(app); });
}

export { app, auth, db, analytics, messaging, functions };
