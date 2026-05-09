import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ChatList = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => {
         const data = doc.data();
         const otherUserId = data.participants.find((id: string) => id !== user.uid);
         return {
            id: doc.id,
            name: data.participantNames?.[otherUserId] || 'Deen User',
            photoURL: data.participantPhotos?.[otherUserId] || `https://ui-avatars.com/api/?name=User&background=random`,
            lastMessage: data.lastMessage || 'New connection',
            time: data.updatedAt?.toDate() || new Date(),
            unreadCount: data.unreadCounts?.[user.uid] || 0
         };
      });
      setChats(chatData);
      
      // Simple notification trigger for new messages if unreadCount > 0
      const totalUnread = chatData.reduce((sum, chat) => sum + chat.unreadCount, 0);
      if (totalUnread > 0 && 'Notification' in window && Notification.permission === 'granted') {
          // Find the most recent unread chat
          const latestUnread = chatData.find(c => c.unreadCount > 0);
          if (latestUnread) {
              // Avoid spamming; check sessionStorage
              const lastNotified = sessionStorage.getItem(`notified_${latestUnread.id}_${latestUnread.time.getTime()}`);
              if (!lastNotified) {
                 new Notification('New Message on Deen App', {
                    body: `${latestUnread.name}: ${latestUnread.lastMessage}`,
                    icon: '/icon-192.png'
                 });
                 sessionStorage.setItem(`notified_${latestUnread.id}_${latestUnread.time.getTime()}`, 'true');
              }
          }
      }
    });

    return unsubscribe;
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
        <button className="bg-teal-50 p-2 rounded-full text-teal-700 hover:bg-teal-100 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="bg-white/50 border border-gray-100 rounded-2xl p-3 flex items-center space-x-3 mb-6">
        <Search size={18} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search messages..." 
          className="bg-transparent border-none outline-none text-sm w-full font-medium"
        />
      </div>

      <div className="space-y-3">
        {chats.map(chat => (
          <Link 
            key={chat.id} 
            to={`/chat/${chat.id}`}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="relative">
              <img 
                src={`https://ui-avatars.com/api/?name=${chat.name}&background=random`} 
                alt={chat.name} 
                className="w-12 h-12 rounded-full object-cover shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <h3 className="text-sm font-bold text-gray-900 truncate">{chat.name}</h3>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{formatDistanceToNow(chat.time)} ago</span>
              </div>
              <p className="text-xs text-gray-400 font-medium truncate">{chat.lastMessage}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
