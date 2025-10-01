// public/firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { getFunctions } from 'firebase/functions'; // Although not used, it is good to have for consistency

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

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New LeoPortal Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
