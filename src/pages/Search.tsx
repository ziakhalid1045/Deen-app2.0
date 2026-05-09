import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Search as SearchIcon, UserPlus, Flame, BadgeCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Post, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import PostCard from '../components/PostCard';
import FollowButton from '../components/FollowButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

const Search = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = (location.state as any)?.activeTab || 'posts';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'categories'>(initialTab);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { blockedUsers, user } = useAuth();

  const categories = [
    { name: 'Salah', icon: '🕌', color: 'bg-blue-50 text-blue-600' },
    { name: 'Quran', icon: '📖', color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Sunnah', icon: '🌿', color: 'bg-green-50 text-green-600' },
    { name: 'Adab', icon: '🤝', color: 'bg-amber-50 text-amber-600' },
    { name: 'Fiqh', icon: '⚖️', color: 'bg-purple-50 text-purple-600' },
    { name: 'History', icon: '🏺', color: 'bg-orange-50 text-orange-600' },
  ];

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setLoading(true);
      try {
        if (activeTab === 'posts') {
          const q = query(
            collection(db, 'posts'),
            orderBy('likesCount', 'desc'),
            limit(20)
          );
          const snap = await getDocs(q);
          const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .filter(p => {
              const isPrivate = p.privacy === 'private' && p.authorId !== user?.uid;
              const isBlocked = blockedUsers.includes(p.authorId);
              const isAdmin = user?.email === 'ziakhalid1614@gmail.com';
              return (!isPrivate || isAdmin) && !isBlocked;
            });
          setPostResults(posts);
        } else if (activeTab === 'users') {
          const q = query(
            collection(db, 'users'),
            orderBy('followersCount', 'desc'),
            limit(20)
          );
          const snap = await getDocs(q);
          setUserResults(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'posts') {
        const q = query(
          collection(db, 'posts'),
          orderBy('content'),
          where('content', '>=', val),
          where('content', '<=', val + '\uf8ff'),
          limit(20)
        );
        const snap = await getDocs(q);
        const posts = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Post))
          .filter(p => {
            const isPrivate = p.privacy === 'private' && p.authorId !== user?.uid;
            const isBlocked = blockedUsers.includes(p.authorId);
            const isAdmin = user?.email === 'ziakhalid1614@gmail.com';
            return (!isPrivate || isAdmin) && !isBlocked;
          });
        setPostResults(posts);
      } else if (activeTab === 'users') {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const searchLower = val.toLowerCase();
        const users = snap.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(u => {
            const username = u.username || '';
            const matchesSearch = username.toLowerCase().includes(searchLower);
            return matchesSearch && !blockedUsers.includes(u.uid);
          })
          .slice(0, 20); // Limit to 20 results
        setUserResults(users);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, activeTab);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(searchTerm);
  }, [activeTab]);

  return (
    <div className="space-y-4 pb-12">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md pt-2 pb-3">
        <div className="relative group px-1">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <SearchIcon className="text-teal-600 transition-colors group-focus-within:text-teal-900" size={16} />
          </div>
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold shadow-sm focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1.5 mt-3 px-1">
          {['posts', 'users', 'categories'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-[#115E59] text-white shadow-lg shadow-teal-900/10" 
                  : "bg-white text-gray-400 hover:bg-gray-100/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
           <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
           <p className="text-teal-900 font-bold text-[10px] uppercase tracking-widest">{searchTerm ? 'Searching the Deen...' : 'Fetching Trending...'}</p>
        </div>
      ) : (
        <div className="space-y-3 px-1">
          {activeTab === 'posts' && (
            <>
              {postResults.length > 0 ? (
                <div className="space-y-4">
                  {!searchTerm && (
                    <div className="flex items-center space-x-2 px-1 mb-2">
                       <Flame size={14} className="text-orange-500" />
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-900">Trending Reflections</h3>
                    </div>
                  )}
                  {postResults.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              ) : (
                <NoResults message="No reflections found matching your profile." />
              )}
              {!searchTerm && postResults.length > 0 && (
                <div className="pt-6">
                   <TrendingCategories categories={categories} />
                </div>
              )}
            </>
          )}

          {activeTab === 'users' && (
            userResults.length > 0 ? (
              <div className="space-y-3">
                {!searchTerm && (
                  <div className="flex items-center space-x-2 px-1 mb-2">
                     <Flame size={14} className="text-orange-500" />
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-900">Top Seekers</h3>
                  </div>
                )}
                {userResults.map(u => (
                  <div 
                    key={u.uid} 
                    onClick={() => navigate(`/profile/${u.uid}`)}
                    className="bg-white p-3 rounded-2xl border border-gray-50 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} 
                          alt={u.displayName} 
                          className="w-10 h-10 rounded-xl border border-gray-100 shadow-sm object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <h4 className="text-xs font-black text-gray-900 group-hover:text-teal-700 transition-colors">{u.displayName}</h4>
                          {u.isVerified && <BadgeCheck size={12} className="text-white fill-blue-500 drop-shadow-sm" />}
                        </div>
                        <div className="flex items-center space-x-2">
                           <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">@{u.username || 'user'}</p>
                           {!searchTerm && (
                             <span className="text-[7px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full font-black uppercase">
                               {u.followersCount || 0} Followers
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FollowButton 
                        targetId={u.uid} 
                        targetName={u.displayName} 
                        variant="icon"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <NoResults message="No seekers found." />
            )
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-2 gap-3">
               {categories.map(cat => (
                 <div 
                   key={cat.name}
                   className="group relative bg-white p-5 rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                 >
                   <div className={cn("absolute top-0 right-0 p-4 rounded-bl-full opacity-10 group-hover:scale-150 transition-transform duration-500", cat.color)}></div>
                   <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                      <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{cat.icon}</span>
                      <h4 className="font-black text-[9px] uppercase tracking-[0.2em] text-teal-900">{cat.name}</h4>
                       <button
                         onClick={() => {
                           setSearchTerm('#' + cat.name);
                           setActiveTab('posts');
                           handleSearch('#' + cat.name);
                         }}
                         className="mt-2 w-full bg-teal-900/5 text-teal-900 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-teal-900 hover:text-white transition-all"
                       >
                         View All
                       </button>
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NoResults = ({ message }: { message: string }) => (
  <div className="text-center py-20 bg-white/50 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center px-6">
    <SearchIcon size={32} className="text-gray-200 mb-3" />
    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{message}</p>
  </div>
);

const SuggestedPeople = ({ navigate }: { navigate: any }) => (
   <div className="space-y-3">
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-900 px-1">Discover Seekers</h3>
      <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide px-1">
         {[1,2,3,4,5].map(i => (
            <div 
              key={i} 
              onClick={() => navigate(`/profile/${i}`)}
              className="min-w-[110px] bg-white p-4 rounded-[1.5rem] flex flex-col items-center space-y-2.5 shadow-sm border border-gray-50 active:scale-95 transition-all cursor-pointer"
            >
               <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-12 h-12 rounded-2xl border-[3px] border-teal-50" />
               <div className="text-center">
                  <span className="block text-[9px] font-black uppercase tracking-tighter text-gray-900">Seeker_{i}</span>
                  <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Active Now</span>
               </div>
               <button className="bg-teal-700 text-white text-[8px] font-black uppercase tracking-widest py-1.5 w-full rounded-lg shadow-lg shadow-teal-900/10 hover:bg-teal-800">Follow</button>
            </div>
         ))}
      </div>
   </div>
);

const TrendingCategories = ({ categories }: { categories: any[] }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between px-1">
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-900">Explore Categories</h3>
      <ChevronRight size={14} className="text-teal-400" />
    </div>
    <div className="grid grid-cols-2 gap-2">
       {categories.map(c => (
         <button 
           key={c.name} 
           className="bg-white px-3 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-teal-800 border border-teal-50 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-between group"
         >
           <span className="flex items-center space-x-2">
             <span className="grayscale group-hover:grayscale-0">{c.icon}</span>
             <span>#{c.name}</span>
           </span>
           <ChevronRight size={10} className="text-teal-200 group-hover:text-teal-600 transition-colors" />
         </button>
       ))}
    </div>
  </div>
);

export default Search;
