import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Post, Comment } from '../types';
import { ChevronLeft, Send, Heart, MessageCircle, Share2, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

const PostDetail = () => {
  const { postId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    // Real-time post updates
    const unsubPost = onSnapshot(doc(db, 'posts', postId), (snap) => {
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() } as Post);
      }
      setLoading(false);
    });

    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc') // Changed to asc for conversational flow
    );
    const unsubComments = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[]);
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile || !postId || !post) return;

    const commentText = newComment;
    setNewComment('');

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL || '',
        content: commentText,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1)
      });

      // Notify post author
      if (post.authorId !== user.uid) {
        const notificationRef = doc(collection(db, 'users', post.authorId, 'notifications'));
        await setDoc(notificationRef, {
          type: 'comment',
          fromId: user.uid,
          fromName: profile.displayName,
          fromPhoto: profile.photoURL || '',
          targetId: post.authorId,
          postId: postId,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error(e);
      setNewComment(commentText); // Restore if failed
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-teal-700 font-bold">Bismillah... Loading Post</div>;
  if (!post) return <div className="text-center py-20 text-gray-500">Post not found.</div>;

  return (
    <div className="flex flex-col min-h-screen -mx-4 -mb-4 bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#115E59] py-4 px-4 flex items-center space-x-4 text-white sticky top-0 z-50 rounded-b-[2rem] shadow-lg font-sans">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {/* The Post */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative">
          <div 
            className="flex items-center space-x-3 mb-4 cursor-pointer"
            onClick={() => navigate(`/profile/${post.authorId}`)}
          >
            <img 
                src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`} 
                alt={post.authorName} 
                className="w-12 h-12 rounded-2xl border border-white shadow-sm object-cover"
            />
            <div>
              <h3 className="font-black text-gray-900 text-sm">@{post.authorName}</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                {post.createdAt ? formatDistanceToNow(post.createdAt.toDate?.() || post.createdAt) + ' ago' : 'Just now'}
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 text-base leading-relaxed font-medium mb-4 whitespace-pre-wrap">{post.content}</p>
          
          {post.mediaType === 'video' || post.videoUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-sm bg-black aspect-video relative">
              <video 
                src={post.videoUrl} 
                controls 
                className="w-full h-full"
                poster={post.imageUrl || ""} 
              />
            </div>
          ) : post.imageUrl && (
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <img src={post.imageUrl} alt="Post Attachment" className="w-full h-auto" />
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 mb-2">Reflections ({comments.length})</h4>
          
          {comments.map((comment, idx) => (
            <div 
              key={comment.id} 
              className="bg-white rounded-[1.5rem] p-4 border border-gray-100 flex items-start space-x-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
               <img 
                 src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}&background=random`} 
                 className="w-9 h-9 rounded-xl border border-gray-100" 
                 alt={comment.authorName} 
               />
               <div className="flex-1">
                 <div className="flex justify-between items-center mb-0.5">
                   <h5 className="text-[11px] font-black text-gray-900">@{comment.authorName}</h5>
                   <span className="text-[8px] text-gray-300 font-black uppercase">{formatDistanceToNow(comment.createdAt.toDate?.() || comment.createdAt)}</span>
                 </div>
                 <p className="text-xs text-gray-600 leading-relaxed font-medium">{comment.content}</p>
                 <button className="text-[9px] font-black text-teal-600 uppercase mt-2 hover:text-teal-900">Reply</button>
               </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center py-10 bg-white rounded-[1.5rem] border border-gray-100 border-dashed">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No reflections yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] p-3 shadow-2xl flex items-center space-x-3">
          <form onSubmit={handleAddComment} className="flex-1 flex items-center space-x-3">
            <input 
              type="text" 
              placeholder="Add your reflection..." 
              className="flex-1 bg-gray-50/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 placeholder:text-gray-300 focus:ring-0 transition-all outline-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="bg-[#115E59] text-white p-4 rounded-2xl shadow-xl shadow-teal-900/20 hover:scale-105 hover:bg-teal-900 transition-all active:scale-90 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
