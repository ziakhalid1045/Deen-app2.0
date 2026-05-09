import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Search, UserPlus, UserCheck, X, UserMinus, ChevronLeft, MessageSquare, Flame, Star, MessageCircle } from 'lucide-react';
import { UserProfile, FriendRequest } from '../types';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import FollowButton from '../components/FollowButton';

const Friends = () => {
  const { user, profile, blockedUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'find'>('friends');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Fetch mutual friends (from the current 'friends' subcollection)
    const unsubFriends = onSnapshot(collection(db, 'users', user.uid, 'friends'), (snapshot) => {
      const friendsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(friendsData.filter((f: any) => !blockedUsers.includes(f.id)));
      setLoading(false);
    });

    // Fetch followers to identify "Follow Back" opportunities
    const unsubFollowers = onSnapshot(collection(db, 'users', user.uid, 'followers'), async (snapshot) => {
        const fIds = snapshot.docs.map(doc => doc.id);
        
        // Fetch details for these followers
        const details = await Promise.all(fIds.map(async (id) => {
           const d = await getDoc(doc(db, 'users', id));
           return { uid: d.id, ...d.data() };
        }));
        
        setFollowers(details.filter((f: any) => !blockedUsers.includes(f.uid)));
    });

    return () => {
      unsubFriends();
      unsubFollowers();
    };
  }, [user, blockedUsers]);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Simple search by display name or username
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs
      .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
      .filter(u => 
        (u.displayName?.toLowerCase().includes(val.toLowerCase()) || u.username?.toLowerCase().includes(val.toLowerCase())) && 
        u.uid !== user?.uid && 
        !blockedUsers.includes(u.uid)
      );
    setSearchResults(results);
  };

  const startChat = (friendId: string) => {
    const uids = [user?.uid, friendId].sort();
    const chatId = `${uids[0]}_${uids[1]}`;
    navigate(`/chat/${chatId}`);
  };

  const renderUserNode = (u: any, onClick: (e?: any) => void, action: React.ReactNode) => (
    <div 
      key={u.uid || u.id}
      onClick={(e) => onClick(e)}
      className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img 
            src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} 
            className="w-12 h-12 rounded-2xl border border-gray-100 object-cover"
            alt={u.displayName}
          />
          <div className="absolute -top-1 -right-1 bg-white p-1 rounded-lg border border-gray-50 shadow-sm">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-black text-gray-900 group-hover:text-teal-700 transition-colors uppercase tracking-widest">{u.displayName}</h4>
          <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5">@{u.username || 'user'}</p>
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 -mx-4 -mb-4 pb-20">
      {/* Header */}
      <div className="bg-[#115E59] pt-8 pb-12 px-6 rounded-b-[3rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 bg-white/10 rounded-xl backdrop-blur-md">
             <ChevronLeft size={20} />
          </button>
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Deen Connections</h2>
          <div className="w-10"></div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1 flex items-center relative z-10">
           <div className="p-3">
             <Search size={18} className="text-teal-100" />
           </div>
           <input 
             type="text"
             placeholder="Search by name or username..."
             className="bg-transparent border-none outline-none text-white text-sm font-medium w-full placeholder:text-teal-50/50"
             value={searchTerm}
             onChange={(e) => handleSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="px-6 -mt-6 relative z-20 space-y-6">
        {/* Tabs */}
        <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100 flex items-center">
           <button 
             onClick={() => setActiveTab('friends')}
             className={cn(
               "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
               activeTab === 'friends' ? "bg-[#115E59] text-white shadow-md shadow-teal-900/20" : "text-gray-400 hover:text-gray-600"
             )}
           >
              Friends ({friends.length})
           </button>
           <button 
             onClick={() => setActiveTab('find')}
             className={cn(
               "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
               activeTab === 'find' ? "bg-[#115E59] text-white shadow-md shadow-teal-900/20" : "text-gray-400 hover:text-gray-600"
             )}
           >
              Find People
           </button>
        </div>

        {/* Content */}
        {activeTab === 'friends' ? (
           <div className="space-y-4">
              {searchTerm && searchResults.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Search Results</p>
                  {searchResults.map(u => (
                    renderUserNode(u, () => navigate(`/profile/${u.uid}`), <MessageCircle size={18} className="text-teal-600" onClick={(e: any) => { e.stopPropagation(); startChat(u.uid); }} />)
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="space-y-2">
                   {friends.map(friend => (
                     renderUserNode(
                       { uid: friend.id, displayName: friend.displayName }, 
                       () => navigate(`/profile/${friend.id}`),
                       <button onClick={(e) => { e.stopPropagation(); startChat(friend.id); }} className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Chat</button>
                     )
                   ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                   <div className="w-20 h-20 bg-white shadow-sm border border-gray-50 rounded-[2rem] flex items-center justify-center mb-4 text-teal-100">
                      <Star size={40} />
                   </div>
                   <p className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Build Your Circle</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">Follow people to see them here and start private reflections.</p>
                </div>
              )}

              {!searchTerm && followers.length > 0 && (
                <div className="pt-6 space-y-3">
                   <div className="flex items-center space-x-2 px-2">
                     <Flame size={14} className="text-orange-500" />
                     <h3 className="text-[10px] font-black text-teal-900 uppercase tracking-widest">Followers to follow back</h3>
                   </div>
                   {followers.filter(f => !friends.some(friend => friend.id === f.uid)).map(f => (
                     renderUserNode(f, () => navigate(`/profile/${f.uid}`), <FollowButton targetId={f.uid} targetName={f.displayName} variant="icon" />)
                   ))}
                </div>
              )}
           </div>
        ) : (
           <div className="space-y-4">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-[2.5rem] shadow-lg shadow-teal-900/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                 <h3 className="text-white font-black text-sm uppercase tracking-widest mb-2 relative z-10">Expand Your Ummah</h3>
                 <p className="text-teal-50 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-4 relative z-10">Connect with seekers worldwide and share your journey.</p>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="space-y-3 pt-2">
                   {searchResults.map(u => (
                     renderUserNode(u, () => navigate(`/profile/${u.uid}`), <FollowButton targetId={u.uid} targetName={u.displayName} variant="icon" />)
                   ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                   <Search size={40} className="text-gray-200 mb-2" />
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Search for seekers above</p>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
