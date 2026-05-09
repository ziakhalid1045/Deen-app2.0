import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Send, Image as ImageIcon, MoreVertical, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { uploadFile } from '../lib/uploadService';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  mediaUrl?: string;
  createdAt: any;
  chatId: string;
}

const ChatRoom = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    // Get other participant ID from chatId (assuming format: uid1_uid2)
    const participants = chatId.split('_');
    const otherUserId = participants.find(id => id !== user.uid);

    if (otherUserId) {
      getDoc(doc(db, 'users', otherUserId)).then(snap => {
        if (snap.exists()) {
          setOtherUser({ uid: snap.id, ...snap.data() });
        }
      });
    }

    const qPath = `chats/${chatId}/messages`;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, qPath);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !chatId || !user || !profile) return;

    const messageContent = newMessage.trim();
    const fileToSend = selectedFile;
    
    setNewMessage('');
    setImagePreview(null);
    setSelectedFile(null);

    const messagesPath = `chats/${chatId}/messages`;
    
    try {
      let imageUrl = '';
      if (fileToSend) {
        setUploadingImage(true);
        setUploadProgress(0);
        const uploadRes = await uploadFile(fileToSend, (percent) => {
          setUploadProgress(percent);
        });
        imageUrl = uploadRes.url;
        setUploadingImage(false);
      }

      // 1. Add message to subcollection
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: profile.displayName,
        receiverId: otherUser?.uid || '',
        content: messageContent,
        mediaUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        chatId: chatId
      });

      // 2. Update chat metadata for list view
      await setDoc(doc(db, 'chats', chatId), {
        participants: chatId.split('_'),
        lastMessage: imageUrl ? '📷 Photo' : messageContent,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        metadata: {
          [`user_${user.uid}`]: profile.displayName,
          [`user_${otherUser?.uid}`]: otherUser?.displayName || 'Seeker'
        }
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
      handleFirestoreError(error, OperationType.WRITE, messagesPath);
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Opening Channel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-teal-600 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(`/profile/${otherUser?.uid}`)}>
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'U'}&background=random`} 
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-100"
              alt="avatar"
            />
            <div>
              <h2 className="text-sm font-black text-gray-900 leading-none">{otherUser?.displayName || 'Seeker'}</h2>
              <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mt-1.5 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Active Now
              </p>
            </div>
          </div>
        </div>
        <button className="p-2 text-gray-300">
           <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center mb-8">
           <div className="bg-teal-50/50 px-4 py-1.5 rounded-full border border-teal-100/50">
              <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Beginning of connection</p>
           </div>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.senderId === user?.uid;
          const showTime = i === 0 || (msg.createdAt && messages[i-1].createdAt && 
            msg.createdAt.seconds - messages[i-1].createdAt.seconds > 300);

          return (
            <div key={msg.id} className="space-y-1">
              {showTime && msg.createdAt && (
                <div className="text-center py-2">
                   <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em]">
                     {format(new Date(msg.createdAt.seconds * 1000), 'h:mm a')}
                   </span>
                </div>
              )}
              <div className={cn(
                "flex w-full",
                isMe ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl text-[13px] leading-relaxed shadow-sm font-medium overflow-hidden",
                  isMe 
                    ? "bg-[#115E59] text-white rounded-br-none" 
                    : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                )}>
                  {msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="sent" className="w-full max-h-60 object-cover mb-1 rounded-lg" />
                  )}
                  {msg.content && (
                    <div className="p-3.5">{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
         {imagePreview && (
           <div className="mb-3 relative inline-block">
             <img src={imagePreview} className="w-20 h-20 object-cover rounded-xl border border-gray-100 shadow-md" alt="preview" />
             <button 
               onClick={() => { setImagePreview(null); setSelectedFile(null); }}
               className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
             >
               <X size={12} />
             </button>
             {uploadingImage && (
               <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-xl p-1">
                 <div className="text-[9px] font-black text-teal-700 mb-0.5">{uploadProgress}%</div>
                 <div className="w-[80%] h-1 bg-gray-200 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-[#115E59] transition-all duration-300" 
                     style={{ width: `${uploadProgress}%` }}
                   />
                 </div>
               </div>
             )}
           </div>
         )}
         <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageSelect} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-teal-600 transition-colors"
            >
               <ImageIcon size={20} />
            </button>
            <div className="flex-1 relative">
               <input 
                type="text" 
                placeholder="Write a message..."
                className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-xs font-bold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={(!newMessage.trim() && !selectedFile) || uploadingImage}
              className={cn(
                "p-3 rounded-2xl shadow-lg transition-all active:scale-95",
                (newMessage.trim() || selectedFile) && !uploadingImage
                  ? "bg-[#115E59] text-white shadow-teal-900/20" 
                  : "bg-gray-100 text-gray-300"
              )}
            >
               <Send size={18} />
            </button>
         </form>
         <div className="h-2"></div>
      </div>
    </div>
  );
};

export default ChatRoom;
