importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// These values are hardcoded here for the service worker
// In a production environment, you might want to inject these
firebase.initializeApp({
  apiKey: "AIzaSyCKx7WL2nm39zgGtx4a2bSMMl8tyvyxMlM",
  authDomain: "studio-3408972143-10cb0.firebaseapp.com",
  projectId: "studio-3408972143-10cb0",
  storageBucket: "studio-3408972143-10cb0.firebasestorage.app",
  messagingSenderId: "29014897670",
  appId: "1:29014897670:web:7d876c15f2ff81ab24bf87"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
