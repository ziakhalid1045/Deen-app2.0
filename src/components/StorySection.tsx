import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Story } from '../types';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

const StorySection = () => {
  const { user, profile, blockedUsers } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStoryIdx, setViewingStoryIdx] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', Timestamp.fromDate(now))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      
      // Filter blocked users and group by user
      const filtered = storyData.filter(s => !blockedUsers.includes(s.authorId));
      
      // Sort by creation safely
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setStories(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stories');
    });

    return () => unsubscribe();
  }, [blockedUsers]);

  const handleCreateStory = async () => {
    if (!user || !profile) return;
    setIsUploading(true);
    
    try {
      // For this demo, we generate a random "Islamic Art" placeholder
      const mediaUrl = `https://picsum.photos/seed/${Math.random()}/1080/1920`;
      
      const now = new Date();
      // Use 24 hours from now
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'stories'), {
        authorId: user.uid,
        authorName: profile.displayName || 'Anonymous Seeker',
        authorPhoto: profile.photoURL || '',
        mediaUrl: mediaUrl,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });
      
      setIsCreating(false);
      alert("Story shared successfully! 🕌");
    } catch (error) {
      console.error("Story creation error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'stories');
    } finally {
      setIsUploading(false);
    }
  };

  // Group stories by author
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.authorId]) {
      acc[story.authorId] = [];
    }
    acc[story.authorId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const authors = Object.keys(groupedStories);

  return (
    <div className="mb-6 relative">
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide px-1">
        {/* Current User Story Circle */}
        <div className="flex flex-col items-center space-y-2 min-w-[72px]">
          <button 
            onClick={() => setIsCreating(true)}
            className="w-16 h-16 rounded-[1.8rem] border-2 border-teal-600 p-1 shadow-teal-500/10 shadow-2xl relative bg-white active:scale-95 transition-transform"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-full h-full rounded-[1.4rem] object-cover" alt="Me" />
            ) : (
              <div className="w-full h-full rounded-[1.4rem] bg-teal-50 flex items-center justify-center text-xl">
                 🕌
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
              <Plus size={16} className="bg-teal-600 text-white rounded-full p-0.5" />
            </div>
          </button>
          <span className="text-[9px] font-black uppercase tracking-widest text-teal-800">Your Story</span>
        </div>

        {/* Other Users Stories */}
        {authors.map((authorId, idx) => {
          const authorStories = groupedStories[authorId];
          const firstStory = authorStories[0];
          return (
            <div 
              key={authorId} 
              className="flex flex-col items-center space-y-2 min-w-[72px] cursor-pointer"
              onClick={() => setViewingStoryIdx(idx)}
            >
              <div className="w-16 h-16 rounded-[1.8rem] border-2 border-teal-500 p-1 bg-white bg-gradient-to-tr from-teal-400 to-emerald-500">
                <div className="w-full h-full rounded-[1.4rem] bg-white p-0.5">
                  <img 
                    src={firstStory.authorPhoto || `https://ui-avatars.com/api/?name=${firstStory.authorName}&background=random`} 
                    className="w-full h-full rounded-[1.3rem] object-cover" 
                    alt={firstStory.authorName} 
                  />
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 line-clamp-1 w-16 text-center">
                {firstStory.authorName.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {viewingStoryIdx !== null && (
          <StoryViewer 
            authorStories={groupedStories[authors[viewingStoryIdx]]} 
            onClose={() => setViewingStoryIdx(null)}
            onNext={() => {
              if (viewingStoryIdx < authors.length - 1) {
                setViewingStoryIdx(viewingStoryIdx + 1);
              } else {
                setViewingStoryIdx(null);
              }
            }}
            onPrev={() => {
              if (viewingStoryIdx > 0) {
                setViewingStoryIdx(viewingStoryIdx - 1);
              }
            }}
          />
        )}

        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-900/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 -mr-16 -mt-16 rounded-full opacity-50"></div>
              <button 
                onClick={() => setIsCreating(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-black text-teal-900 mb-2">Share a Reminder</h2>
              <p className="text-xs text-gray-500 mb-6 font-medium">Post a beautiful story that lasts 24 hours.</p>

              <div className="aspect-[9/16] bg-gray-100 rounded-[2rem] mb-6 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                   <Plus size={32} className="text-teal-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-800">Tap to generate art</p>
                <p className="text-[9px] text-gray-400 mt-2">Experimental: We'll create a unique Islamic-inspired image for you.</p>
              </div>

              <button 
                onClick={handleCreateStory}
                disabled={isUploading}
                className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Postening...</span>
                  </>
                ) : (
                  <span>Post Story</span>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StoryViewer = ({ authorStories, onClose, onNext, onPrev }: { 
  authorStories: Story[], 
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const story = authorStories[currentIdx];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIdx < authorStories.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        onNext();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIdx, authorStories.length, onNext]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
    >
      <div className="w-full max-w-md h-full relative flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
          {authorStories.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: i < currentIdx ? "100%" : "0%" }}
                animate={{ width: i === currentIdx ? "100%" : (i < currentIdx ? "100%" : "0%") }}
                transition={{ duration: i === currentIdx ? 5 : 0, ease: "linear" }}
                className="h-full bg-white"
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <img 
              src={story.authorPhoto || `https://ui-avatars.com/api/?name=${story.authorName}&background=random`} 
              className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-lg"
              alt={story.authorName}
            />
            <span className="text-white font-black text-sm drop-shadow-md">@{story.authorName.toLowerCase().replace(/\s/g, '')}</span>
          </div>
          <button onClick={onClose} className="text-white drop-shadow-md p-2">
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-gray-950 flex items-center justify-center">
          <img 
            src={story.mediaUrl} 
            className="w-full h-full object-cover" 
            alt="Story content" 
          />

          {/* Navigation Controls */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx > 0) {
                  setCurrentIdx(currentIdx - 1);
                } else {
                  onPrev();
                }
              }}
            />
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx < authorStories.length - 1) {
                  setCurrentIdx(currentIdx + 1);
                } else {
                  onNext();
                }
              }}
            />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-between items-center z-20">
           <div className="flex-1 mr-4">
              <input 
                type="text" 
                placeholder="Send a message..." 
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white text-xs font-medium placeholder:text-white/60 outline-none"
              />
           </div>
           <button className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 text-white">
              <Loader2 size={20} className="opacity-50" />
           </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StorySection;
