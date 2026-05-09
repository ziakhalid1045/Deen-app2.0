import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { UserProfile } from '../types';
import { requestNotificationPermission } from '../lib/notifications';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  blockedUsers: string[];
  unreadNotifications: number;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  blockedUsers: [], 
  unreadNotifications: 0, 
  loading: true 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeBlocks: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Cleanup previous subscriptions if they exist
      if (unsubscribeBlocks) unsubscribeBlocks();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeNotifications) unsubscribeNotifications();

      if (firebaseUser) {
        const isDeveloper = firebaseUser.email === 'ziakhalid1614@gmail.com';
        
        if (isDeveloper && !firebaseUser.emailVerified) {
          console.info("Developer access: Bypassing email verification requirement.");
        }

        // 1. Fetch/Create Profile first
        const userPath = `users/${firebaseUser.uid}`;
        const userRef = doc(db, 'users', firebaseUser.uid);
        let currentProfile: any = null;

        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              createdAt: new Date(),
              postsCount: 0,
              followersCount: 0,
              followingCount: 0,
              bio: 'Assalamu Alaikum! I am using Deen App.',
              photoURL: firebaseUser.photoURL || ''
            };
            await setDoc(userRef, newProfile);
            currentProfile = newProfile;
          } else {
            currentProfile = userDoc.data();
          }
        } catch (error) {
          console.error("Profile fetch error:", error);
        }

        // 2. Determine verification status
        const isVerified = firebaseUser.emailVerified || currentProfile?.isManuallyVerified;
        
        // 3. Always set profile and continue with subscriptions
        setProfile(currentProfile);

        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, userPath);
        });


        // Subscribe to Notifications count
        const notificationsQuery = query(collection(db, 'users', firebaseUser.uid, 'notifications'), where('read', '==', false));
        const notificationsPath = `users/${firebaseUser.uid}/notifications`;
        unsubscribeNotifications = onSnapshot(notificationsQuery, (snap) => {
          setUnreadNotifications(snap.size);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, notificationsPath);
        });

        // Fetch blocked users
        const blocksPath = `users/${firebaseUser.uid}/blockedUsers`;
        const blocksQuery = collection(db, 'users', firebaseUser.uid, 'blockedUsers');
        unsubscribeBlocks = onSnapshot(blocksQuery, (snapshot) => {
          setBlockedUsers(snapshot.docs.map(doc => doc.id));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, blocksPath);
        });

        // Request notification permission if not already handled
        if ('Notification' in window && Notification.permission === 'granted') {
          requestNotificationPermission();
        }

      } else {
        setProfile(null);
        setBlockedUsers([]);
        setUnreadNotifications(0);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeBlocks) unsubscribeBlocks();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, blockedUsers, unreadNotifications, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
