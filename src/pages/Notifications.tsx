import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Notification } from '../types';
import { Heart, MessageSquare, UserPlus, UserMinus, BellOff, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import FollowButton from '../components/FollowButton';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/notifications`;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[]);
      setLoading(false);
    }, (error) => {
      console.error("Notifications fetch error:", error);
      // Fail silently if it's a permission error during logout
      if (!error.message.includes('permissions')) {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={18} className="text-pink-500" fill="currentColor" />;
      case 'comment': return <MessageSquare size={18} className="text-teal-500" />;
      case 'friend_request':
      case 'follow': return <UserPlus size={18} className="text-blue-500" />;
      case 'unfollow': return <UserMinus size={18} className="text-gray-400" />;
      case 'system': return <div className="p-1 bg-teal-100 rounded-lg"><Bell size={18} className="text-teal-700" /></div>;
      default: return <BellOff size={18} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 px-2 pt-2">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Activity</h2>
        {notifications.filter(n => !n.read).length > 0 && (
          <div className="bg-teal-50 text-teal-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shrink-0 ml-4">
            {notifications.filter(n => !n.read).length} New
          </div>
        )}
      </div>

      <div className="space-y-2.5 pb-24">
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
             <div className="w-8 h-8 border-2 border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
             <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Checking alerts</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => {
                if (!notif.read) markAsRead(notif.id);
                if (notif.postId) navigate(`/post/${notif.postId}`);
                else navigate(`/profile/${notif.fromId}`);
              }}
              className={cn(
                "p-3 rounded-2xl flex items-center space-x-3.5 transition-all border cursor-pointer active:scale-[0.99]",
                notif.read ? "bg-white/50 border-gray-50 opacity-60" : "bg-white border-teal-50 shadow-sm"
              )}
            >
               <div className="relative shrink-0">
                <img 
                  src={notif.fromPhoto || `https://ui-avatars.com/api/?name=${notif.fromName}&background=random`} 
                  className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                  alt="from"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${notif.fromId}`);
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-lg shadow-sm border border-gray-50">
                  {getIcon(notif.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-gray-700 leading-snug">
                  {notif.type === 'system' ? (
                     <span className="font-bold text-gray-800">{notif.content}</span>
                  ) : (
                    <>
                      <span className="font-black text-gray-900">@{notif.fromName}</span>{' '}
                      <span className="font-medium text-gray-500">
                        {notif.type === 'like' && 'liked your reflection'}
                        {notif.type === 'comment' && 'commented on your post'}
                        {notif.type === 'friend_request' && 'sent you a seeker request'}
                        {notif.type === 'follow' && 'started following your journey'}
                        {notif.type === 'unfollow' && 'stopped following you'}
                      </span>
                    </>
                  )}
                </p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                    {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate()) + ' ago' : 'Just now'}
                  </p>
                  {!notif.read && <div className="w-1 h-1 bg-teal-600 rounded-full"></div>}
                </div>
              </div>
              
              {notif.type === 'follow' && (
                <div className="shrink-0 w-24">
                  <FollowButton 
                    targetId={notif.fromId} 
                    targetName={notif.fromName} 
                    variant="default"
                    className="py-1.5 px-0 rounded-lg text-[9px] h-8 bg-teal-50 text-teal-600 border-none shadow-none font-black"
                  />
                </div>
              )}

              {!notif.read && <div className="w-1.5 h-1.5 bg-teal-600 rounded-full ml-1 shrink-0 shadow-[0_0_8px_rgba(20,184,166,0.3)]"></div>}
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white/40 border border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center">
            <div className="p-4 bg-gray-50 rounded-full mb-3">
              <BellOff size={24} className="text-gray-200" />
            </div>
            <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">All caught up</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
