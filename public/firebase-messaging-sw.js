
// This file needs to be in the public directory

// In order for Firebase Messaging to work in the background, this file must be called firebase-messaging-sw.js
// and be located in the public folder.

// Import and initialize the Firebase SDK
// It's important to import the sw.js build of the SDK
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Get your Firebase configuration object from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
};


const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This handler will be called when a push notification is received while the service worker is in the background.
onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'New LEO Portal Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new update.',
        icon: payload.notification?.icon || '/icons/icon-192x192.png' // Default icon
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
