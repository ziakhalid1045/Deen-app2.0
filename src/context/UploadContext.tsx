import React, { createContext, useContext, useState, ReactNode } from 'react';
import { uploadFile } from '../lib/uploadService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  type: 'post' | 'chat' | 'profile';
}

interface UploadContextType {
  activeUploads: UploadTask[];
  startPostUpload: (file: File, postData: any) => Promise<void>;
  startProfileUpdate: (file: File, type: 'profile' | 'cover', userId: string) => Promise<void>;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within an UploadProvider');
  return context;
};

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [activeUploads, setActiveUploads] = useState<UploadTask[]>([]);

  const updateTask = (id: string, updates: Partial<UploadTask>) => {
    setActiveUploads(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const startPostUpload = async (file: File, postData: any) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: UploadTask = {
      id,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      type: 'post'
    };

    setActiveUploads(prev => [...prev, newTask]);

    try {
      const res = await uploadFile(file, (percent) => {
        updateTask(id, { progress: percent });
      });

      const mediaUrlField = res.resource_type === 'video' ? 'videoUrl' : 'imageUrl';
      
      await addDoc(collection(db, 'posts'), {
        ...postData,
        [mediaUrlField]: res.url,
        mediaType: res.resource_type,
        createdAt: serverTimestamp(),
      });

      updateTask(id, { status: 'completed', progress: 100 });
      
      setTimeout(() => {
        setActiveUploads(prev => prev.filter(t => t.id !== id));
      }, 5000);

    } catch (err: any) {
      console.error('Background upload failed:', err);
      updateTask(id, { status: 'error', error: err.message });
    }
  };

  const startProfileUpdate = async (file: File, type: 'profile' | 'cover', userId: string) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: UploadTask = {
      id,
      fileName: `${type === 'profile' ? 'Avatar' : 'Cover'} image`,
      progress: 0,
      status: 'uploading',
      type: type === 'profile' ? 'profile' : 'profile' // Using profile type for UI
    };

    setActiveUploads(prev => [...prev, newTask]);

    try {
      const res = await uploadFile(file, (percent) => {
        updateTask(id, { progress: percent });
      });

      const field = type === 'profile' ? 'photoURL' : 'coverURL';
      await updateDoc(doc(db, 'users', userId), {
        [field]: res.url,
        updatedAt: serverTimestamp()
      });

      updateTask(id, { status: 'completed', progress: 100 });
      
      setTimeout(() => {
        setActiveUploads(prev => prev.filter(t => t.id !== id));
      }, 3000);

    } catch (err: any) {
      console.error('Profile upload failed:', err);
      updateTask(id, { status: 'error', error: err.message });
    }
  };

  const clearCompleted = () => {
    setActiveUploads(prev => prev.filter(t => t.status !== 'completed'));
  };

  return (
    <UploadContext.Provider value={{ activeUploads, startPostUpload, startProfileUpdate, clearCompleted }}>
      {children}
    </UploadContext.Provider>
  );
};
