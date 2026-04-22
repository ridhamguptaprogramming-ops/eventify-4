import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, LogOut, Shield, Calendar, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signOut } from '../lib/firebase';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

function getLoginErrorMessage(code?: string) {
  switch (code) {
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Trying redirect login...';
    case 'auth/popup-closed-by-user':
      return 'Login popup was closed before completing sign-in.';
    case 'auth/cancelled-popup-request':
      return 'A login request is already in progress. Please try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication.';
    case 'auth/unauthorized-domain':
      return `This domain is not authorized in Firebase Authentication. Add ${window.location.hostname} to Authorized domains.`;
    default:
      return 'Login failed. Please try again.';
  }
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginInProgressRef = useRef(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    if (loginInProgressRef.current) {
      toast.info('Login is already in progress.');
      return;
    }

    loginInProgressRef.current = true;
    setIsLoggingIn(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/cancelled-popup-request') {
        toast.info('Login is already in progress.');
        return;
      }

      if (code === 'auth/popup-blocked') {
        toast.info(getLoginErrorMessage(code));
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          const redirectCode = (redirectError as { code?: string })?.code;
          console.error('Redirect login error:', redirectError);
          toast.error(getLoginErrorMessage(redirectCode));
          return;
        }
      }
      console.error('Login error:', error);
      toast.error(getLoginErrorMessage(code));
    } finally {
      loginInProgressRef.current = false;
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleShareApp = async () => {
    const shareUrl = `${window.location.origin}/`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Esoteric Hub',
          text: 'Check out Esoteric Hub',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success('App link copied. Share it with others!');
    } catch (error) {
      const errorName = (error as { name?: string })?.name;
      if (errorName === 'AbortError') {
        return;
      }

      console.error('Failed to share app link:', error);
      toast.error('Failed to share app link.');
    }
  };

  const getNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `transition-colors ${isActive ? 'text-indigo-300' : 'text-white/80 hover:text-white'}`;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/10 backdrop-blur-xl border-b border-white/20 py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">Esoteric Hub</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" className={getNavLinkClasses}>Home</NavLink>
          <NavLink to="/events" className={getNavLinkClasses}>Events</NavLink>
          <NavLink to="/event-highlights" className={getNavLinkClasses}>Highlights</NavLink>
          <NavLink to="/about" className={getNavLinkClasses}>About</NavLink>
  
          {user ? (
            <>
              <NavLink to="/dashboard" className={getNavLinkClasses}>Dashboard</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Shield size={16} /> Admin
                </NavLink>
              )}
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/20" />
                  <span className="text-sm font-medium text-white/90">{user.displayName}</span>
                </div>
                <button onClick={handleLogout} className="p-2 text-white/60 hover:text-white transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20 ${
                isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-500'
              }`}
            >
              <LogIn size={18} /> {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex flex-col gap-4 md:hidden"
          >
            <NavLink to="/" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">Home</NavLink>
            <NavLink to="/events" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">Events</NavLink>
            <NavLink to="/event-highlights" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">Highlights</NavLink>
            <NavLink to="/about" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">About</NavLink>
            <NavLink to="/help" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">Contact Support</NavLink>
            <button onClick={handleShareApp} className="flex items-center gap-2 text-lg text-white/80 py-2">
              <Share2 size={18} /> Share App
            </button>
            {user ? (
              <>
                <NavLink to="/dashboard" onClick={() => setIsOpen(false)} className="text-lg text-white/80 py-2">Dashboard</NavLink>
                {isAdmin && <NavLink to="/admin" onClick={() => setIsOpen(false)} className="text-lg text-indigo-400 py-2">Admin Panel</NavLink>}
                <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 py-2">
                  <LogOut size={20} /> Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium ${
                  isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <LogIn size={18} /> {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
