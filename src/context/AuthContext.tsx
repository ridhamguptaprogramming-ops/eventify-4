import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, FirebaseUser } from '../lib/firebase';
import { getUserProfile, upsertUserProfile, UserProfile } from '../lib/api';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: user.email === 'ridham.gupta.programming@gmail.com' ? 'admin' : 'user',
        isVerified: false,
        createdAt: new Date().toISOString(),
      };

      try {
        const profileFromDb = await getUserProfile(user.uid);
        setProfile({
          ...fallbackProfile,
          ...profileFromDb,
        });
      } catch (error) {
        try {
          const createdProfile = await upsertUserProfile(user.uid, fallbackProfile);
          setProfile(createdProfile);
        } catch (upsertError) {
          console.error('Failed to load profile from MongoDB API:', error);
          console.error('Failed to create fallback profile in MongoDB API:', upsertError);
          // Keep auth usable even when API configuration fails.
          setProfile(fallbackProfile);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
