<<<<<<< HEAD

// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
=======
// public/firebase-messaging-sw.js
// This file must be in the public directory to be served at the root of the domain.

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
>>>>>>> 3a308af48d89ca619759fa3f62a504ba7d34bc5e

firebase.initializeApp({
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
});

<<<<<<< HEAD
=======
// Initialize the Firebase app in the service worker
// by passing in the messagingSenderId.
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
>>>>>>> 3a308af48d89ca619759fa3f62a504ba7d34bc5e
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
<<<<<<< HEAD
    icon: '/icons/icon-192x192.png'
=======
    icon: payload.notification.icon || '/icon-192x192.png',
>>>>>>> 3a308af48d89ca619759fa3f62a504ba7d34bc5e
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
