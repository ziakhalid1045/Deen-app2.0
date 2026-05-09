import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, CheckCircle2, ChevronLeft, RefreshCcw, Lock } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      await sendPasswordResetEmail(auth, email);
      setMessage('A password reset link has been sent to your email.');
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto relative shadow-2xl bg-gradient-to-br from-[#0f4945] to-[#042F2E] justify-center p-6 overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

      <div className="relative z-10">
        <button 
          onClick={() => navigate('/login')}
          className="mb-8 text-teal-200 hover:text-white flex items-center space-x-1 font-medium transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back to Login</span>
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/20 shadow-2xl flex items-center justify-center mb-6">
             <Lock className="text-white" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Reset Password</h1>
          <p className="text-teal-100/70 text-sm px-4">
            Enter your email to receive a secure reset link. 
            <br />
            <span className="text-[10px] opacity-60">Google users can use this to set a manual password.</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-xs text-center p-3 rounded-xl mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-teal-500/20 border border-teal-500/30 text-teal-100 text-xs text-center p-3 rounded-xl mb-4 backdrop-blur-sm flex items-center justify-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-teal-200" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border border-teal-500/30 text-white placeholder-teal-200 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-3.5 backdrop-blur-sm"
              placeholder="Enter your email"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-teal-500 text-white py-3.5 px-6 rounded-xl font-bold text-[15px] shadow-lg hover:bg-teal-600 transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? (
              <RefreshCcw className="animate-spin" size={20} />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
