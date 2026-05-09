import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Home, Mail, Lock, Smartphone } from 'lucide-react'; 
import { onSnapshot, doc } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<any>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'appConfig', 'general'), (d) => {
      if (d.exists()) setAppConfig(d.data());
    });
    return () => unsub();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      setMessage('');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please double-check your credentials.');
      } else if (err.code === 'auth/internal-error' || err.message.includes('-26')) {
        setError('Firebase Auth Error. Please check domain configuration.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Incorrect email or password.');
      } else {
        setError('An unexpected login error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto relative shadow-2xl bg-gradient-to-br from-[#0f4945] to-[#042F2E] justify-center p-6 overflow-hidden font-sans">
      {/* Background Ornaments */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

      {/* Top Section */}
      <div className="flex flex-col items-center text-center relative z-10 w-full max-w-sm mx-auto mb-8">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/20 shadow-2xl flex items-center justify-center mb-6">
           <Home className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
        <p className="text-teal-100/90 text-sm font-medium px-4">
          Log in peacefully without worldly distractions.
        </p>
      </div>

      {/* Form Section */}
      <div className="w-full max-w-sm mx-auto relative z-10">
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-teal-200" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border border-teal-500/30 text-white placeholder-teal-200 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-3.5 backdrop-blur-sm"
              placeholder="Email address"
              required
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-teal-200" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/10 border border-teal-500/30 text-white placeholder-teal-200 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-3.5 backdrop-blur-sm"
              placeholder="Password"
              required
            />
          </div>
          <div className="flex justify-end mb-2">
            <Link
              to="/forgot-password"
              className="text-teal-200 text-xs font-medium hover:text-white"
            >
              Forgot Password?
            </Link>
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-teal-500 text-white py-3.5 px-6 rounded-xl font-bold text-[15px] shadow-lg hover:bg-teal-600 transition-all active:scale-[0.98] flex items-center justify-center relative"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
               "Log in with Email"
            )}
          </button>
        </form>

        {message && (
          <div className="bg-teal-500/20 border border-teal-500/30 text-teal-100 text-xs text-center p-3 rounded-xl mb-4 backdrop-blur-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-xs text-center p-3 rounded-xl mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="text-center text-teal-100/70 text-xs mt-6">
          Don't have an account? <Link to="/signup" className="text-white font-bold hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
