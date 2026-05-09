import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment, deleteDoc, setDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Music2, MoreVertical, Play, Pause, Loader2, ChevronLeft, UserPlus, BadgeCheck, Globe, Send, X, Trash2, Lock, AlertTriangle, Bookmark, Volume2, VolumeX } from 'lucide-react';
import { Post, Comment } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const Shorts = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialPostId = location.state?.initialPostId;

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('isShort', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const videoPosts = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Post))
        .filter(post => {
          const isPrivate = post.privacy === 'private' && post.authorId !== user?.uid;
          const isAdmin = user?.email === 'ziakhalid1614@gmail.com';
          return !isPrivate || isAdmin;
        });
      
      // If we have an initialPostId, find its index and move it to the front or just use it
      if (initialPostId) {
        const index = videoPosts.findIndex(p => p.id === initialPostId);
        if (index > -1) {
          const post = videoPosts.splice(index, 1)[0];
          videoPosts.unshift(post);
        }
      }

      setPosts(videoPosts);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in Shorts:", error);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="mt-4 text-xs font-black text-teal-500 uppercase tracking-widest animate-pulse">Loading Shorts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8 text-center">
        <Play size={48} className="text-teal-500 mb-4 opacity-50" />
        <h2 className="text-xl font-black mb-2">No Shorts Yet</h2>
        <p className="text-gray-400 text-sm">Be the first to upload a short video and inspire the community!</p>
        <button 
           onClick={() => navigate('/upload')}
           className="mt-6 bg-[#115E59] text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-teal-900/40 active:scale-95 transition-all"
        >
           Create Now
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
    >
      {posts.map((post: Post) => (
        <ShortVideoItem key={post.id} post={post} user={user} profile={profile} />
      ))}
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 bg-black/20 backdrop-blur-md p-2.5 rounded-2xl text-white border border-white/10 hover:bg-black/40 transition-all active:scale-90"
      >
        <ChevronLeft size={24} />
      </button>
    </div>
  );
};

