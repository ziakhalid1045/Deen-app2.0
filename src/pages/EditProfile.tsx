import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Camera, User, FileText, Check, Globe, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadFile } from '../lib/uploadService';
import { useUpload } from '../context/UploadContext';
import { motion } from 'motion/react';

const EditProfile = () => {
  const { profile } = useAuth();
  const { startProfileUpdate, activeUploads } = useUpload();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [loading, setLoading] = useState(false);

  const [previewAvatar, setPreviewAvatar] = useState<File | null>(null);
  const [previewCover, setPreviewCover] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Check if there are active uploads for this profile
  const isUpdatingAvatar = activeUploads.some(u => u.status === 'uploading' && u.fileName.includes('Avatar'));
  const isUpdatingCover = activeUploads.some(u => u.status === 'uploading' && u.fileName.includes('Cover'));
  const avatarProgress = activeUploads.find(u => u.status === 'uploading' && u.fileName.includes('Avatar'))?.progress || 0;
  const coverProgress = activeUploads.find(u => u.status === 'uploading' && u.fileName.includes('Cover'))?.progress || 0;

  const countries = [
    "Pakistan", "India", "Bangladesh", "United Kingdom", "United States", "Saudi Arabia", "UAE", "Malaysia", "Indonesia"
  ];

  const avatars = [
    { id: '1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=hijab' },
    { id: '2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amir&top=shorthair' },
    { id: '3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zahra&top=turban' },
    { id: '4', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar&top=shorthair' },
    { id: '5', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Layla&top=hijab' },
    { id: '6', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hamza&top=shorthair' },
  ];

  const covers = [
    { id: 'c1', url: 'https://images.unsplash.com/photo-1519810755548-39cd217da494?auto=format&fit=crop&q=80&w=800' },
    { id: 'c2', url: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&q=80&w=800' },
    { id: 'c3', url: 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&q=80&w=800' },
    { id: 'c4', url: 'https://images.unsplash.com/photo-1524230659192-35f3458eb475?auto=format&fit=crop&q=80&w=800' },
    { id: 'c5', url: 'https://images.unsplash.com/photo-1584551246679-0da3d274c04b?auto=format&fit=crop&q=80&w=800' },
    { id: 'c6', url: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800' },
  ];
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setUsername(profile.username || '');
      setPhotoURL(profile.photoURL || '');
      setCoverURL(profile.coverURL || '');
      setBio(profile.bio || '');
      setCountry(profile.country || 'Pakistan');
    }
  }, [profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (type === 'cover') setPreviewCover(file);
    else setPreviewAvatar(file);
  };

  const handleApplyImage = async (type: 'cover' | 'avatar') => {
    if (!profile) return;
    const file = type === 'cover' ? previewCover : previewAvatar;
    if (!file) return;

    startProfileUpdate(file, type, profile.uid);
    if (type === 'cover') setPreviewCover(null);
    else setPreviewAvatar(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !displayName.trim()) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        photoURL,
        coverURL,
        bio,
        country,
        updatedAt: new Date()
      });
      navigate('/profile');
    } catch (e) {
      console.error(e);
      alert("Error updating profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen -mx-4 -mb-4 bg-white">
      {/* Header */}
      <div className="bg-[#075e54] py-4 px-4 flex items-center justify-between text-white sticky top-0 z-50 shadow-xl">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-2xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-black tracking-tight">Profile Studio</h2>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={loading || !displayName.trim()}
          className="bg-white text-[#075e54] px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-teal-50 transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? "..." : "Done"}
        </button>
      </div>

      <div className="flex-1 p-6 space-y-10 pb-32 max-w-lg mx-auto w-full">
        {/* Cover Photo UI */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Visual Identity</label>
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
          <div 
            className="relative h-48 w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-gray-100 group cursor-pointer border-4 border-white"
            onClick={() => coverInputRef.current?.click()}
          >
             <img 
               src={previewCover ? URL.createObjectURL(previewCover) : (coverURL || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800')} 
               className={cn("w-full h-full object-cover transition-all duration-500", (isUpdatingCover || previewCover) ? "opacity-30 blur-md scale-110" : "group-hover:scale-105")}
               alt="Cover Preview"
             />
             <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                {isUpdatingCover ? (
                  <div className="flex flex-col items-center px-6 w-full">
                    <div className="text-white font-black text-xs mb-2">{coverProgress}% Syncing</div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 transition-all duration-300" style={{ width: `${coverProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 text-white">
                    <Upload size={24} />
                  </div>
                )}
             </div>
          </div>
          {previewCover && !isUpdatingCover && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleApplyImage('cover')}
              className="w-full bg-teal-600 text-white py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2"
            >
              <Check size={14} />
              <span>Apply Cover Image</span>
            </motion.button>
          )}
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center space-y-4 -mt-24 relative z-10">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />
          <div 
            className="relative cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <img 
              src={previewAvatar ? URL.createObjectURL(previewAvatar) : (photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`)} 
              alt="Avatar" 
              className={cn("w-32 h-32 rounded-[2.5rem] border-[6px] border-white shadow-2xl object-cover bg-white transition-all duration-500", (isUpdatingAvatar || previewAvatar) ? "opacity-30 blur-md scale-110" : "group-hover:rotate-3")}
            />
            <div className="absolute inset-0 bg-black/30 rounded-[2.5rem] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
               {isUpdatingAvatar ? (
                  <div className="flex flex-col items-center px-4 w-full">
                    <div className="text-white font-black text-[10px] mb-2">{avatarProgress}%</div>
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 transition-all duration-300" style={{ width: `${avatarProgress}%` }} />
                    </div>
                  </div>
               ) : (
                  <Camera className="text-white" size={24} />
               )}
            </div>
          </div>
          {previewAvatar && !isUpdatingAvatar && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleApplyImage('avatar')}
              className="bg-teal-600 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2"
            >
              <Check size={14} />
              <span>Apply Avatar</span>
            </motion.button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <input 
                type="text" 
                className="w-full bg-gray-50 border-none rounded-3xl py-5 pl-14 pr-6 text-sm font-black text-gray-900 shadow-inner focus:ring-4 focus:ring-teal-100 transition-all"
                placeholder="Name on your path"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Community Handle</label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black group-focus-within:text-teal-600 transition-colors">@</span>
              <input 
                type="text" 
                className="w-full bg-gray-50 border-none rounded-3xl py-5 pl-12 pr-6 text-sm font-black text-gray-900 shadow-inner focus:ring-4 focus:ring-teal-100 transition-all"
                placeholder="creative_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Your Story (Bio)</label>
            <div className="relative group">
              <FileText className="absolute left-5 top-6 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <textarea 
                className="w-full bg-gray-50 border-none rounded-3xl py-5 pl-14 pr-6 text-sm font-medium text-gray-900 shadow-inner focus:ring-4 focus:ring-teal-100 transition-all min-h-[120px] resize-none"
                placeholder="Tell the community about your journey..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Location</label>
            <div className="relative group">
              <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
              <select 
                className="w-full bg-gray-50 border-none rounded-3xl py-5 pl-14 pr-6 text-sm font-black text-gray-900 shadow-inner focus:ring-4 focus:ring-teal-100 transition-all appearance-none"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full bg-[#115E59] text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-teal-900/20 hover:bg-teal-900 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? "Synchronizing..." : "Finalize Changes"}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
