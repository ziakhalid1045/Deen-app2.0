import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Upload, CheckCircle2, AlertCircle, Info, BadgeCheck, Clock, Zap } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Verification: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [kycDocs, setKycDocs] = useState({ idCard: '', selfie: '' });

  const handleSubscribe = async () => {
    setIsLoading(true);
    // Mock API call
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/subscription/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.uid, plan: 'monthly' })
      });
      const data = await res.json();
      
      // Update Firestore directly for this demo (normally handled by webhook)
      if (profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), {
          paymentStatus: 'paid',
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isPremium: true
        });
        setStep(2);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKycUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // In a real app, you'd upload to Firebase Storage
      // Here we simulate URLs
      if (profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), {
          kycStatus: 'pending',
          kycDocuments: {
            idCardUrl: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=500&auto=format&fit=crop&q=60',
            selfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60'
          }
        });
        setStep(3);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return null;

  const isVerified = profile.isVerified;
  
  const getDaysLeft = () => {
    if (!profile.subscriptionExpiry) return 0;
    const expiryDate = new Date(profile.subscriptionExpiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#115E59] text-white p-8 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/islamic-art.png')] pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mx-auto mb-4 flex items-center justify-center border border-white/30">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Ummah Verification</h1>
          <p className="text-teal-100/80 text-sm mt-2">Build trust and unlock premium features</p>
        </div>
      </div>

      <div className="px-5 mt-8 space-y-6">
        {isVerified ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-teal-100 text-center space-y-4">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto text-teal-600">
              <BadgeCheck size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">You are Verified!</h2>
            <p className="text-gray-500 text-sm mb-2">Thank you for being a trusted member of our community.</p>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 mt-4">
               <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                 <span>Plan Type:</span>
                 <span className="uppercase tracking-widest text-[#115E59]">
                   {profile.verificationType === 'lifetime' ? 'Lifetime' : 'Standard Subscription'}
                 </span>
               </div>
               {profile.verificationType !== 'lifetime' && (
                 <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                   <span>Remaining Days:</span>
                   <span className="text-teal-600">{getDaysLeft()}</span>
                 </div>
               )}
            </div>

            <div className="pt-4">
              <button onClick={() => navigate('/profile')} className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-teal-900/20 active:scale-95 transition-all">
                Go to Profile
              </button>
            </div>
          </div>
        ) : profile.kycStatus === 'pending' ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-blue-100 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 animate-pulse">
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Review Pending</h2>
            <p className="text-gray-500 text-sm">Your documents have been submitted and are being reviewed by the Deen Team. This usually takes 24-48 hours.</p>
            <button onClick={() => navigate('/')} className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
              Back to Home
            </button>
          </div>
        ) : (
          <>
            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <BadgeCheck className="text-blue-500 mb-2" size={24} />
                <h4 className="text-xs font-bold text-gray-900">Verified Tick</h4>
                <p className="text-[10px] text-gray-400 mt-1">Official badge of trust on your profile</p>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <Zap size={24} className="text-amber-500 mb-2" />
                <h4 className="text-xs font-bold text-gray-900">Premium Rank</h4>
                <p className="text-[10px] text-gray-400 mt-1">Your posts appear higher in the feed</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4"
                  >
                    <div className="flex items-center space-x-3 text-teal-600 mb-2">
                       <CreditCard size={20} />
                       <h3 className="font-bold">Step 1: Subscription</h3>
                    </div>
                    <p className="text-sm text-gray-500">Enable premium features with a monthly subscription of <span className="font-bold text-gray-900">$4.99</span>.</p>
                    <button 
                      onClick={handleSubscribe} 
                      disabled={isLoading}
                      className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-teal-900/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {isLoading ? "Processing..." : (
                        <><span>Subscribe Now</span> <CreditCard size={18} /></>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">Cancel anytime from settings</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4"
                  >
                    <div className="flex items-center space-x-3 text-teal-600 mb-2">
                       <Upload size={20} />
                       <h3 className="font-bold">Step 2: KYC Identity</h3>
                    </div>
                    <p className="text-sm text-gray-500">To maintain community safety, please upload a photo of your ID card and a selfie holding it.</p>
                    
                    <form onSubmit={handleKycUpload} className="space-y-3">
                       <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-teal-300 transition-colors">
                          <Upload className="text-gray-300 mb-2" size={24} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Upload ID Front</span>
                       </div>
                       <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-teal-300 transition-colors">
                          <Upload className="text-gray-300 mb-2" size={24} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Upload Selfie</span>
                       </div>
                       <button 
                         type="submit"
                         disabled={isLoading}
                         className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-teal-900/10 flex items-center justify-center disabled:opacity-50"
                       >
                         {isLoading ? "Uploading..." : "Submit for Review"}
                       </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Verification;
