import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ChevronLeft, UserMinus, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BlockedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blockedList, setBlockedList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'blockedUsers'), (snapshot) => {
      setBlockedList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user]);

  const unblockUser = async (blockedId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'blockedUsers', blockedId));
      alert("User unblocked.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen -mx-4 -mb-4 bg-[#F8FAFC]">
      <div className="bg-[#115E59] py-4 px-4 flex items-center space-x-4 text-white sticky top-0 z-50 rounded-b-3xl shadow-lg">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold">Blocked Users</h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-2 mb-2">Users you have restricted</p>
        
        {blockedList.length > 0 ? (
          blockedList.map(blocked => (
            <div key={blocked.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <img 
                  src={`https://ui-avatars.com/api/?name=${blocked.displayName}&background=random`} 
                  alt={blocked.displayName} 
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-sm font-bold text-gray-900">{blocked.displayName}</span>
              </div>
              <button 
                onClick={() => unblockUser(blocked.id)}
                className="bg-gray-50 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all flex items-center space-x-2"
              >
                <UserMinus size={14} />
                <span>Unblock</span>
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white/50 border border-dashed border-gray-200 rounded-3xl flex flex-col items-center">
            <ShieldAlert size={32} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium italic">You haven't blocked anyone.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedUsers;
