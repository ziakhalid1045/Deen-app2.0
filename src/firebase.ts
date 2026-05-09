import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromCache, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with long polling to fix "Internal Assertion Failed" in this environment
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth();
export const storage = getStorage(app);

let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.log('Messaging not supported in this environment');
}

export { messaging };

// Enable offline persistence safely
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
}

// CRITICAL CONSTRAINT: Test connection initially
async function testConnection() {
  try {
    // Only test if online
    if (navigator.onLine) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error: any) {
    if (error.code !== 'permission-denied') {
      console.warn("Initial connection test result:", error.message);
    }
  }
}
testConnection();
