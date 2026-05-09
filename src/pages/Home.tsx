import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Post as PostType } from '../types';
import PostCard from '../components/PostCard';
import { MessageSquare, Image, MoreHorizontal, Plus, Trophy, ArrowRight, Mail, Play, BadgeCheck } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const Home = () => {
  const { user, profile, blockedUsers, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isDeveloper = user?.email === 'ziakhalid1614@gmail.com';
  const isVerified = user?.emailVerified || isDeveloper || profile?.isManuallyVerified;

  const [posts, setPosts] = useState<PostType[]>([]);
  const [shorts, setShorts] = useState<PostType[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFollowingIds([]);
      return;
    }
    const q = collection(db, 'users', user.uid, 'following');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFollowingIds(snapshot.docs.map(doc => doc.id));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as PostType[];
      
      const filteredPosts = postsData.filter(post => {
        const isBlocked = blockedUsers?.includes(post.authorId);
        const isPrivate = post.privacy === 'private' && post.authorId !== user?.uid && !isDeveloper;
        return !isBlocked && !isPrivate;
      });
      
      // Separate shorts
      const shortVideos = filteredPosts.filter(p => p.isShort === true);
      setShorts(shortVideos);

      // Main feed: exclude shorts
      const finalPosts = filteredPosts.filter(p => p.isShort !== true);
      
      const sortedPosts = finalPosts.sort((a, b) => {
        // Boost factor: Verified (1 point)
        const aBoost = (a.authorIsVerified ? 1 : 0);
        const bBoost = (b.authorIsVerified ? 1 : 0);
        
        if (aBoost !== bBoost) {
          return bBoost - aBoost;
        }
        
        // Secondary sort by date
        const aTime = a.createdAt?.toDate?.()?.getTime() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const bTime = b.createdAt?.toDate?.()?.getTime() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return bTime - aTime;
      });
      
      setPosts(sortedPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
      setLoading(false);
    });

    return () => unsub();
  }, [blockedUsers, user, isDeveloper]);

  useEffect(() => {
    // Fetch suggested users (Verified or with most posts)
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), limit(15));
      const snap = await getDocs(q);
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user?.uid && !followingIds.includes(u.id));
      setSuggestedUsers(allUsers.sort(() => 0.5 - Math.random()).slice(0, 10));
    };
    fetchUsers();
  }, [user, followingIds]);

  return (
    <div className="space-y-4 pb-20 pt-2">
      {/* Feed Title */}
      <div className="px-2 mb-2">
        <h2 className="text-xl font-black text-[#115E59] tracking-tight text-center">Seeker Feed</h2>
        <div className="w-12 h-1 bg-teal-100 rounded-full mx-auto mt-1 opacity-50"></div>
      </div>

      {/* Shorts Carousel (Facebook/Reels style) */}
      {!loading && shorts.length > 0 && (
        <div className="space-y-2">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#115E59]">Short Clips</h3>
              <button 
                onClick={() => navigate('/shorts')}
                className="text-[9px] font-black text-teal-600 uppercase tracking-widest flex items-center space-x-1"
              >
                <span>Full Screen</span>
                <ArrowRight size={10} />
              </button>
           </div>
           <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 mx-[-1rem] px-4 cursor-grab">
              {shorts.map((short) => (
                <div 
                  key={short.id} 
                  onClick={() => navigate('/shorts')}
                  className="flex-shrink-0 w-28 h-44 rounded-2xl bg-black relative overflow-hidden shadow-lg shadow-teal-900/5 group"
                >
                   <video src={short.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                   
                   <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                      <div className="w-6 h-6 rounded-lg border border-white/20 overflow-hidden bg-white/10 backdrop-blur-md">
                         <img 
                           src={short.authorPhoto || `https://ui-avatars.com/api/?name=${short.authorName}`} 
                           className="w-full h-full object-cover" 
                           alt="Author"
                         />
                      </div>
                   </div>

                   <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[9px] font-black text-white leading-tight line-clamp-2 shadow-sm uppercase tracking-tighter">
                         {short.authorName}
                      </p>
                   </div>

                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                         <Play size={16} className="text-white fill-white" />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6 px-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 h-64 animate-pulse border border-gray-100/50 shadow-sm"></div>
          ))}
        </div>
      ) : (
        <div className="px-1">
          {posts.map((post) => (
            <React.Fragment key={post.id}>
              <PostCard post={post} />
            </React.Fragment>
          ))}

          {posts.length === 0 && (
            <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center mx-4">
               <div className="text-5xl mb-6 grayscale">✨</div>
               <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                 Your feed is currently quiet.
               </p>
               <p className="text-gray-300 text-xs mt-2 italic px-8">
                 Follow inspiring seekers or share a reminder to light up the community.
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
