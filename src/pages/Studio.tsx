import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ChevronLeft, TrendingUp, Eye, Heart, MessageCircle, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Post } from '../types';

const Studio = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
        const snap = await getDocs(q);
        const fetchedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
        // Sort in memory to avoid index requirement for complex queries
        fetchedPosts.sort((a, b) => {
           const aDate = a.createdAt?.toDate?.() || new Date(0);
           const bDate = b.createdAt?.toDate?.() || new Date(0);
           return bDate.getTime() - aDate.getTime();
        });
        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Error fetching studio posts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [user]);

  if (!user || !profile) return null;

  const totalViews = posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);

  // Generate chart data based on last 7 days vs previous 7 days (mocked timeline for simplicity if few posts exist)
  // Let's just group by day for simple visual
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
     const d = new Date();
     d.setDate(d.getDate() - i);
     
     // Find posts created on this day
     const dayPosts = posts.filter(p => {
        if (!p.createdAt?.toDate) return false;
        const postDate = p.createdAt.toDate();
        return postDate.getDate() === d.getDate() && postDate.getMonth() === d.getMonth() && postDate.getFullYear() === d.getFullYear();
     });

     const dayViews = dayPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
     const dayLikes = dayPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0);

     chartData.push({
         name: d.toLocaleDateString('en-US', { weekday: 'short' }),
         views: dayViews,
         likes: dayLikes,
     });
  }

  const topPosts = [...posts].sort((a, b) => ((b.viewsCount || 0) + b.likesCount) - ((a.viewsCount || 0) + a.likesCount)).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-50 text-gray-800 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-tight">Creator Studio</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dashboard & Analytics</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#115E59] to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/30">
          <TrendingUp size={18} className="text-white" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
           <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
           
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                   <Eye size={40} />
                </div>
                <p className="text-xs font-bold text-gray-500 mb-1">Total Views</p>
                <h3 className="text-2xl font-black text-gray-900">{totalViews}</h3>
                <div className="flex items-center text-[10px] text-green-500 font-bold mt-2">
                   <TrendingUp size={12} className="mr-1" />
                   <span>+12.5% vs last wk</span>
                </div>
             </div>

             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                   <Heart size={40} />
                </div>
                <p className="text-xs font-bold text-gray-500 mb-1">Total Likes</p>
                <h3 className="text-2xl font-black text-gray-900">{totalLikes}</h3>
                <div className="flex items-center text-[10px] text-green-500 font-bold mt-2">
                   <TrendingUp size={12} className="mr-1" />
                   <span>+8.2% vs last wk</span>
                </div>
             </div>

             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                   <MessageCircle size={40} />
                </div>
                <p className="text-xs font-bold text-gray-500 mb-1">Total Comments</p>
                <h3 className="text-2xl font-black text-gray-900">{totalComments}</h3>
                <div className="flex items-center text-[10px] text-green-500 font-bold mt-2">
                   <TrendingUp size={12} className="mr-1" />
                   <span>+3.1% vs last wk</span>
                </div>
             </div>

             <div className="bg-gradient-to-tr from-teal-600 to-emerald-600 p-4 rounded-3xl shadow-lg shadow-teal-600/20 text-white relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -bottom-4 -right-4 opacity-20">
                   <Activity size={60} />
                </div>
                <div>
                   <p className="text-xs font-bold text-purple-100 mb-1.5">Profile Ranking</p>
                   <h3 className="text-2xl font-black text-white">Top 5%</h3>
                </div>
                <div className="mt-2 text-[10px] font-bold text-purple-200">
                   Excellent growth rate
                </div>
             </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center">
                    <Activity size={16} className="text-purple-500 mr-2" />
                    7-Day Activity
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">Profile Views & Engagement</p>
                </div>
             </div>
             <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Top Posts */}
          <div>
            <h3 className="text-sm font-black text-gray-900 mb-3 ml-2 flex items-center">
              <BarChart3 size={16} className="text-purple-500 mr-2" />
              Highest Performing Posts
            </h3>
            <div className="space-y-3">
               {topPosts.length === 0 ? (
                  <p className="text-center text-sm font-medium text-gray-400 p-6">No posts yet. Create some to view analytics!</p>
               ) : (
                  topPosts.map((post, idx) => (
                    <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black text-gray-500 shrink-0">
                          #{idx + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{post.content}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</p>
                       </div>
                       <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-center">
                             <p className="text-xs font-black text-gray-900">{post.viewsCount || 0}</p>
                             <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">Views</p>
                          </div>
                          <div className="w-px h-6 bg-gray-100"></div>
                          <div className="text-center">
                             <p className="text-xs font-black text-gray-900">{post.likesCount}</p>
                             <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest">Likes</p>
                          </div>
                       </div>
                    </div>
                  ))
               )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Studio;
