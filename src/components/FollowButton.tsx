import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, writeBatch, increment, serverTimestamp, collection, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FollowButtonProps {
  targetId: string;
  targetName: string;
  className?: string;
  variant?: 'default' | 'icon';
}

const FollowButton: React.FC<FollowButtonProps> = ({ targetId, targetName, className, variant = 'default' }) => {
  const { user: currentUser, profile: myProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.uid === targetId) {
      setLoading(false);
      return;
    }

    const followRef = doc(db, 'users', currentUser.uid, 'following', targetId);
    const unsub = onSnapshot(followRef, (docSnap) => {
      setIsFollowing(docSnap.exists());
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser, targetId]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.uid === targetId || actionLoading) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      const followerRef = doc(db, 'users', targetId, 'followers', currentUser.uid);
      const followingRef = doc(db, 'users', currentUser.uid, 'following', targetId);
      const targetUserRef = doc(db, 'users', targetId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      // Mutuality Check
      const amIFollowedByTarget = await getDoc(doc(db, 'users', currentUser.uid, 'followers', targetId));
      const hasMutualFollow = amIFollowedByTarget.exists();

      const myFriendDoc = doc(db, 'users', currentUser.uid, 'friends', targetId);
      const targetFriendDoc = doc(db, 'users', targetId, 'friends', currentUser.uid);

      if (isFollowing) {
        // Unfollow logic
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
        
        // Remove own friend entry (rules only allow isOwner writes to friends)
        batch.delete(myFriendDoc);

        // Add Unfollow Notification
        const notificationRef = doc(collection(db, 'users', targetId, 'notifications'));
        batch.set(notificationRef, {
          type: 'unfollow',
          fromId: currentUser.uid,
          fromName: myProfile?.displayName || 'A seeker',
          targetId: targetId,
          read: false,
          createdAt: serverTimestamp()
        });
      } else {
        // Follow logic
        batch.set(followerRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
        batch.set(followingRef, { uid: targetId, createdAt: serverTimestamp() });
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });

        // Add own friend entry if mutual (rules only allow isOwner writes to friends)
        if (hasMutualFollow) {
          batch.set(myFriendDoc, { id: targetId, displayName: targetName, createdAt: serverTimestamp() });
        }

        // Add Notification
        const notificationRef = doc(collection(db, 'users', targetId, 'notifications'));
        batch.set(notificationRef, {
          type: 'follow',
          fromId: currentUser.uid,
          fromName: myProfile?.displayName || 'A seeker',
          fromPhoto: myProfile?.photoURL || '',
          targetId: targetId,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser || currentUser.uid === targetId) return null;
  if (loading) return (
    <div className={cn("p-2 animate-pulse bg-gray-100 rounded-xl w-10 h-10 flex items-center justify-center", className)}>
      <Loader2 size={14} className="animate-spin text-gray-300" />
    </div>
  );

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleFollow}
        disabled={actionLoading}
        className={cn(
          "p-2 rounded-xl transition-all active:scale-95",
          isFollowing 
            ? "bg-gray-100 text-gray-500 hover:bg-gray-200" 
            : "bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white shadow-sm shadow-teal-900/5",
          className
        )}
      >
        {actionLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isFollowing ? (
          <UserMinus size={16} />
        ) : (
          <UserPlus size={16} />
        )}
      </button>
    );
  }

  return (
    <button 
      onClick={handleFollow}
      disabled={actionLoading}
      className={cn(
        "px-6 py-4 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 w-full",
        isFollowing 
          ? "bg-white border border-gray-100 text-teal-800" 
          : "bg-[#115E59] text-white shadow-teal-900/20",
        className
      )}
    >
      {actionLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isFollowing ? (
        <UserMinus size={18} />
      ) : (
        <UserPlus size={18} />
      )}
      <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
    </button>
  );
};

export default FollowButton;
