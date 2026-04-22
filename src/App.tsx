import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import CreateEventPage from './pages/CreateEventPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import PartnershipsPage from './pages/PartnershipsPage';
import EventHighlightsPage from './pages/EventHighlightsPage';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.995 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
};

function AppContent() {
  const location = useLocation();
  const withPageTransition = (page: React.ReactNode) => <PageTransition>{page}</PageTransition>;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-indigo-500/30 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={withPageTransition(<LandingPage />)} />
            <Route path="/events" element={withPageTransition(<EventsPage />)} />
            <Route path="/events/new" element={withPageTransition(<CreateEventPage />)} />
            <Route path="/events/:id" element={withPageTransition(<EventDetailsPage />)} />
            <Route path="/event-highlights" element={withPageTransition(<EventHighlightsPage />)} />
            <Route path="/about" element={withPageTransition(<AboutPage />)} />
            <Route path="/help" element={withPageTransition(<HelpPage />)} />
            <Route path="/privacy" element={withPageTransition(<PrivacyPage />)} />
            <Route path="/terms" element={withPageTransition(<TermsPage />)} />
            <Route path="/partnerships" element={withPageTransition(<PartnershipsPage />)} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {withPageTransition(<DashboardPage />)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  {withPageTransition(<AdminPage />)}
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