const ShortVideoItem: React.FC<{ post: Post, user: any, profile: any }> = ({ post, user, profile }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setConfirmDelete(false);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      alert("Delete failed. Please try again.");
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        privacy: post.privacy === 'private' ? 'public' : 'private'
      });
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
    const unsub = onSnapshot(likeRef, (doc) => {
      setIsLiked(doc.exists());
    });
    return unsub;
  }, [post.id, user]);

  useEffect(() => {
    if (!user) return;
    const saveRef = doc(db, 'users', user.uid, 'savedPosts', post.id);
    const unsub = onSnapshot(saveRef, (doc) => {
      setIsSaved(doc.exists());
    });
    return unsub;
  }, [post.id, user]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const playPromise = videoRef.current?.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                if (error.name !== 'AbortError') {
                  console.error("Playback failed:", error);
                }
              });
            }
            if (isMounted) setPlaying(true);
            // Auto view count
            const viewedKey = `viewed_short_${post.id}`;
            if (!sessionStorage.getItem(viewedKey)) {
                sessionStorage.setItem(viewedKey, 'true');
                updateDoc(doc(db, 'posts', post.id), { viewsCount: increment(1) }).catch(console.error);
            }
          } else {
            videoRef.current?.pause();
            if (isMounted) setPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [post.id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name !== 'AbortError') {
              console.error("Playback failed:", error);
            }
          });
        }
        setPlaying(true);
      }
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      const postRef = doc(db, 'posts', post.id);
      
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        
        if (post.authorId !== user.uid) {
           const notificationRef = doc(collection(db, 'users', post.authorId, 'notifications'));
           await setDoc(notificationRef, {
             type: 'like',
             fromId: user.uid,
             fromName: profile?.displayName || 'A seeker',
             fromPhoto: profile?.photoURL || '',
             targetId: post.authorId,
             postId: post.id,
             read: false,
             createdAt: serverTimestamp()
           });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const saveRef = doc(db, 'users', user.uid, 'savedPosts', post.id);
      if (isSaved) {
         await deleteDoc(saveRef);
      } else {
         await setDoc(saveRef, {
            postId: post.id,
            savedAt: serverTimestamp(),
            content: post.content.substring(0, 50),
            authorName: post.authorName,
            mediaUrl: post.videoUrl
         });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = window.location.origin + '/post/' + post.id;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this Short on Deen Seeker',
        text: post.content,
        url: shareUrl
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="relative w-full h-full snap-start bg-black flex items-center justify-center overflow-hidden">
      <video 
        ref={videoRef}
        src={post.videoUrl} 
        className="w-full h-full object-contain"
        loop
        playsInline
        webkit-playsinline="true"
        crossOrigin="anonymous"
        autoPlay={false}
        muted={false}
        preload="metadata"
        onClick={togglePlay}
      />
      
      {/* Mute/Unmute Button */}
      {/* Button removed as per request */}
      
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-sm p-6 rounded-full">
            <Play className="text-white fill-white opacity-60" size={48} />
          </div>
        </div>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/40 to-transparent pointer-events-none"></div>

      {/* Right Action Bar */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6 z-20">
         <div className="relative mb-2">
            <img 
               src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`}
               className="w-12 h-12 rounded-2xl border-2 border-white shadow-xl object-cover cursor-pointer hover:scale-105 transition-transform"
               alt={post.authorName}
               onClick={() => navigate(`/profile/${post.authorId}`)}
            />
            {post.authorId !== user?.uid && (
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white rounded-full p-0.5 border-2 border-black">
                  <UserPlus size={12} />
               </div>
            )}
         </div>

         <div className="flex flex-col items-center space-y-1">
            <button 
               onClick={handleLike}
               className={cn(
                 "p-3 rounded-2xl backdrop-blur-md transition-all active:scale-75",
                 isLiked ? "bg-rose-500/20 text-rose-500" : "bg-white/10 text-white hover:bg-white/20"
               )}
            >
               <Heart size={28} fill={isLiked ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
            <span className="text-white text-[12px] font-black">{post.likesCount || 0}</span>
         </div>

         <div className="flex flex-col items-center space-y-1">
            <button 
               onClick={handleSave}
               className={cn(
                  "p-3 rounded-2xl backdrop-blur-md transition-all active:scale-75",
                  isSaved ? "bg-teal-500 text-white shadow-lg shadow-teal-500/40" : "bg-white/10 text-white hover:bg-white/20"
               )}
            >
               <Bookmark size={28} fill={isSaved ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
            <span className="text-white text-[12px] font-black uppercase tracking-widest">{isSaved ? 'Saved' : 'Save'}</span>
         </div>

         <div className="flex flex-col items-center space-y-1">
            <button 
               onClick={handleShare}
               className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-75"
            >
               <Share2 size={28} strokeWidth={2.5} />
            </button>
         </div>

         <div className="flex flex-col items-center space-y-1 relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-75"
            >
               <MoreVertical size={24} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="absolute right-0 bottom-14 w-48 bg-white rounded-3xl shadow-2xl overflow-hidden py-1.5 z-[100]"
                >
                   {(user?.uid === post.authorId || user?.email === 'ziakhalid1614@gmail.com') && (
                     <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setShowMenu(false); }}
                          disabled={isDeleting}
                          className="w-full text-left px-4 py-3 text-[12px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                        >
                          <Trash2 size={16} />
                          <span>Delete Short</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTogglePrivacy(); }}
                          className="w-full text-left px-4 py-3 text-[12px] font-black uppercase tracking-widest text-teal-600 hover:bg-teal-50 flex items-center space-x-3 transition-colors"
                        >
                          {post.privacy === 'private' ? <Globe size={16} /> : <Lock size={16} />}
                          <span>Make {post.privacy === 'private' ? 'Public' : 'Private'}</span>
                        </button>
                     </>
                   )}
                   <button 
                     onClick={() => {
                        const url = window.location.origin + '/profile/' + post.authorId;
                        navigator.clipboard.writeText(url);
                        alert('Profile link copied!');
                        setShowMenu(false);
                     }}
                     className="w-full text-left px-4 py-3 text-[12px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                   >
                     <UserPlus size={16} />
                     <span>View Profile</span>
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute left-4 right-20 bottom-8 z-20">
         <div className="flex items-center space-x-2 mb-3">
            <h3 className="text-white font-black text-base shadow-sm drop-shadow-md">{post.authorName}</h3>
            {post.authorIsVerified && (
               <BadgeCheck size={16} className="text-teal-400 fill-teal-400/10 stroke-[2.5]" />
            )}
            <span className="text-[10px] text-white/60 font-bold bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-lg">
               {post.createdAt ? formatDistanceToNow(post.createdAt.toDate?.() || post.createdAt) + ' ago' : 'Just now'}
            </span>
         </div>
         
         <div 
            className="cursor-pointer"
            onClick={() => setShowFullCaption(!showFullCaption)}
         >
            <p className={cn(
               "text-white/90 text-sm leading-relaxed drop-shadow-md",
               !showFullCaption && "line-clamp-2"
            )}>
               {post.content}
            </p>
         </div>

         <div className="flex items-center space-x-2 mt-4 py-1.5 px-3 bg-white/10 backdrop-blur-md rounded-full w-fit">
            <Music2 size={14} className="text-teal-400 animate-spin-slow" />
            <span className="text-[10px] text-white/80 font-black uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-[120px]">
               {post.authorName}'s Reflection Original Audio
            </span>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10 z-30">
          <div 
            className="h-full bg-teal-500" 
            style={{ 
              width: `${videoRef.current?.duration ? (currentTime / videoRef.current.duration) * 100 : 0}%` 
            }}
          ></div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-sm font-black text-center text-gray-900 uppercase tracking-widest mb-2">Delete Short?</h3>
              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider leading-relaxed mb-6">
                This action is permanent and cannot be undone. Bismillah, are you sure?
              </p>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-red-500 text-white py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button 
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shorts;
