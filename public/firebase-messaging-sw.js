importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBf_kQkSkomBserNaNZYaF2TkE6qObD36U",
  authDomain: "leoathugal.firebaseapp.com",
  projectId: "leoathugal",
  storageBucket: "leoathugal.appspot.com",
  messagingSenderId: "340503925043",
  appId: "1:340503925043:web:26922db31c6a8b69cdee46",
  measurementId: "G-Q8PYQMFSCD"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.imgur.com/MP1YFNf.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});