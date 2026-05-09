import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { ChevronLeft, Send, MoreVertical, ShieldAlert, MessageSquare, Plus, Image as ImageIcon, Video as VideoIcon, Loader2, X, Trash2, Check, CheckCheck } from 'lucide-react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { format, isSameDay } from 'date-fns';
import { uploadFile } from '../lib/uploadService';
import { deleteDoc, deleteField } from 'firebase/firestore';

const ChatDetail = () => {
  const { chatId } = useParams();
  const { user, blockedUsers, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const isMeBlocked = otherUser && blockedUsers.includes(otherUser.uid);

  useEffect(() => {
    if (!chatId || !user) return;

    // Determine other user
    const uids = chatId.split('_');
    const otherUid = uids.find(id => id !== user.uid);
    if (otherUid) {
      const fetchOther = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'users', otherUid));
          if (docSnap.exists()) {
            setOtherUser(docSnap.data());
            
            // Check if friend
            const friendSnap = await getDoc(doc(db, 'users', user.uid, 'friends', otherUid));
            setIsFriend(friendSnap.exists());
          }
        } finally {
          setLoading(false);
        }
      };
      fetchOther();
    } else {
      setLoading(false);
    }

    // Check Chat Request Status
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
       if (snap.exists()) {
          const data = snap.data();
          setRequestStatus(data.status || 'accepted');
       } else {
          setRequestStatus('none');
       }
    });

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[]);
      
      // Clear unread count for me
      if (chatId && user) {
        updateDoc(doc(db, 'chats', chatId), {
          [`unreadCount.${user.uid}`]: 0
        }).catch(err => {
          console.error("Error clearing unread:", err);
          handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
        });
      }

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => {
       unsubscribe();
       unsubChat();
    };
  }, [chatId, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user || !chatId || isMeBlocked) return;

    try {
      if (!otherUser?.uid) {
        throw new Error("Unable to identify the recipient. Please try again.");
      }

      setUploading(true);
      setUploadProgress(0);
      let mediaUrl = '';
      let mediaType = '';

      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile, (percent) => {
          setUploadProgress(percent);
        });
        mediaUrl = uploadRes.url;
        mediaType = uploadRes.resource_type;
      }

      const msgData = {
        senderId: user.uid,
        receiverId: otherUser.uid,
        content: newMessage,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        createdAt: serverTimestamp(),
        chatId: chatId,
        status: 'sent'
      };

      const batch = writeBatch(db);
      
      // Add message
      const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
      batch.set(msgRef, msgData);

      // Update chat meta
      const chatRef = doc(db, 'chats', chatId);
      const isNewChat = requestStatus === 'none';
      
      batch.set(chatRef, {
        lastMessage: mediaUrl ? (mediaType === 'video' ? 'sent a video' : 'sent a photo') : newMessage,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        updatedAt: serverTimestamp(),
        participants: [user.uid, otherUser.uid],
        status: isFriend ? 'accepted' : (isNewChat ? 'pending' : requestStatus),
        participantNames: {
           [user.uid]: profile?.displayName || user.displayName,
           [otherUser.uid]: otherUser.displayName
        },
        participantPhotos: {
           [user.uid]: profile?.photoURL || user.photoURL,
           [otherUser.uid]: otherUser.photoURL
        },
        [`unreadCount.${otherUser.uid}`]: increment(1)
      }, { merge: true });

      await batch.commit();
      setNewMessage('');
      setPreview(null);
      setSelectedFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!chatId || !confirm('Delete this message for everyone?')) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId));
      setSelectedMessageId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}/messages/${msgId}`);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !confirm('Are you sure you want to delete this entire chat? This action cannot be undone.')) return;
    try {
      setLoading(true);
      // Delete the chat document itself
      // In a real app, you'd also delete messages, but for spark plan we keep it simple or use batch if messages < 500
      await deleteDoc(doc(db, 'chats', chatId));
      navigate('/inbox');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview({ url, type: file.type.startsWith('video') ? 'video' : 'image' });
    }
  };

  const handleAcceptRequest = async () => {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), { status: 'accepted' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-teal-900 uppercase tracking-widest animate-pulse">Establishing Connection...</p>
      </div>
    );
  }

  const otherUid = chatId?.split('_').find(id => id !== user?.uid);

  return (
    <div className="flex flex-col h-screen -mx-4 -mb-4 bg-[#e5ddd5] relative overflow-hidden" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px' }}>
      {/* Header */}
      <div className="bg-[#075e54] py-3 px-4 flex items-center justify-between text-white shadow-xl sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-3">
             <img 
               src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}&background=random`} 
               alt="User" 
               className="w-10 h-10 rounded-full border-2 border-white/20 object-cover"
             />
             <div>
               <h3 className="text-sm font-bold">{otherUser?.displayName || 'Deen User'}</h3>
               <p className="text-[10px] text-teal-100 font-medium opacity-80 flex items-center">
                 <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                 Online
               </p>
             </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 relative">
           <button 
             onClick={() => setShowMenu(!showMenu)}
             className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
           >
             <MoreVertical size={18} />
           </button>
           
           {showMenu && (
             <div className="absolute top-10 right-0 bg-white shadow-2xl rounded-xl py-2 w-48 text-gray-800 z-[100] border border-gray-100 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => navigate(`/profile/${otherUid}`)}
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 w-full text-left text-sm"
                >
                  <Plus size={16} className="text-gray-400" />
                  <span>View profile</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button 
                  onClick={handleDeleteChat}
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-red-50 w-full text-left text-sm text-red-600"
                >
                  <Trash2 size={16} />
                  <span>Delete chat</span>
                </button>
             </div>
           )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {requestStatus === 'pending' && messages.some(m => m.senderId !== user?.uid) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4 mb-4 mx-4">
             <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
                <MessageSquare size={24} />
             </div>
             <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Message Request</h4>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                   Accept to start the conversation with {otherUser?.displayName}.
                </p>
             </div>
             <div className="flex space-x-2 w-full">
                <button 
                  onClick={handleAcceptRequest}
                  className="flex-1 bg-[#115E59] text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                   Accept
                </button>
                <button 
                  onClick={() => navigate(-1)}
                  className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                   Ignore
                </button>
             </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const showDate = idx === 0 || !isSameDay(msg.createdAt?.toDate() || new Date(), messages[idx-1].createdAt?.toDate() || new Date());
          
          return (
            <React.Fragment key={msg.id || idx}>
              {showDate && msg.createdAt && (
                <div className="flex justify-center my-4">
                  <span className="bg-[#d1f4cc] text-[#5b6d5b] text-[10px] px-2 py-1 rounded-md font-bold uppercase shadow-sm">
                    {format(msg.createdAt.toDate(), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div 
                className={cn(
                  "flex flex-col group",
                  isMe ? "items-end" : "items-start"
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isMe) setSelectedMessageId(msg.id!);
                }}
                onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id!)}
              >
                <div className={cn(
                  "max-w-[85%] p-1 rounded-lg text-[13px] shadow-[0_1px_0.5px_rgba(0,0,0,0.1)] transition-all relative",
                  isMe 
                    ? "bg-[#dcf8c6] text-gray-800 rounded-tr-none" 
                    : "bg-white text-gray-800 rounded-tl-none"
                )}>
                  {msg.mediaUrl && (
                    <div className="mb-1 rounded-md overflow-hidden">
                      {msg.mediaType === 'video' ? (
                        <video src={msg.mediaUrl} controls className="w-full max-h-[250px] object-cover" />
                      ) : (
                        <img src={msg.mediaUrl} alt="attachment" className="w-full max-h-[250px] object-cover" />
                      )}
                    </div>
                  )}
                  
                  <div className="px-2 pb-1 pr-12 relative min-h-[20px] pt-1">
                    {msg.content}
                    <div className="absolute bottom-1 right-1 flex items-center space-x-1">
                      <span className="text-[9px] text-gray-500 font-medium">
                        {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                      </span>
                      {isMe && (
                        <CheckCheck size={12} className={cn(msg.status === 'read' ? "text-blue-500" : "text-gray-400")} />
                      )}
                    </div>
                  </div>

                  {selectedMessageId === msg.id && isMe && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(msg.id!);
                      }}
                      className="absolute -top-8 right-0 bg-white shadow-xl rounded-lg p-2 text-red-600 animate-in zoom-in-75 z-[60]"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Media Preview */}
      {preview && (
        <div className="px-4 py-2 bg-white/90 backdrop-blur-md border-t border-gray-100 relative animate-in slide-in-from-bottom-2">
           <button 
             onClick={() => { setPreview(null); setSelectedFile(null); }}
             className="absolute -top-3 right-4 bg-red-500 text-white p-1 rounded-full shadow-lg z-20"
           >
             <X size={14} />
           </button>
           <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-teal-500 shadow-sm relative group bg-gray-100">
             {preview.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <VideoIcon size={24} className="text-white" />
                </div>
             ) : (
                <img src={preview.url} className="w-full h-full object-cover" alt="preview" />
             )}
             {uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-white">
                   <div className="text-[10px] font-black mb-1">{uploadProgress}%</div>
                   <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-teal-400 transition-all duration-300"
                       style={{ width: `${uploadProgress}%` }}
                     />
                   </div>
                </div>
             )}
           </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2 bg-[#f0f0f0] border-t border-gray-200 flex flex-col items-center pb-8 sticky bottom-0 z-50">
        {isMeBlocked ? (
          <div className="w-full bg-red-50 text-red-500 py-3 px-6 rounded-xl flex items-center justify-center space-x-3 border border-red-100 shadow-sm">
            <ShieldAlert size={18} />
            <p className="text-xs font-bold">You have blocked this user.</p>
          </div>
        ) : (
          <div className="w-full flex items-center space-x-2">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept="image/*,video/*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 hover:text-teal-700 transition-all active:scale-95"
            >
              <Plus size={24} />
            </button>
            <div className="flex-1 bg-white rounded-full px-4 py-1.5 flex items-center shadow-sm">
               <input 
                 type="text" 
                 placeholder={preview ? "Add a caption..." : "Type a message..."} 
                 className="bg-transparent border-none outline-none w-full py-1.5 text-[14px]"
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 onKeyPress={(e) => e.key === 'Enter' && handleSend(e)}
               />
            </div>
            <button 
              onClick={handleSend}
              className="bg-[#075e54] text-white p-3 rounded-full shadow-lg hover:bg-[#054d44] transition-all active:scale-95 disabled:opacity-50"
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatDetail;
