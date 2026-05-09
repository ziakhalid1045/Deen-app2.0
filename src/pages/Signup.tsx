import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Home, Mail, Lock } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Setup initial profile
      const newProfile = {
        uid: user.uid,
        email: user.email,
        displayName: name || 'Anonymous Seeker',
        bio: 'Assalamu Alaikum! I am using Deen App.',
        createdAt: new Date(),
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        photoURL: '',
        country: 'Unknown'
      };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      navigate('/'); // Redirect to home on success
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address provided is invalid.');
      } else {
        setError('An unexpected signup error occurred. Please try again.');
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
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Create Account</h1>
        <p className="text-teal-100/90 text-sm font-medium px-4">
          Join the community and share beautiful reflections.
        </p>
      </div>

      {/* Form Section */}
      <div className="w-full max-w-sm mx-auto relative z-10">
        <form onSubmit={handleEmailSignup} className="space-y-4 mb-4">
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
               <Home className="h-5 w-5 text-teal-200" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border border-teal-500/30 text-white placeholder-teal-200 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-3.5 backdrop-blur-sm"
              placeholder="Display Name"
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
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-teal-500 text-white py-3.5 px-6 rounded-xl font-bold text-[15px] shadow-lg hover:bg-teal-600 transition-all active:scale-[0.98] flex items-center justify-center relative"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
               "Sign up with Email"
            )}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-xs text-center p-3 rounded-xl mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="text-center text-teal-100/70 text-xs mt-6">
          Already have an account? <Link to="/login" className="text-white font-bold hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
