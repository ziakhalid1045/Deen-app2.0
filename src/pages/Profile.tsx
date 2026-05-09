import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, getDoc, setDoc, serverTimestamp, deleteDoc, writeBatch, increment, addDoc, updateDoc } from 'firebase/firestore';
import { Post as PostType, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import PostCard from '../components/PostCard';
import FollowButton from '../components/FollowButton';
import { Edit2, LogOut, ChevronLeft, ShieldAlert, UserPlus, Calendar, UserMinus, Hash, MessageCircle, Bookmark, MoreVertical, Globe, Flag, Check, BadgeCheck, ShieldCheck, Download, Info, Lock, Mail, Menu, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { signOut } from 'firebase/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { motion } from 'motion/react';

const Profile = () => {
  const { userId } = useParams();
  const { profile: myProfile, user: currentUser, loading: authLoading } = useAuth();
  
  const isDeveloper = currentUser?.email === 'ziakhalid1614@gmail.com';
  const isVerified = currentUser?.emailVerified || isDeveloper || myProfile?.isManuallyVerified;

  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState<{type: 'followers' | 'following', uid: string} | null>(null);
  const [networkUsers, setNetworkUsers] = useState<any[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const navigate = useNavigate();

  const isMe = !userId || userId === currentUser?.uid;

  useEffect(() => {
    if (!showNetworkModal) return;
    setNetworkLoading(true);
    // Fetch users for network modal
    const fetchNetwork = async () => {
      try {
        const typeColl = showNetworkModal.type === 'followers' ? 'followers' : 'following';
        const q = collection(db, 'users', showNetworkModal.uid, typeColl);
        const snap = await getDocs(q);
        const uids = snap.docs.map(d => d.id);
        
        if (uids.length === 0) {
          setNetworkUsers([]);
          setNetworkLoading(false);
          return;
        }

        // Fetch user profiles (batching to avoid limits)
        const profiles = [];
        for (let i = 0; i < uids.length; i += 10) {
          const batchUids = uids.slice(i, i + 10);
          const usersQ = query(collection(db, 'users'), where('uid', 'in', batchUids));
          const usersSnap = await getDocs(usersQ);
          usersSnap.docs.forEach(d => profiles.push({ id: d.id, ...d.data() }));
        }
        setNetworkUsers(profiles);
      } catch (err) {
        console.error(err);
      } finally {
        setNetworkLoading(false);
      }
    };
    fetchNetwork();
  }, [showNetworkModal]);

  const handleTogglePrivacy = async () => {
    if (!currentUser || !viewedProfile) return;
    setPrivacyLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isPrivate: !viewedProfile.isPrivate
      });
      // state will be automatically updated by onSnapshot
      alert(`Account is now ${!viewedProfile.isPrivate ? 'Private' : 'Public'}`);
      setShowPrivacyModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to update privacy");
    } finally {
      setPrivacyLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchProfile = async () => {
      setLoading(true);
      const targetId = userId || currentUser?.uid;
      
      if (!targetId) {
        setLoading(false);
        return;
      }

      const path = `users/${targetId}`;
      try {
        unsubscribe = onSnapshot(doc(db, 'users', targetId), (snap) => {
          if (snap.exists()) {
            setViewedProfile(snap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, path);
          setLoading(false);
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      }
    };

    fetchProfile();
    return () => unsubscribe?.();
  }, [userId, currentUser]);

  useEffect(() => {
    const uid = viewedProfile?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'posts'), 
      where('authorId', '==', uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostType[];
      
      // Filter out private posts if not the author and not admin
      fetchedPosts = fetchedPosts.filter(post => {
        const isPrivate = post.privacy === 'private';
        const isAuthor = post.authorId === currentUser?.uid;
        const isAdmin = currentUser?.email === 'ziakhalid1614@gmail.com';
        return !isPrivate || isAuthor || isAdmin;
      });

      // Sort locally to avoid needing a Firestore composite index
      fetchedPosts.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.getTime?.() || 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.getTime?.() || 0);
        return bTime - aTime;
      });
      setPosts(fetchedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });
    return unsubscribe;
  }, [viewedProfile]);

  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'saved' && isMe && currentUser) {
      const q = query(collection(db, 'users', currentUser.uid, 'savedPosts'), orderBy('savedAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const ids = snap.docs.map(d => (d.data() as any).postId);
        setSavedIds(ids);
      }, (error) => {
        console.error("Error fetching saved IDs:", error);
      });
      return unsub;
    }
  }, [activeTab, isMe, currentUser]);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (savedIds.length === 0) {
        setSavedPosts([]);
        return;
      }
      
      try {
        const fullPosts: PostType[] = [];
        // Fetch posts one by one or in chunks if needed
        // For now, simple loop is fine as it's outside the listener
        for (const pid of savedIds) {
          const pDoc = await getDoc(doc(db, 'posts', pid));
          if (pDoc.exists()) {
            fullPosts.push({ id: pDoc.id, ...pDoc.data() } as PostType);
          }
        }
        setSavedPosts(fullPosts);
      } catch (err) {
        console.error("Error fetching saved details:", err);
      }
    };

    if (activeTab === 'saved' && savedIds.length > 0) {
      fetchSavedPosts();
    }
  }, [savedIds, activeTab]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleBlock = async () => {
    if (!currentUser || !viewedProfile || isMe) return;
    if (window.confirm(`Block ${viewedProfile.displayName}?`)) {
      const path = `users/${currentUser.uid}/blockedUsers/${viewedProfile.uid}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'blockedUsers', viewedProfile.uid), {
          uid: viewedProfile.uid,
          displayName: viewedProfile.displayName,
          createdAt: serverTimestamp()
        });
        alert("Blocked");
        navigate('/');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const handleReportSubmit = async () => {
    if (!currentUser || !reportText.trim()) return;
    setReportLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email,
        targetId: viewedProfile?.uid || 'general',
        details: reportText,
        type: isMe ? 'General App Issue' : 'User Report',
        createdAt: serverTimestamp()
      });
      alert('Report submitted successfully to the Admin team.');
      setShowReportModal(false);
      setReportText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-teal-800 uppercase tracking-widest text-xs">Seeking Profile...</p>
    </div>
  );

  if (!viewedProfile) return <div className="py-20 text-center text-gray-500 font-bold">Seeker not found in the community.</div>;

  const defaultCover = "https://images.unsplash.com/photo-1519810755548-39cd217da494?auto=format&fit=crop&q=80&w=1500";

  return (
    <div className="space-y-6 -mx-4 -mt-4 pb-20">
      {/* Profile Header / Cover Section */}
      <div className="relative h-64 w-full overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          src={viewedProfile.coverURL || defaultCover} 
          alt="Cover" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white"></div>
        
        {!isMe && (
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-4 left-4 p-2.5 bg-black/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 text-white active:scale-90 transition-all hover:bg-black/40 z-20"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {isMe && (
          <div className="absolute top-4 right-4 z-20">
             <button 
               onClick={() => navigate('/settings')}
               className="p-2.5 bg-black/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 text-white active:scale-95 transition-all hover:bg-black/40"
             >
               <Menu size={20} />
             </button>
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div className="px-5 -mt-24 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-teal-900/10 border border-gray-50 p-6 flex flex-col items-center">
          <div className="relative -mt-20 mb-4 h-28 w-28">
            <motion.img 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              src={viewedProfile.photoURL || `https://ui-avatars.com/api/?name=${viewedProfile.displayName}&background=random`} 
              alt={viewedProfile.displayName} 
              className="w-full h-full rounded-[2.5rem] border-8 border-white shadow-2xl object-cover bg-white"
            />
            {viewedProfile.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#115E59] p-1.5 rounded-xl border-4 border-white shadow-lg text-white">
                <BadgeCheck size={16} />
              </div>
            )}
          </div>

          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">@{viewedProfile.displayName}</h1>
            {viewedProfile.bio && (
              <p className="text-xs font-medium text-gray-400 px-4 leading-relaxed max-w-xs">{viewedProfile.bio}</p>
            )}
            <div className="flex items-center justify-center space-x-2 pt-1">
              <span className="flex items-center text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Globe size={10} className="mr-1" />
                {viewedProfile.country || 'Seeker'}
              </span>
              {viewedProfile.isPremium && (
                <span className="flex items-center text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-100">
                  <ShieldCheck size={10} className="mr-1" />
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100/50">
               <p className="text-lg font-black text-teal-900 leading-none">{posts.length}</p>
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Posts</p>
            </div>
            <div 
              onClick={() => setShowNetworkModal({type: 'followers', uid: viewedProfile.uid})} 
              className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100/50 cursor-pointer active:scale-95 transition-all"
            >
               <p className="text-lg font-black text-teal-900 leading-none">{viewedProfile.followersCount || 0}</p>
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Followers</p>
            </div>
            <div 
              onClick={() => setShowNetworkModal({type: 'following', uid: viewedProfile.uid})} 
              className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100/50 cursor-pointer active:scale-95 transition-all"
            >
               <p className="text-lg font-black text-teal-900 leading-none">{viewedProfile.followingCount || 0}</p>
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Following</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {isMe ? (
              <button 
                onClick={() => navigate('/profile/edit')}
                className="w-full bg-[#115E59] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-900/10 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Edit2 size={14} />
                <span>Manage Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <div className="flex-1">
                  <FollowButton 
                    targetId={viewedProfile.uid} 
                    targetName={viewedProfile.displayName} 
                    className="py-4 rounded-2xl text-[10px] font-black shadow-lg shadow-teal-900/5"
                  />
                </div>
                <button 
                  onClick={() => {
                    const targetId = userId || viewedProfile.uid;
                    const uids = [currentUser?.uid, targetId].sort();
                    const chatId = `${uids[0]}_${uids[1]}`;
                    navigate(`/chat/${chatId}`);
                  }}
                  className="flex-1 bg-white border border-gray-100 text-teal-800 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <MessageCircle size={14} />
                  <span>Chat</span>
                </button>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="w-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors border border-red-100/50"
                >
                  <ShieldAlert size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs Section */}
        <div className="mt-8">
           <div className="flex space-x-4 border-b border-gray-100 px-4 mb-6 pt-2">
              {[
                { id: 'posts', label: 'Feed', icon: <MessageCircle size={16} /> },
                { id: 'shorts', label: 'Shorts', icon: <Play size={16} /> },
                { id: 'saved', label: 'Saved', icon: <Bookmark size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "text-teal-900" : "text-gray-400"
                  )}
                >
                  <div className="flex items-center space-x-1.5">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-[#115E59] rounded-full"
                    />
                  )}
                </button>
              ))}
           </div>
           
           <div className="space-y-4">
              {activeTab === 'posts' && (
                posts.filter(p => !p.isShort).length > 0 ? (
                  posts.filter(p => !p.isShort).map(post => <PostCard key={post.id} post={post} />)
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">No reflections yet</p>
                  </div>
                )
              )}
              {activeTab === 'shorts' && (
                <div className="grid grid-cols-3 gap-2">
                   {posts.filter(p => p.isShort).length > 0 ? (
                     posts.filter(p => p.isShort).map(post => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={post.id} 
                          className="aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden relative cursor-pointer group shadow-lg"
                          onClick={() => navigate('/shorts', { state: { initialPostId: post.id } })}
                        >
                           <video 
                             src={post.videoUrl} 
                             className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                           <div className="absolute bottom-3 left-3 flex items-center space-x-1 text-white text-[10px] font-black">
                              <Play size={10} fill="white" />
                              <span>{post.viewsCount || 0}</span>
                           </div>
                        </motion.div>
                      ))
                   ) : (
                     <div className="col-span-3 text-center py-20 bg-gray-50 rounded-3xl">
                        <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Empty Studio</p>
                     </div>
                   )}
                </div>
              )}
              {activeTab === 'saved' && (
                <div className="space-y-4">
                   {savedPosts.length > 0 ? (
                      savedPosts.map(post => <PostCard key={post.id} post={post} />)
                   ) : (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100 px-8">
                         <Bookmark size={40} className="mx-auto text-gray-200 mb-4" />
                         <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Nothing saved</p>
                      </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>

      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
              <h2 className="text-lg font-black text-gray-800 mb-3 text-center">Select Language</h2>
              <div className="space-y-2">
                 {[
                   { id: 'en', label: 'English (US)', dir: 'ltr' },
                   { id: 'ur', label: 'Urdu (اردو)', dir: 'rtl' },
                   { id: 'ar', label: 'Arabic (العربية)', dir: 'rtl' }
                 ].map(lang => {
                    const currentLang = localStorage.getItem('language') || 'en';
                    const isActive = currentLang === lang.id;
                    return (
                       <button 
                         key={lang.id}
                         onClick={() => { 
                            localStorage.setItem('language', lang.id);
                            document.documentElement.dir = lang.dir;
                            setShowLangModal(false); 
                         }} 
                         className={cn(
                           "w-full flex justify-between items-center p-3 rounded-xl transition-colors",
                           isActive ? "bg-teal-50 border border-teal-200" : "hover:bg-gray-50 border border-transparent"
                         )}
                       >
                          <span className={cn("text-xs font-bold", isActive ? "text-teal-800" : "text-gray-700")}>{lang.label}</span>
                          {isActive && <Check size={14} className="text-teal-600" />}
                       </button>
                    )
                 })}
              </div>
              <button 
                onClick={() => setShowLangModal(false)}
                className="mt-4 w-full py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all border border-gray-100 rounded-xl"
              >
                 Close
              </button>
           </div>
        </div>
      )}

      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                 <Globe size={28} />
              </div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-2">Deen App</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-6">
                 Version 1.0.0<br/><br/>
                 A peaceful digital community designed to connect seekers of knowledge. Share reflections, follow inspiring voices, and stay updated.
              </p>
              
              <button 
                onClick={() => setShowAboutModal(false)}
                className="w-full bg-[#115E59] text-white py-3 rounded-xl text-[10px] items-center justify-center font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                 Back to Profile
              </button>
           </div>
        </div>
      )}

      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
              <h2 className="text-lg font-black text-gray-800 mb-2">Privacy Settings</h2>
              <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">
                 When your account is private, only people you approve can see your posts and followers.
              </p>
              
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <Lock size={18} className="text-gray-600" />
                  <span className="text-sm font-bold text-gray-800">Private Account</span>
                </div>
                <button 
                  onClick={handleTogglePrivacy}
                  disabled={privacyLoading}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-300 pointer-events-auto shadow-inner",
                    viewedProfile?.isPrivate ? "bg-teal-500" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow",
                    viewedProfile?.isPrivate ? "translate-x-7" : "translate-x-1"
                  )}></div>
                </button>
              </div>

              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-3 text-[10px] font-bold text-gray-400 border border-gray-100 uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
              >
                 Done
              </button>
           </div>
        </div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                 <Download size={28} />
              </div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-2">App Install Guide</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-6">
                 We currently do not offer an APK download. Instead, our app is a Progressive Web App (PWA). <br /><br />
                 <b className="text-gray-700">Android/Chrome:</b> Tap <MoreVertical className="inline" size={12}/> in your browser Menu, then select <b>"Install App"</b> or <b>"Add to Home screen"</b>.<br/><br/>
                 <b className="text-gray-700">iOS/Safari:</b> Tap the Share button at the bottom, then select <b>"Add to Home Screen"</b>.
              </p>
              
              <button 
                onClick={() => setShowInstallModal(false)}
                className="w-full bg-green-600 text-white py-3 rounded-xl text-[10px] items-center justify-center font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                 Got it!
              </button>
           </div>
        </div>
      )}

      {showNetworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-black text-gray-800 capitalize">{showNetworkModal.type}</h2>
                 <button onClick={() => setShowNetworkModal(null)} className="p-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                    <ChevronLeft size={16} />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                 {networkLoading ? (
                    <div className="flex justify-center p-6"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
                 ) : networkUsers.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">No users found.</p>
                 ) : (
                    networkUsers.map(u => (
                      <div key={u.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer" onClick={() => { setShowNetworkModal(null); navigate(`/profile/${u.uid}`); }}>
                         <div className="flex items-center space-x-3">
                            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} alt="user" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100" />
                            <div>
                               <h4 className="text-sm font-bold text-gray-900 flex items-center">
                                 {u.displayName}
                                 {u.isVerified && <BadgeCheck size={12} className="text-white fill-blue-500 ml-1" />}
                               </h4>
                               <p className="text-[10px] text-gray-500">@{u.displayName.toLowerCase().replace(/\s/g, '')}</p>
                            </div>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
              <h2 className="text-lg font-black text-gray-800 mb-1">{isMe ? 'Report an Issue' : `Report @${viewedProfile.displayName}`}</h2>
              <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">
                 {isMe ? 'Encountered a bug or an issue? Please let the admin team know.' : 'If this user violates our peaceful community guidelines, let us know.'}
              </p>
              
              <textarea 
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Please describe the issue..."
                className="w-full h-24 bg-gray-50 border-none rounded-xl p-3 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-teal-100 placeholder-gray-400 resize-none transition-all"
              ></textarea>
              
              <div className="mt-4 flex space-x-2">
                 <button 
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                  onClick={handleReportSubmit}
                  disabled={reportLoading || !reportText.trim()}
                  className="flex-1 py-3 text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 border border-transparent uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
                 >
                   {reportLoading ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div> : 'Submit Report'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
