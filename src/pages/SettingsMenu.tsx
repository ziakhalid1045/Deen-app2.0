import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, 
  ShieldAlert, 
  BarChart3, 
  ShieldCheck, 
  Lock, 
  Edit2, 
  Globe, 
  Info, 
  Flag, 
  Smartphone,
  Download,
  LogOut,
  Settings as SettingsIcon,
  HelpCircle,
  Share2,
  LockKeyhole,
  AlertTriangle,
  User,
  Mail,
  Check
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { requestNotificationPermission } from '../lib/notifications';
import { Bell } from 'lucide-react';

const SettingsMenu = () => {
  const { profile, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [privacyLoading, setPrivacyLoading] = React.useState(false);
  const [showLangModal, setShowLangModal] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [appConfig, setAppConfig] = React.useState<any>(null);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'appConfig', 'general'), (d) => {
      if (d.exists()) setAppConfig(d.data());
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      console.error("Logout failed:", err);
      navigate('/login');
    }
  };

  const handleTogglePrivacy = async () => {
    if (!profile) return;
    setPrivacyLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        isPrivate: !profile.isPrivate,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      alert('Notifications enabled! You will now receive important updates.');
    } else {
      alert('Permission denied or FCM not supported in this browser tab.');
    }
  };

  const isDeveloper = currentUser?.email === 'ziakhalid1614@gmail.com';

  const menuGroups = [
    {
      title: "Account",
      items: [
        { icon: <User size={18} className="text-teal-600" />, label: "Edit Profile", desc: "Change your name, bio, and photos", onClick: () => navigate('/profile/edit') },
      ]
    },
    {
      title: "Creator Tools",
      items: [
        { icon: <BarChart3 size={18} className="text-purple-500" />, label: "Creator Studio", desc: "View analytics and insights", onClick: () => navigate('/studio') },
        ...(isDeveloper ? [{ icon: <ShieldAlert size={18} className="text-red-500" />, label: "Admin Panel", desc: "Platform management tools", onClick: () => navigate('/admin') }] : []),
      ]
    },
    {
      title: "Privacy & Safety",
      items: [
        { 
          icon: <Lock size={18} className={cn(profile?.isPrivate ? "text-teal-600" : "text-gray-400")} />, 
          label: "Private Account", 
          desc: "Only approved followers see your content", 
          isToggle: true, 
          toggled: profile?.isPrivate,
          onClick: handleTogglePrivacy,
          loading: privacyLoading
        },
        { icon: <Bell size={18} className="text-amber-500" />, label: "Push Notifications", desc: "Get real-time updates and messages", onClick: handleEnableNotifications },
        { icon: <LockKeyhole size={18} className="text-gray-400" />, label: "Blocked Users", desc: "Manage accounts you've restricted", onClick: () => navigate('/profile/blocked') },
      ]
    },
    {
      title: "General",
      items: [
        { icon: <Globe size={18} className="text-sky-500" />, label: "Language", desc: "Choose your preferred interface language", onClick: () => setShowLangModal(true) },
        { icon: <Download size={18} className="text-green-600" />, label: "Install App", desc: "Add to home screen for better experience", onClick: () => alert('Please use your browser menu to "Install" or "Add to Home Screen".') },
        { icon: <Share2 size={18} className="text-indigo-500" />, label: "Invite Friends", desc: "Share the community with others", onClick: () => { 
          if(navigator.share) {
            navigator.share({ 
              title: 'Join Deen App', 
              url: window.location.origin 
            }).catch(err => {
              if (err.name !== 'AbortError') console.error('Share failed:', err);
            });
          } else {
            navigator.clipboard.writeText(window.location.origin);
            alert('Invite link copied to clipboard!');
          }
        } },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: <HelpCircle size={18} className="text-orange-500" />, label: "Help & Support", desc: "FAQs and contact support", onClick: () => window.open('https://deenapp.com/help', '_blank') },
        { icon: <Flag size={18} className="text-yellow-500" />, label: "Report a Problem", desc: "Let us know if something is broken", onClick: () => navigate('/report-issue') },
        { icon: <Info size={18} className="text-gray-500" />, label: "About Platform", desc: "Terms, privacy policy and version", onClick: () => alert('Deen App v1.0.0 - A global community for reflection.') },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-4 py-4 flex items-center border-b border-gray-100 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-500 hover:text-teal-900 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="ml-2 text-sm font-black text-gray-900 uppercase tracking-widest">Platform Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <h3 className="px-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{group.title}</h3>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              {group.items.map((item, iIdx) => (
                <div 
                  key={iIdx}
                  onClick={item.isToggle ? undefined : item.onClick}
                  className={cn(
                    "w-full flex items-center justify-between p-4 transition-all active:bg-gray-50",
                    iIdx !== group.items.length - 1 && "border-b border-gray-50",
                    !item.isToggle && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div className={cn(
                      "p-2.5 rounded-2xl bg-gray-50 border border-gray-100",
                      item.highlight && "bg-amber-50 border-amber-100 animate-pulse"
                    )}>
                      {item.icon}
                    </div>
                    <div>
                      <p className={cn("text-[11px] font-black uppercase tracking-widest text-gray-800")}>{item.label}</p>
                      <p className="text-[9px] text-gray-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                  
                  {item.isToggle ? (
                    <button 
                      onClick={item.onClick}
                      disabled={item.loading}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all duration-300",
                        item.toggled ? "bg-teal-500" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform duration-300 shadow-md",
                        item.toggled ? "translate-x-5.5" : "translate-x-1"
                      )}></div>
                    </button>
                  ) : (
                    <ChevronLeft size={14} className="text-gray-300 rotate-180" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="pt-4 space-y-3">

          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-red-50 text-red-600 py-4 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 shadow-sm active:scale-95 transition-all"
          >
            <LogOut size={16} />
            <span>Terminate Session</span>
          </button>
          
          <button 
            onClick={async () => {
              if (window.confirm('CRITICAL: Are you sure you want to delete your account? This will permanently remove your profile data. (Note: Auth account deletion requires re-authentication, we will only remove the profile for now)')) {
                try {
                  const uid = currentUser?.uid;
                  if (!uid) return;
                  await deleteDoc(doc(db, 'users', uid));
                  await signOut(auth);
                  navigate('/login');
                } catch (err) {
                  handleFirestoreError(err, OperationType.DELETE, `users/${currentUser?.uid}`);
                }
              }
            }}
            className="w-full text-red-400 py-4 text-[10px] font-black uppercase tracking-widest hover:text-red-600 transition-all"
          >
            Delete Profile Account
          </button>
          
          <p className="text-center mt-6 text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">Deen App v1.0.0 (Beta)</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center border border-white/20"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <LogOut className="text-red-500" size={32} />
              </div>
              <h2 className="text-sm font-black text-gray-900 mb-3 uppercase tracking-[0.2em]">Terminate Session?</h2>
              <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest mb-8 px-4">
                Are you sure you want to logout? You will need to re-authenticate to access your profile.
              </p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={handleLogout}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  Confirm Logout
                </button>
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Language Modal */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative border border-white/20">
              <h2 className="text-sm font-black text-gray-800 mb-6 text-center uppercase tracking-widest">Select Language</h2>
              <div className="space-y-2">
                 {[
                   { id: 'en', label: 'English (US)', dir: 'ltr' },
                   { id: 'ur', label: 'Urdu (اردو)', dir: 'rtl' },
                   { id: 'ar', label: 'Arabic (العربية)', dir: 'rtl' }
                 ].map(lang => {
                    const currentLang = localStorage.getItem('language') || 'en';
                    const isActive = currentLang === lang.id;
                    return (
                       <button 
                         key={lang.id}
                         onClick={() => { 
                            localStorage.setItem('language', lang.id);
                            document.documentElement.dir = lang.dir;
                            setShowLangModal(false); 
                            window.location.reload();
                         }} 
                         className={cn(
                           "w-full flex justify-between items-center p-4 rounded-2xl transition-all",
                           isActive ? "bg-teal-50 border border-teal-200" : "hover:bg-gray-50 border border-gray-100 bg-white"
                         )}
                       >
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-teal-800" : "text-gray-700")}>{lang.label}</span>
                          {isActive && <Check size={14} className="text-teal-600" />}
                       </button>
                    )
                 })}
              </div>
              <button 
                onClick={() => setShowLangModal(false)}
                className="mt-6 w-full py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all border border-gray-100 rounded-2xl"
              >
                 Dismiss
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
