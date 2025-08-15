
// public/firebase-messaging-sw.js

// Using require syntax for compatibility in service worker environment
const firebase = require("firebase/app");
const messaging = require("firebase/messaging");

// IMPORTANT: This file should not be processed by webpack, but be in the public folder.

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// Note: This configuration is intentionally minimal for the service worker.
// It's safe to expose the sender ID.
firebase.initializeApp({
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
try {
    const messagingInstance = firebase.messaging();
    console.log("Firebase messaging service worker is set up");

    // Optional: If you want to handle background messages here.
    // messagingInstance.onBackgroundMessage((payload) => {
    //   console.log('[firebase-messaging-sw.js] Received background message ', payload);
    //   const notificationTitle = payload.notification.title;
    //   const notificationOptions = {
    //     body: payload.notification.body,
    //     icon: '/icon-192x192.png'
    //   };
    //   self.registration.showNotification(notificationTitle, notificationOptions);
    // });

} catch (error) {
    console.error("Error initializing Firebase messaging service worker:", error);
}

// If you're using next-pwa, you might need to import the workbox scripts.
// This line will be replaced by the next-pwa plugin with the correct workbox scripts.
// Ensure this file is processed by next-pwa by setting it in next.config.js `sw` property.
if (typeof self !== 'undefined') {
    // The "self" object is available in service workers.
    // We can safely import the workbox scripts here.
    try {
        importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');
        
        // This is a placeholder for next-pwa to inject its manifest.
        // It's important to have a `precacheAndRoute` call.
        if (workbox) {
            console.log(`Workbox is loaded`);
            workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
        } else {
            console.log(`Workbox could not be loaded. Hence precaching is not possible.`);
        }

    } catch (error) {
        console.error("Failed to load Workbox scripts:", error);
    }
}
