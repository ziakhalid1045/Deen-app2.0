import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Image as ImageIcon, Smile, Hash, Globe, Users, X, Video, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useUpload } from '../context/UploadContext';

const UploadPost = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { startPostUpload } = useUpload();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');

    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
      };
    }
  };

  const handlePost = async () => {
    if ((!content.trim() && !selectedFile) || !user || !profile) return;
    
    if (profile.isFrozen) {
      alert('Your account has been frozen by an admin.');
      return;
    }

    setLoading(true);
    try {
      const isShort = mediaType === 'video' && videoDuration && videoDuration <= 60;
      
      const postData = {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        authorCountry: profile.country || 'Unknown',
        authorIsVerified: profile.isVerified || false,
        authorIsPremium: profile.isPremium || false,
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim().replace('#', '')).filter(t => t),
        isShort: !!isShort,
        videoDuration,
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        privacy
      };

      if (selectedFile) {
        // Start background upload
        startPostUpload(selectedFile, postData);
        navigate('/'); // Redirect immediately
      } else {
        // Text only post
        await addDoc(collection(db, 'posts'), {
          ...postData,
          mediaUrl: '',
          mediaType: null,
          createdAt: serverTimestamp(),
        });
        navigate('/');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-[80vh] -mx-4 -mb-4 bg-white rounded-t-[3rem] shadow-2xl relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#115E59]">New Reflection</h2>
        <button 
          onClick={handlePost}
          disabled={(!content.trim() && !selectedFile) || loading}
          className={cn(
            "p-3 rounded-2xl shadow-xl transition-all active:scale-90",
            (content.trim() || selectedFile) ? "bg-[#115E59] text-white shadow-teal-900/20" : "bg-gray-100 text-gray-300 pointer-events-none"
          )}
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 space-y-4 pb-8 overflow-y-auto">
        <div className="flex items-center space-x-3 mb-2">
          <img 
            src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
            className="w-10 h-10 rounded-full border-2 border-teal-50 shadow-sm"
            alt="Me"
          />
          <div className="flex flex-col">
             <span className="font-black text-xs text-gray-900">@{profile?.displayName?.toLowerCase().replace(/\s/g, '')}</span>
             <button 
               onClick={() => setPrivacy(privacy === 'public' ? 'private' : 'public')}
               className="flex items-center space-x-1.5 text-[9px] font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-1 rounded-lg w-fit mt-0.5"
             >
                {privacy === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                <span>Visible to {privacy}</span>
             </button>
          </div>
        </div>

        <input 
          type="text"
          placeholder="Give it a title (optional)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xl font-black text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300"
        />

        <textarea 
          placeholder="Share your reflection... Bismillah" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] text-base font-medium text-gray-800 bg-transparent border-none outline-none resize-none placeholder:text-gray-200"
        />

        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl">
          <Hash size={16} className="text-teal-600" />
          <input 
            type="text"
            placeholder="Tags (comma separated)..."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="flex-1 text-xs font-bold text-gray-600 bg-transparent border-none outline-none"
          />
        </div>

        {previewUrl && (
          <div className="relative rounded-3xl overflow-hidden shadow-sm inline-block w-full">
             {mediaType === 'image' ? (
                <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-cover rounded-3xl border border-gray-100" />
             ) : (
                <video src={previewUrl} className="max-h-64 w-full rounded-3xl border border-gray-100 bg-black" controls />
             )}
             <button 
               onClick={() => { setSelectedFile(null); setPreviewUrl(''); setMediaType(null); }} 
               className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
             >
                <X size={14} />
             </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
           <div className="flex items-center space-x-4">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-[#115E59] transition-colors p-2 bg-gray-50 rounded-xl">
                 <div className="flex items-center space-x-2">
                    <ImageIcon size={22} />
                    <Video size={22} />
                 </div>
              </button>
              <button className="text-gray-400 hover:text-[#115E59] transition-colors p-2 bg-gray-50 rounded-xl"><Smile size={22} /></button>
           </div>
           
           <div className="text-[10px] font-bold text-gray-300">
             {content.length}/500
           </div>
        </div>
      </div>

      <div className="p-6 bg-teal-900/5 mt-auto rounded-b-[3rem]">
         <p className="text-[9px] text-teal-900/40 font-bold text-center leading-relaxed italic uppercase tracking-[0.1em]">
           "Let the guidance of the Deen lead your words. Share what benefits others and pleases the Most Merciful."
         </p>
      </div>
    </motion.div>
  );
};

export default UploadPost;
