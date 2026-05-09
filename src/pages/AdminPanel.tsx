import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, Users, FileText, AlertTriangle, ChevronLeft, Edit2, Lock, Unlock, X, Save, Upload, Activity, Database, Smartphone, FileUp, Search, Heart, MessageCircle, ShieldCheck, AlertCircle, TrendingUp, Zap, Clock, Settings, LayoutDashboard, MoreVertical, RotateCcw, UserPlus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState<any>(null);
  const [kycPending, setKycPending] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'users' | 'posts' | 'kyc' | 'app'>('dashboard');
  const [activeMenu, setActiveMenu] = useState<{ type: 'user' | 'post' | 'report', id: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNavMenu, setShowNavMenu] = useState(false);

  // App Config edits
  const [apkUrl, setApkUrl] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [engineStatus, setEngineStatus] = useState<{ isRunning: boolean } | null>(null);

  // Edit states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostContent, setEditPostContent] = useState('');

  useEffect(() => {
    if (loading) return;

    if (user?.email !== 'ziakhalid1614@gmail.com') {
      navigate('/');
      return;
    }

    const qReports = query(collection(db, 'reports'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reports'));

    // Reactive Users
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsers(allUsers);
      setKycPending(allUsers.filter(u => u.kycStatus === 'pending'));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

    // Reactive Posts
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'posts'));

    // Reactive App Config
    const unsubscribeConfig = onSnapshot(doc(db, 'appConfig', 'general'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAppConfig(data);
        setAppVersion(data.version || '1.0.0');
      }
    });

    return () => {
      unsubscribeReports();
      unsubscribeUsers();
      unsubscribePosts();
      unsubscribeConfig();
    };
  }, [user, navigate]);

  useEffect(() => {
	fetch('/api/engagement/status').then(res => res.json()).then(setEngineStatus).catch(console.error);
  }, []);

  const handleApproveKYC = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'approved',
        isVerified: true
      });
      setKycPending(kycPending.filter(u => u.id !== userId));
      alert('KYC Approved!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleRejectKYC = async (userId: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'rejected',
        isVerified: false,
        kycRejectionReason: reason
      });
      setKycPending(kycPending.filter(u => u.id !== userId));
      alert('KYC Rejected.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${id}`);
    }
  };

  const handleDeletePost = async (id: string) => {
    if(!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${id}`);
    }
  }

  const handleDeleteUser = async (id: string) => {
     if(!window.confirm('Are you sure you want to delete this user profile? (This will not delete auth user immediately)')) return;
     try {
        await deleteDoc(doc(db, 'users', id));
     } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
     }
  }

  const handleEditUser = (user: any) => {
     setEditingUser(user);
     setEditName(user.displayName || '');
     setEditBio(user.bio || '');
  };

  const handleSaveUser = async () => {
     try {
        await updateDoc(doc(db, 'users', editingUser.id), {
           displayName: editName,
           bio: editBio
        });
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, displayName: editName, bio: editBio } : u));
        setEditingUser(null);
     } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.id}`);
     }
  }

  const handleToggleFreeze = async (user: any) => {
     if(!window.confirm(`Are you sure you want to ${user.isFrozen ? 'unfreeze' : 'freeze (block)'} this account?`)) return;
     try {
        await updateDoc(doc(db, 'users', user.id), {
           isFrozen: !user.isFrozen
        });
        setUsers(users.map(u => u.id === user.id ? { ...u, isFrozen: !user.isFrozen } : u));
     } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
     }
  }

  const handleEditPost = (post: any) => {
     setEditingPost(post);
     setEditPostContent(post.content);
  };

  const handleSavePost = async () => {
     try {
        await updateDoc(doc(db, 'posts', editingPost.id), {
           content: editPostContent
        });
        setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: editPostContent } : p));
        setEditingPost(null);
     } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `posts/${editingPost.id}`);
     }
  }

  const handleUpdateConfig = async () => {
    setIsUpdatingConfig(true);
    try {
      await setDoc(doc(db, 'appConfig', 'general'), {
        version: appVersion,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      alert('App config updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Update failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdatingConfig(false);
    }
  }

  const navItems: { id: typeof activeTab, label: string, icon: any, badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'kyc', label: 'Verification', icon: Shield, badge: kycPending.length },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Content', icon: FileText },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: reports.length },
    { id: 'app', label: 'Settings', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-teal-900 px-4 py-4 sticky top-0 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Shield className="text-white" size={18} />
            </div>
            <h1 className="text-white font-black uppercase tracking-widest text-[10px]">Admin Board</h1>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl text-white">
              <ChevronLeft size={20} />
           </button>
            <div className="relative">
               <button 
                 onClick={() => setShowNavMenu(!showNavMenu)}
                 className="p-2 bg-white/10 rounded-xl text-white transition-all active:scale-95"
               >
                  <MoreVertical size={20} />
               </button>
               
               <AnimatePresence>
                 {showNavMenu && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.95, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95, y: 10 }}
                     className="absolute right-0 top-12 w-48 bg-white rounded-3xl shadow-2xl py-3 z-[100] border border-gray-50 overflow-hidden"
                   >
                      {navItems.map(item => (
                        <button 
                           key={item.id}
                           onClick={() => { setActiveTab(item.id); setShowNavMenu(false); }}
                           className={cn(
                             "w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors",
                             activeTab === item.id ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:bg-gray-50"
                           )}
                        >
                           <item.icon size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                      ))}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen flex-shrink-0">
         <div className="p-8 border-b border-gray-50">
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-teal-900/20">
                  <Shield className="text-white" size={20} />
               </div>
               <div>
                  <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">Panel</h1>
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest leading-none">Internal</p>
               </div>
            </div>
         </div>

         <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group",
                    activeTab === item.id 
                      ? "bg-teal-50 text-teal-700 shadow-sm" 
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  )}
               >
                  <div className="flex items-center space-x-3">
                     <item.icon size={18} className={cn("transition-colors", activeTab === item.id ? "text-teal-600" : "text-gray-400 group-hover:text-gray-600")} />
                     <span className="text-xs font-black uppercase tracking-[0.1em]">{item.label}</span>
                  </div>
                  {item.badge ? (
                     <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black", activeTab === item.id ? "bg-teal-200 text-teal-800" : "bg-gray-100 text-gray-400")}>
                        {item.badge}
                     </span>
                  ) : null}
               </button>
            ))}
         </nav>

         <div className="p-6">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center space-x-2 p-4 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all font-black uppercase tracking-widest text-[10px]"
            >
               <ChevronLeft size={14} />
               <span>Exit</span>
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:flex bg-white h-20 border-b border-gray-100 items-center justify-between px-10 flex-shrink-0">
           <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">
              Management / <span className="text-gray-900">{activeTab}</span>
           </h2>
           <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-2xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">System Active</span>
               </div>
               
               <div className="relative">
                  <button 
                    onClick={() => setShowNavMenu(!showNavMenu)}
                    className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-teal-600 hover:border-teal-100 transition-all shadow-sm"
                  >
                     <MoreVertical size={18} />
                  </button>
                  
                  <AnimatePresence>
                    {showNavMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-3 w-64 bg-white rounded-[2.5rem] shadow-2xl border border-gray-50 z-[100] py-4 overflow-hidden"
                      >
                         <div className="px-6 py-2 mb-2">
                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">Quick Navigation</p>
                         </div>
                         {navItems.map(item => (
                           <button 
                              key={item.id}
                              onClick={() => { setActiveTab(item.id); setShowNavMenu(false); }}
                              className={cn(
                                "w-full flex items-center space-x-4 px-6 py-3.5 transition-colors",
                                activeTab === item.id ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:bg-gray-50"
                              )}
                           >
                              <item.icon size={16} />
                              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                           </button>
                         ))}
                         <div className="h-px bg-gray-50 mx-6 my-3" />
                         <button onClick={async () => {
                            const action = engineStatus?.isRunning ? 'stop' : 'start';
                            try {
                                const response = await fetch(`/api/engagement/${action}`, { method: 'POST' });
                                if (response.ok) {
                                    const res = await fetch('/api/engagement/status');
                                    if (res.ok) setEngineStatus(await res.json());
                                }
                            } catch (e) {
                                console.error(e);
                            }
                         }} className="w-full flex items-center space-x-4 px-6 py-3.5 text-gray-500 hover:bg-gray-50 transition-colors">
                            <Activity size={16} className={cn(engineStatus?.isRunning ? "text-green-500" : "text-gray-300")} />
                            <span className="text-[11px] font-black uppercase tracking-widest">{engineStatus?.isRunning ? 'Engine Running' : 'Engine Idle'}</span>
                         </button>
                         <button onClick={() => navigate('/')} className="w-full flex items-center space-x-4 px-6 py-3.5 text-gray-400 hover:bg-gray-50 transition-colors">
                            <ChevronLeft size={16} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Exit Admin</span>
                         </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
           </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-10 pb-24 md:pb-10">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
                {/* Specific Tab Content will go here */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm transition-all hover:shadow-lg">
                                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                                    <Users className="text-teal-600" size={24} />
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">{users.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Users</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm transition-all hover:shadow-lg">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                    <FileText className="text-blue-600" size={24} />
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">{posts.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Posts</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm transition-all hover:shadow-lg">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                                    <AlertTriangle className="text-orange-600" size={24} />
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">{reports.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Reports</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm transition-all hover:shadow-lg">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                                    <Database className="text-purple-600" size={24} />
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">{users.filter(u => u.isVerified).length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Verified</p>
                            </div>
                        </div>
                    </div>
                )}


                {/* Removed Engagement Tab Content */}
                
                {/* Removed App Tab Content */}


                                    

                                    

                {activeTab === 'kyc' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Identity Verification</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pending Compliance Review</p>
                            </div>
                            <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                                <Shield size={12} />
                                <span>{kycPending.length} Urgent</span>
                            </div>
                        </div>

                        {kycPending.length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-50">
                                <div className="w-20 h-20 bg-teal-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                    <Shield size={40} className="text-teal-600" />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 uppercase">All Clear</h4>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">No pending identity checks</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {kycPending.map(u => (
                                    <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm space-y-6">
                                        <div className="flex items-center space-x-4">
                                            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} alt="" className="w-16 h-16 rounded-[1.5rem] object-cover" />
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{u.displayName}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.email}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">ID Document</p>
                                                <img src={u.kycDocuments?.idCardUrl} alt="ID" className="w-full h-40 rounded-[2rem] object-cover bg-gray-50 border border-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Verification Selfie</p>
                                                <img src={u.kycDocuments?.selfieUrl} alt="Selfie" className="w-full h-40 rounded-[2rem] object-cover bg-gray-50 border border-gray-50" />
                                            </div>
                                        </div>

                                        <div className="flex space-x-3 pt-4">
                                            <button 
                                                onClick={() => handleApproveKYC(u.id)}
                                                className="flex-1 bg-teal-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-900/10 active:scale-95 transition-all"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handleRejectKYC(u.id)}
                                                className="flex-1 bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

        {activeTab === 'reports' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase">Conflict Reports</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Platform Integrity Watch</p>
                    </div>
                </div>

                {reports.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-50">
                        <div className="w-20 h-20 bg-teal-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="text-teal-600" size={40} />
                        </div>
                        <h4 className="text-lg font-black text-gray-900 uppercase">Clear Horizon</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">No active reports filed</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reports.map(report => (
                            <div key={report.id} className="bg-white p-8 rounded-[3rem] border border-red-50 shadow-sm space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                                            <AlertCircle className="text-red-500" size={20} />
                                        </div>
                                        <div>
                                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {report.type || 'Violation'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <p className="text-sm font-medium text-gray-800 leading-relaxed bg-gray-50/50 p-6 rounded-[2rem] border border-gray-50/50 italic">
                                    "{report.details}"
                                </p>

                                <div className="space-y-3 pt-2 text-[10px] font-bold uppercase tracking-widest">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <span className="text-gray-400">Reporter</span>
                                        <span className="text-gray-900">{report.reporterEmail}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <span className="text-gray-400">Target Resource</span>
                                        <span className="text-teal-600 font-mono tracking-normal">{report.targetId || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'users' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase">Citizen Directory</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">User Governance Control</p>
                    </div>
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Find user..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border-gray-100 rounded-full px-6 py-3 text-xs font-black focus:ring-4 focus:ring-teal-50 transition-all w-64 shadow-sm"
                        />
                        <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {users.filter(u => 
                        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(u => (
                        <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm flex items-center justify-between group hover:border-teal-100 transition-all relative">
                            <div className="flex items-center space-x-5">
                                <div className="relative">
                                    <img 
                                        src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                                        alt="" 
                                        className="w-16 h-16 rounded-[1.5rem] object-cover group-hover:scale-105 transition-transform" 
                                    />
                                    {u.isVerified && (
                                        <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1 rounded-full border-4 border-white">
                                            <ShieldCheck size={12} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900">
                                        {u.displayName}
                                        {u.isFrozen && (
                                            <span className="ml-3 text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-full uppercase tracking-widest align-middle">Blocked</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{u.email}</p>
                                </div>
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => setActiveMenu(activeMenu?.id === u.id ? null : { type: 'user', id: u.id })}
                                    className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-teal-50 hover:text-teal-600 transition-all"
                                >
                                    < MoreVertical size={18} />
                                </button>
                                
                                <AnimatePresence>
                                    {activeMenu?.id === u.id && activeMenu.type === 'user' && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            className="absolute right-0 mt-3 w-56 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-50 z-50 overflow-hidden py-3"
                                        >
                                            <button onClick={() => { handleEditUser(u); setActiveMenu(null); }} className="w-full flex items-center space-x-3 px-6 py-4 hover:bg-gray-50 text-gray-600 transition-colors">
                                                <Edit2 size={16} className="text-teal-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Modify Details</span>
                                            </button>
                                            <button onClick={() => { handleToggleFreeze(u); setActiveMenu(null); }} className="w-full flex items-center space-x-3 px-6 py-4 hover:bg-gray-50 text-gray-600 transition-colors">
                                                {u.isFrozen ? <Unlock size={16} className="text-orange-500" /> : <Lock size={16} className="text-orange-500" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{u.isFrozen ? 'Release Block' : 'Initiate Block'}</span>
                                            </button>
                                            <div className="h-px bg-gray-50 mx-4 my-2" />
                                            <button onClick={() => { handleDeleteUser(u.id); setActiveMenu(null); }} className="w-full flex items-center space-x-3 px-6 py-4 hover:bg-red-50 text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Purge Account</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'posts' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase">Stream Oversight</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Real-time Content Management</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map(p => (
                        <div key={p.id} className="bg-white p-6 rounded-[3rem] border border-gray-50 shadow-sm space-y-6 flex flex-col relative group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center">
                                        <div className="w-6 h-6 bg-teal-600 rounded-lg" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-teal-900 uppercase tracking-widest truncate">{p.authorId}</p>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase">Post ID: {p.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveMenu(activeMenu?.id === p.id ? null : { type: 'post', id: p.id })}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-teal-50 hover:text-teal-600 rounded-xl transition-all"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                    
                                    <AnimatePresence>
                                        {activeMenu?.id === p.id && activeMenu.type === 'post' && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className="absolute right-0 mt-3 w-48 bg-white rounded-[1.5rem] shadow-2xl border border-gray-50 z-50 overflow-hidden py-2"
                                            >
                                                <button onClick={() => { handleEditPost(p); setActiveMenu(null); }} className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-gray-50 text-gray-600 transition-colors">
                                                    <Edit2 size={14} className="text-teal-600" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Edit Payload</span>
                                                </button>
                                                <div className="h-px bg-gray-50 mx-3 my-1" />
                                                <button onClick={() => { handleDeletePost(p.id); setActiveMenu(null); }} className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-red-50 text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Delete Data</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                {p.imageUrl && (
                                    <img src={p.imageUrl} alt="" className="w-full h-48 rounded-[2rem] object-cover bg-gray-50 border border-gray-50 shadow-inner" />
                                )}
                                <p className="text-sm font-medium text-gray-700 leading-relaxed line-clamp-4">
                                    {p.content}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                        <Heart size={12} className="text-red-400" />
                                        <span className="text-[10px] font-black text-gray-400 tracking-widest">{p.likesCount || 0}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <MessageCircle size={12} className="text-teal-400" />
                                        <span className="text-[10px] font-black text-gray-400 tracking-widest">{p.commentsCount || 0}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleWave(p.id)}
                                    className="px-4 py-2 bg-teal-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    Boost Wave
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
             </motion.div>
           </AnimatePresence>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
              <h2 className="text-lg font-black text-gray-800 mb-4 text-center">Edit User</h2>
              <div className="space-y-3">
                 <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Display Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-teal-100 transition-all"
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Bio</label>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full h-20 bg-gray-50 border-none rounded-xl p-3 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-teal-100 resize-none transition-all"
                    ></textarea>
                 </div>
              </div>
              <div className="mt-6 flex space-x-2">
                 <button onClick={() => setEditingUser(null)} className="flex-1 py-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                    Cancel
                 </button>
                 <button onClick={handleSaveUser} className="flex-1 py-3 text-[9px] font-bold text-white bg-teal-600 hover:bg-teal-700 uppercase tracking-widest rounded-xl transition-all flex justify-center items-center">
                    Save
                 </button>
              </div>
           </div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
              <h2 className="text-lg font-black text-gray-800 mb-4 text-center">Edit Post</h2>
              <div className="space-y-3">
                 <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Content</label>
                    <textarea 
                      value={editPostContent}
                      onChange={(e) => setEditPostContent(e.target.value)}
                      className="w-full h-24 bg-gray-50 border-none rounded-xl p-3 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-teal-100 resize-none transition-all"
                    ></textarea>
                 </div>
              </div>
              <div className="mt-6 flex space-x-2">
                 <button onClick={() => setEditingPost(null)} className="flex-1 py-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                    Cancel
                 </button>
                 <button onClick={handleSavePost} className="flex-1 py-3 text-[9px] font-bold text-white bg-teal-600 hover:bg-teal-700 uppercase tracking-widest rounded-xl transition-all flex justify-center items-center">
                    Save
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
