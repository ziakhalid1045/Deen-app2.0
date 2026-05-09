import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, User, MessageCircle, Search, Plus, RefreshCw, ChevronUp, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  noHeader?: boolean;
  noPadding?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showBottomNav = true, noHeader = false, noPadding = false }) => {
  const { user, profile, unreadNotifications, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);

  const isDeveloper = user?.email === 'ziakhalid1614@gmail.com';
  const isVerified = user?.emailVerified || isDeveloper || profile?.isManuallyVerified;

  const [showTopBar, setShowTopBar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    if (currentScrollY > lastScrollY && currentScrollY > 60) {
      // scrolling down
      setShowTopBar(false);
    } else if (currentScrollY < lastScrollY) {
      // scrolling up
      setShowTopBar(true);
    }
    
    setLastScrollY(currentScrollY);
  };

  const scrollToTopAndRefresh = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (lastScrollY === 0) {
       window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 max-w-md mx-auto relative shadow-xl overflow-hidden font-sans">
      {/* Verification Banner Removed for Testing */}

      {/* Header */}
      {!noHeader && (
        <header className={cn(
          "absolute top-0 left-0 w-full z-20 transition-transform duration-300 bg-[#075e54] pb-4 pt-3 px-4 shadow-xl",
          showTopBar ? "translate-y-0" : "-translate-y-full"
        )}>
          {/* Islamic pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/islamic-art.png')] pointer-events-none"></div>
          
          <div className="relative flex items-center justify-between z-10">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={scrollToTopAndRefresh}>
               <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <div className="w-4 h-4 rounded-sm border-2 border-white rotate-45"></div>
               </div>
               <h1 className="text-white text-xl font-black tracking-tighter">DEEN</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate('/search')} className="text-teal-100 hover:text-white p-1 rounded-full transition-colors">
                 <Search size={18} />
              </button>
              <button onClick={scrollToTopAndRefresh} className="text-teal-100 hover:text-white p-1 rounded-full transition-colors">
                 <RefreshCw size={18} />
              </button>
              <div className="relative cursor-pointer" onClick={() => navigate('/profile')}>
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full border border-white/20 object-cover shadow-md"
                />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto bg-[#F8FAFC]",
          !noHeader && "pt-20",
          !noPadding && "px-4",
          showBottomNav ? "pb-20" : "pb-4"
        )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center py-1 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-50 rounded-t-[1.2rem]">
          <NavItem to="/" icon={<Home size={20} />} label="Home" onClick={() => { if(location.pathname === '/') scrollToTopAndRefresh(); }} />
          <NavItem to="/shorts" icon={<Play size={20} />} label="Shorts" />
          
          {/* Central Plus Button - Always accessible for testing */}
          <NavLink 
            to="/upload" 
            className={({ isActive }) => cn(
              "flex items-center justify-center -mt-5 w-11 h-11 rounded-[0.9rem] shadow-xl transition-all duration-300 transform active:scale-90",
              isActive 
                ? "bg-[#115E59] text-white rotate-45" 
                : "bg-teal-700 text-white hover:bg-teal-900 shadow-teal-900/20 shadow-xl"
            )}
          >
            <div className={cn("transition-all duration-500", location.pathname === '/upload' ? "rotate-0" : "rotate-0")}>
              <Plus size={24} strokeWidth={2.5} />
            </div>
          </NavLink>

          <NavItem to="/notifications" icon={<Bell size={20} />} label="Updates" badge={unreadNotifications > 0 ? unreadNotifications : undefined} />
          <NavItem to="/profile" icon={<User size={20} />} label="Profile" />
        </nav>
      )}
    </div>
  );
};

const NavItem = ({ to, icon, label, badge, onClick }: { to: string, icon: React.ReactNode, label: string, badge?: number, onClick?: () => void }) => {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex flex-col items-center justify-center w-12 h-10 transition-all duration-300",
        isActive ? "text-[#115E59]" : "text-gray-400 hover:text-teal-700 active:scale-95"
      )}
    >
      {({ isActive }) => (
        <>
          <div className="relative flex-shrink-0">
            <div className={cn("transition-transform duration-300", isActive && "scale-110")}>
               {icon}
            </div>
            {badge ? (
              <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">
                {badge}
              </span>
            ) : null}
          </div>
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest transition-all mt-0.5",
            isActive ? "opacity-100" : "opacity-0 absolute translate-y-2"
          )}>{label}</span>
        </>
      )}
    </NavLink>
  );
};

export default Layout;
