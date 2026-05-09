import { messaging, db, auth } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const requestNotificationPermission = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BDr9Aly-FWMQR4nYwGdG2VNLOGcP5jaB4XWKFroAvIZiY7rSgrc7sk_8Rqw-GpTPRp994v0IjCSI3iLeLAki_Jw', 
      });
      
      if (token && auth.currentUser) {
        // Store FCM token in a subcollection to avoid user document field restrictions
        const tokenRef = doc(db, 'users', auth.currentUser.uid, 'fcmTokens', token);
        await setDoc(tokenRef, {
          token,
          createdAt: serverTimestamp()
        });
        return token;
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
