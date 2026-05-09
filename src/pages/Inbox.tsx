import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Bell, MessageSquare, ChevronRight, UserPlus, Heart, MessageCircle, AlertCircle, Inbox as InboxIcon, Plus, Search, CheckCheck, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import FollowButton from '../components/FollowButton';

const Inbox = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'messages'>('activity');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Fetch activities (notifications)
    const qActPath = `users/${user.uid}/notifications`;
    const qAct = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubAct = onSnapshot(qAct, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      if (activeTab === 'activity') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, qActPath);
    });

    // Fetch Chats
    const qChatsPath = `chats`;
    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      if (activeTab === 'messages') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, qChatsPath);
    });

    return () => {
      unsubAct();
      unsubChats();
    };
  }, [user, activeTab]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/notifications/${id}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F1F5F9]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#075e54] pt-2 pb-2 px-4 shadow-xl text-white">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center space-x-2">
               <h2 className="text-[14px] font-black uppercase tracking-widest text-[#F0FDFA]">Inbox</h2>
               <div className="w-1 h-1 bg-teal-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
             </div>
             <div className="flex items-center space-x-1">
               <button 
                 onClick={() => navigate('/search')}
                 className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
               >
                  <Search size={16} />
               </button>
               <button 
                 onClick={() => navigate('/friends')}
                 className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
               >
                  <UserPlus size={16} />
               </button>
             </div>
          </div>
          
          <div className="flex bg-black/10 p-0.5 rounded-lg backdrop-blur-sm">
             <button 
              onClick={() => setActiveTab('activity')}
              className={cn(
                "flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                activeTab === 'activity' ? "bg-white text-[#075e54] shadow-sm" : "text-teal-50/70"
              )}
             >
                Activity
             </button>
             <button 
              onClick={() => setActiveTab('messages')}
              className={cn(
                "flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                activeTab === 'messages' ? "bg-white text-[#075e54] shadow-sm" : "text-teal-50/70"
              )}
             >
                Chats
             </button>
          </div>
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' ? (
            <motion.div 
              key="activity"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3"
            >
              {activities.length > 0 ? (
                activities.map(act => (
                    <div 
                    key={act.id}
                    onClick={() => {
                        markAsRead(act.id);
                        if (act.type === 'like' || act.type === 'comment') navigate(`/post/${act.postId}`);
                        if (act.type === 'friend_request' || act.type === 'follow') navigate(`/profile/${act.fromId}`);
                    }}
                    className={cn(
                      "group bg-white p-3 rounded-2xl border border-gray-100 flex items-center space-x-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative",
                      !act.read && "border-teal-500/10 bg-teal-50/10"
                    )}
                  >
                    {!act.read && <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.4)]"></div>}
                    
                    <div className="relative shrink-0">
                      <img 
                        src={act.fromPhoto || `https://ui-avatars.com/api/?name=${act.fromName}&background=random`} 
                        className="w-12 h-12 rounded-xl object-cover border border-gray-50"
                        alt="from"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${act.fromId}`);
                        }}
                      />
                      <div className={cn(
                        "absolute -bottom-1 -right-1 p-1 rounded-lg border border-white shadow-sm",
                        act.type === 'like' ? "bg-red-50 text-red-500" :
                        act.type === 'comment' ? "bg-blue-50 text-blue-500" :
                        "bg-teal-50 text-teal-500"
                      )}>
                        {act.type === 'like' ? <Heart size={10} fill="currentColor" /> : 
                         act.type === 'comment' ? <MessageCircle size={10} /> : 
                         <UserPlus size={10} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 leading-tight">
                        <span className="font-black text-[#075e54]">@{act.fromName}</span> {
                          act.type === 'like' ? 'liked your reflection' : 
                          act.type === 'comment' ? 'replied to you' : 
                          act.type === 'follow' ? 'started following you' : 'sent a seeker request'
                        }
                      </p>
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                        {act.createdAt?.toDate ? formatDistanceToNow(act.createdAt.toDate()) : 'Recently'} ago
                      </p>
                    </div>

                    {act.type === 'follow' && (
                      <div className="shrink-0 w-24">
                        <FollowButton 
                          targetId={act.fromId} 
                          targetName={act.fromName} 
                          variant="default"
                          className="py-2 px-0 rounded-lg text-[9px] h-8 bg-teal-50 text-teal-600 border-none shadow-none font-black"
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyInbox message="No recent seeker activities yet." icon={<Bell size={40} />} />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="messages"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-1 -mx-2"
            >
              {chats.length > 0 ? (
                chats.map(chat => {
                  const otherId = chat.participants.find((id: string) => id !== user?.uid);
                  const otherName = chat.participantNames?.[otherId] || chat.metadata?.[`user_${otherId}`] || 'Deen Seeker';
                  const otherPhoto = chat.participantPhotos?.[otherId] || `https://ui-avatars.com/api/?name=${otherName}&background=random`;
                  const isLastSenderMe = chat.lastSenderId === user?.uid;
                  const hasUnread = chat.unreadCount?.[user?.uid || ''] > 0;

                  return (
                    <div 
                      key={chat.id}
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      className="bg-white px-4 py-3 border-b border-gray-50 flex items-center space-x-4 hover:bg-gray-50/80 transition-all cursor-pointer active:bg-gray-100"
                    >
                      <div className="relative flex-shrink-0">
                        <img 
                          src={otherPhoto} 
                          className="w-14 h-14 rounded-full border border-gray-100 object-cover"
                          alt="avatar"
                        />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-0.5">
                          <h4 className="text-[15px] font-black text-gray-900 truncate pr-2">{otherName}</h4>
                          <span className={cn(
                            "text-[10px] font-bold whitespace-nowrap mt-1",
                            hasUnread ? "text-teal-600" : "text-gray-400"
                          )}>
                            {chat.lastMessageAt?.toDate ? formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false }) : 'Now'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 flex-1 truncate">
                             {isLastSenderMe && <CheckCheck size={14} className="text-teal-500 flex-shrink-0" />}
                             <p className={cn(
                                "text-[13px] truncate",
                                hasUnread ? "text-gray-900 font-black" : "text-gray-500 font-medium"
                             )}>
                                {chat.lastMessage || "Sent an attachment"}
                             </p>
                          </div>
                          {hasUnread && (
                            <div className="ml-2 bg-teal-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-teal-600/20">
                              {chat.unreadCount?.[user?.uid || '']}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyInbox 
                  message="No private messages yet." 
                  subMessage="Start a conversation with your connections" 
                  icon={<MessageSquare size={40} />} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WhatsApp style FAB */}
      {activeTab === 'messages' && (
        <button 
          onClick={() => navigate('/friends')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#115E59] text-white rounded-2xl shadow-xl shadow-teal-900/20 flex items-center justify-center animate-in zoom-in slide-in-from-bottom-4 duration-300 active:scale-90 transition-transform z-30"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};

const EmptyInbox = ({ message, subMessage, icon }: { message: string, subMessage?: string, icon?: React.ReactNode }) => (
  <div className="py-20 flex flex-col items-center justify-center text-center px-6">
     <div className="w-20 h-20 bg-teal-50 text-teal-300 rounded-full flex items-center justify-center mb-4">
        {icon || <InboxIcon size={40} />}
     </div>
     <p className="text-gray-900 text-sm font-black uppercase tracking-widest mb-1">{message}</p>
     <p className="text-gray-400 text-xs font-medium">{subMessage || "Everything is quiet for now."}</p>
  </div>
);

export default Inbox;
