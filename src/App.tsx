import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UploadProvider } from './context/UploadContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Inbox from './pages/Inbox';
import Friends from './pages/Friends';
import Search from './pages/Search';
import UploadPost from './pages/UploadPost';
import PostDetail from './pages/PostDetail';
import EditProfile from './pages/EditProfile';
import BlockedUsers from './pages/BlockedUsers';
import Quiz from './pages/Quiz';
import AdminPanel from './pages/AdminPanel';
import Verification from './pages/Verification';
import Studio from './pages/Studio';
import Shorts from './pages/Shorts';
import SettingsMenu from './pages/SettingsMenu';
import Layout from './components/Layout';
import InstallPwa from './components/InstallPwa';

import ChatDetail from './pages/ChatDetail';
import ForgotPassword from './pages/ForgotPassword';

import { UploadProgressOverlay } from './components/UploadProgressOverlay';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // or a loading spinner
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

function App() {
  React.useEffect(() => {
    const lang = localStorage.getItem('language') || 'en';
    document.documentElement.dir = (lang === 'ur' || lang === 'ar') ? 'rtl' : 'ltr';
  }, []);

  return (
    <AuthProvider>
      <UploadProvider>
        <Router>
          <InstallPwa />
          <UploadProgressOverlay />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/search" element={
            <ProtectedRoute>
              <Layout>
                <Search />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/shorts" element={
            <ProtectedRoute>
              <Layout showBottomNav={true} noHeader={true} noPadding={true}>
                <Shorts />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/upload" element={
            <ProtectedRoute>
              <Layout showBottomNav={true}>
                <UploadPost />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/post/:postId" element={
            <ProtectedRoute>
              <Layout showBottomNav={false}>
                <PostDetail />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/inbox" element={
            <ProtectedRoute>
              <Layout noHeader={true} noPadding={true}>
                <Inbox />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/studio" element={
            <ProtectedRoute>
              <Layout showBottomNav={false}>
                <Studio />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/chat/:chatId" element={
            <ProtectedRoute>
              <ChatDetail />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Navigate to="/inbox" replace />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsMenu />
            </ProtectedRoute>
          } />

          <Route path="/profile/:userId" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile/edit" element={
            <ProtectedRoute>
              <Layout showBottomNav={false}>
                <EditProfile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile/blocked" element={
            <ProtectedRoute>
              <Layout showBottomNav={false}>
                <BlockedUsers />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/friends" element={
            <ProtectedRoute>
              <Layout>
                <Friends />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/quiz" element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } />

          <Route path="/verification" element={
            <ProtectedRoute>
              <Layout showBottomNav={false}>
                <Verification />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
      </UploadProvider>
    </AuthProvider>
  );
}

export default App;
