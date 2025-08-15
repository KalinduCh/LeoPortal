
// Import the Firebase app and messaging services
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// The service worker can be kept simple. It just needs to be present
// for the browser to register it and for Firebase to use it.
// Background message handling can be added here if needed in the future.
console.log('Firebase Messaging Service Worker initialized.');
