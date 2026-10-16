import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, StudentProfile } from '../types/index.js';
import { api, getAuthToken, setAuthToken, UNAUTHORIZED_EVENT } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  token: string | null;
  isDemo: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  demoReset: () => Promise<void>;
  logout: () => void;
  setProfile: (profile: StudentProfile) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setProfileState(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.auth.getMe();
      setUser(data.user);
      setProfileState(data.profile);
    } catch (err) {
      console.warn('Session refresh failed, clearing token:', err);
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
      setProfileState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
      setProfileState(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    setAuthToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setProfileState(data.profile);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.auth.register(name, email, password);
    setAuthToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setProfileState(data.profile);
  };

  const demoLogin = async () => {
    const data = await api.auth.demoLogin();
    setAuthToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setProfileState(data.profile);
  };

  const demoReset = async () => {
    await api.auth.demoReset();
    await demoLogin();
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    setProfileState(null);
  };

  const setProfile = (newProfile: StudentProfile) => {
    setProfileState(newProfile);
  };

  const isDemo = !!user?.isDemo;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isDemo,
        isLoading,
        login,
        register,
        demoLogin,
        demoReset,
        logout,
        setProfile,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
