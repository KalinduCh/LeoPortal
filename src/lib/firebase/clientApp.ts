
// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Log the API key to help diagnose environment variable issues
console.log("Firebase Init: NEXT_PUBLIC_FIREBASE_API_KEY on server is:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "NOT SET or EMPTY");
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error("Firebase Init Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or empty. Please check your .env.local file and ensure the Next.js server is restarted.");
}


const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

