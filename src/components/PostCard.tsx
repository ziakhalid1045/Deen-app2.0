import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, MoreHorizontal, ShieldAlert, Check, Copy, Globe, BadgeCheck, Eye, Trash2, Lock, Play, Bookmark } from 'lucide-react';
import { Post } from '../types';
import { cn } from '../lib/utils';
import { doc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false); 
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [likers, setLikers] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const isAdmin = user?.email === 'ziakhalid1614@gmail.com';
  const isAuthor = user?.uid === post.authorId;

  const MAX_CHARACTERS = 350;
  const shouldTruncate = post.content.length > MAX_CHARACTERS;
  const displayText = isExpanded ? post.content : post.content.slice(0, MAX_CHARACTERS);

  useEffect(() => {
    if (!user) return;

    const viewedKey = `viewed_${post.id}`;
    if (sessionStorage.getItem(viewedKey)) return;

    let isMounted = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // View count logic
          if (!sessionStorage.getItem(viewedKey)) {
            sessionStorage.setItem(viewedKey, 'true');
            updateDoc(doc(db, 'posts', post.id), { viewsCount: increment(1) }).catch(console.error);
          }
          
          // Auto-play logic
          if (videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Browser might block auto-play if not muted
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  const retryPromise = videoRef.current.play();
                  if (retryPromise !== undefined) {
                    retryPromise.catch(err => {
                      if (err.name !== 'AbortError') console.error("Playback failed:", err);
                    });
                  }
                }
              });
            }
            if (isMounted) setIsPlaying(true);
          }
        } else {
          // Pause when leaves view
          if (videoRef.current) {
            videoRef.current.pause();
            if (isMounted) setIsPlaying(false);
          }
        }
      });
    }, { threshold: 0.6 });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [post.id, user, post.authorId]);

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
    setLocalLikesCount(post.likesCount);
  }, [post.likesCount]);

  useEffect(() => {
    // Fetch a few recent likes for the DP UI
    if (post.likesCount > 0) {
      const q = query(collection(db, 'posts', post.id, 'likes'), limit(3));
      getDocs(q).then(snap => {
        // We only have userIds in likes, so we'll just use ui-avatars as a placeholder for them since we don't store photoUrl in the like document right now.
        const fetchedLikers = snap.docs.map(d => ({ uid: d.id, name: `User_${d.id.substring(0, 4)}` }));
        setLikers(fetchedLikers);
      });
    } else {
      setLikers([]);
    }
  }, [post.likesCount, post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic Update
    const previousLiked = isLiked;
    const previousLikesCount = localLikesCount;
    
    setIsLiked(!isLiked);
    setLocalLikesCount(isLiked ? Math.max(0, localLikesCount - 1) : localLikesCount + 1);
    
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', post.id), { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', post.id), { likesCount: increment(1) });
        
        // Add notification for author
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
      // Revert if error
      setIsLiked(previousLiked);
      setLocalLikesCount(previousLikesCount);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const saveRef = doc(db, 'users', user.uid, 'savedPosts', post.id);
      if (isSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, {
          postId: post.id,
          savedAt: serverTimestamp(),
          // Store basic preview info to show in profile without extra fetches
          content: post.content.substring(0, 50),
          authorName: post.authorName,
          mediaUrl: post.videoUrl || post.imageUrl || ''
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.uid === post.authorId) return;
    if (window.confirm(`Are you sure you want to block ${post.authorName}?`)) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'blockedUsers', post.authorId), {
          uid: post.authorId,
          displayName: post.authorName,
          createdAt: serverTimestamp()
        });
        setShowMenu(false);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: 'Seeker Reflection',
      text: post.content.substring(0, 100) + '...',
      url: url,
    };

    const copyToClipboard = () => {
      navigator.clipboard.writeText(url).then(() => {
        setShareStatus('copied');
        setTimeout(() => {
          setShareStatus('idle');
          setShowMenu(false);
        }, 2000);
      });
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // If the user canceled the share, we don't treat it as an error
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Share canceled by user');
        } else {
          console.error('Share failed, falling back to copy:', err);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div 
      ref={cardRef} 
      className="bg-white px-4 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/80 rounded-[2.5rem] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-500 cursor-pointer w-full mb-6 relative overflow-hidden" 
      onClick={() => {
        if (post.videoUrl || post.isShort) {
          navigate('/shorts', { state: { initialPostId: post.id } });
        } else {
          navigate(`/post/${post.id}`);
        }
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-0"></div>
      
      <div className="flex items-start space-x-4 relative z-10">
        <div 
          className="relative flex-shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.authorId}`); }}
        >
          <img 
            src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`} 
            alt={post.authorName} 
            className="w-11 h-11 rounded-2xl border-2 border-white shadow-sm object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <div 
                className="flex items-center space-x-1.5 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.authorId}`); }}
              >
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-[15px] font-black text-gray-900 leading-none">{post.authorName}</h3>
                  {post.authorIsVerified && (
                    <BadgeCheck size={16} className="text-white fill-blue-500 drop-shadow-sm" />
                  )}
                </div>
                {post.authorCountry && post.authorCountry !== 'Unknown' && (
                  <span className="text-[10px] text-gray-500 font-bold flex items-center bg-gray-100/80 px-2 py-0.5 rounded-lg ml-1">
                    <Globe size={11} className="mr-1 opacity-70" />
                    {post.authorCountry}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-tight">
                @{post.authorName.toLowerCase().replace(/\s/g, '')} • {post.createdAt ? formatDistanceToNow(post.createdAt.toDate?.() || post.createdAt) + ' ago' : 'Just now'}
              </p>
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="text-gray-400 hover:text-gray-900 p-2 rounded-2xl hover:bg-gray-100 transition-all duration-200"
              >
                <MoreHorizontal size={18} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden py-1.5 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {(isAuthor || isAdmin) && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] font-black text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors uppercase tracking-widest"
                      >
                        <Trash2 size={16} />
                        <span>Delete {post.isShort ? 'Short' : 'Post'}</span>
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await updateDoc(doc(db, 'posts', post.id), {
                              privacy: post.privacy === 'private' ? 'public' : 'private'
                            });
                            setShowMenu(false);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-teal-600 hover:bg-teal-50 flex items-center space-x-3 transition-colors"
                      >
                        {post.privacy === 'private' ? <Globe size={16} /> : <Lock size={16} />}
                        <span>Make {post.privacy === 'private' ? 'Public' : 'Private'}</span>
                      </button>
                    </>
                  )}
                  {user?.uid !== post.authorId && (
                    <button 
                      onClick={handleBlock}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                    >
                      <ShieldAlert size={16} />
                      <span>Block User</span>
                    </button>
                  )}
                  <button 
                    onClick={handleShare}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                  >
                    {shareStatus === 'copied' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span>{shareStatus === 'copied' ? 'Copied Link!' : 'Copy Post Link'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-1 mb-3">
            <div className="relative">
              <p className="text-[15px] font-medium text-gray-800 leading-[1.6] whitespace-pre-wrap break-words">
                {displayText}
                {!isExpanded && shouldTruncate && <span className="text-gray-400">...</span>}
              </p>
              {!isExpanded && shouldTruncate && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                  className="text-teal-600 font-black text-sm mt-1 hover:underline cursor-pointer block"
                >
                  See More
                </button>
              )}
            </div>
            
            {post.mediaType === 'video' || post.videoUrl ? (
              <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center bg-black aspect-video relative group/video">
                <video 
                  ref={videoRef}
                  src={post.videoUrl} 
                  playsInline
                  webkit-playsinline="true"
                  crossOrigin="anonymous"
                  autoPlay={false}
                  preload="metadata"
                  loop
                  muted={true}
                  className="w-full h-full object-contain"
                  poster={post.imageUrl || ""} 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        const playPromise = videoRef.current.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(err => {
                            if (err.name !== 'AbortError') console.error("Playback failed:", err);
                          });
                        }
                        setIsPlaying(true);
                      }
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-opacity"
                >
                   {isMuted ? <Eye size={16} className="opacity-50" /> : <ShieldAlert size={16} className="text-teal-400" />}
                </button>
                {!isPlaying && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                      <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
                         <Play size={32} className="text-white fill-white" />
                      </div>
                   </div>
                )}
              </div>
            ) : post.imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center bg-gray-50/50">
                <img src={post.imageUrl} alt="Post Attachment" className="w-full max-h-[450px] object-cover" />
              </div>
            )}

            {/* Check for YouTube Links */}
            {(() => {
               const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
               const match = post.content.match(ytRegex);
               if (match && match[1]) {
                 return (
                   <div className="mt-3 rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-900 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                     <iframe
                       width="100%"
                       height="100%"
                       src={`https://www.youtube.com/embed/${match[1]}?rel=0`}
                       title="YouTube video player"
                       frameBorder="0"
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                       allowFullScreen
                     ></iframe>
                   </div>
                 )
               }
               return null;
            })()}
          </div>
          
          <div className="flex items-center justify-between text-gray-500 mt-6 pt-3 border-t border-gray-50">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleLike}
                className={cn(
                  "flex items-center space-x-2.5 px-5 py-3 rounded-[1.5rem] transition-all duration-500 group active:scale-90",
                  isLiked 
                    ? "bg-rose-50 text-rose-600 shadow-md shadow-rose-200/50 border border-rose-100" 
                    : "bg-gray-50 hover:bg-rose-50/50 hover:text-rose-500 border border-transparent"
                )}
              >
                <div className="relative">
                  <Heart 
                    size={22} 
                    fill={isLiked ? "currentColor" : "none"} 
                    className={cn(
                      "transition-all duration-500",
                      isLiked ? "fill-rose-600 animate-heart-beat" : "group-hover:scale-110"
                    )} 
                  />
                </div>
                <span className="text-[14px] font-black tracking-tight">{localLikesCount || 0}</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
                className="flex items-center space-x-2.5 px-5 py-3 rounded-[1.5rem] bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-all duration-500 group active:scale-90 border border-transparent"
              >
                <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
                <span className="text-[14px] font-black tracking-tight">{post.commentsCount || 0}</span>
              </button>

              <button 
                onClick={handleShare}
                className={cn(
                  "flex items-center space-x-2.5 px-5 py-3 rounded-[1.5rem] transition-all duration-500 active:scale-90 border border-transparent",
                  shareStatus === 'copied' 
                    ? "bg-green-50 text-green-600 border-green-100" 
                    : "bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                )}
              >
                {shareStatus === 'copied' ? <Check size={22} className="text-green-500" /> : <Share2 size={22} className="group-hover:scale-110 transition-transform" />}
                <span className="text-[14px] font-black tracking-tight">{shareStatus === 'copied' ? 'Shared' : post.sharesCount || 0}</span>
              </button>

              <button 
                onClick={handleSave}
                className={cn(
                  "flex items-center space-x-2.5 px-5 py-3 rounded-[1.5rem] transition-all duration-500 active:scale-90 border border-transparent",
                  isSaved 
                    ? "bg-teal-50 text-teal-600 border-teal-100 shadow-md shadow-teal-100" 
                    : "bg-gray-50 text-gray-600 hover:bg-teal-50/50 hover:text-teal-500"
                )}
              >
                <Bookmark size={22} fill={isSaved ? "currentColor" : "none"} className={cn("transition-transform group-hover:scale-110", isSaved && "animate-pulse")} />
                <span className="text-[14px] font-black tracking-tight">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-gray-400 bg-gray-50/80 px-4 py-3 rounded-[1.5rem] border border-transparent hover:border-gray-100 transition-all">
                <Eye size={18} className="opacity-60" />
                <span className="text-[13px] font-black tabular-nums">{post.viewsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-sm font-black text-center text-gray-900 uppercase tracking-widest mb-2">Delete Permanently?</h3>
              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider leading-relaxed mb-6">
                This action is permanent and cannot be undone. Bismillah, are you sure?
              </p>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsDeleting(true);
                    try {
                      await deleteDoc(doc(db, 'posts', post.id));
                      setShowDeleteConfirm(false);
                    } catch (err) {
                      console.error(err);
                      setIsDeleting(false);
                      alert("Delete failed. Please try again.");
                    }
                  }}
                  disabled={isDeleting}
                  className="w-full bg-red-500 text-white py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
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

export default PostCard;
