import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth.service';
import { IUser } from '../types/auth';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ub_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await AuthService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('ub_access_token');
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('ub_access_token');
      if (storedToken) {
        try {
          const profile = await AuthService.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch {
          // Try refresh
          try {
            const refreshed = await AuthService.refreshToken();
            setToken(refreshed.accessToken);
            localStorage.setItem('ub_access_token', refreshed.accessToken);
            const profile = await AuthService.getMe();
            setUser(profile);
          } catch {
            setUser(null);
            setToken(null);
            localStorage.removeItem('ub_access_token');
          }
        }
      } else {
        // Try cookie refresh
        try {
          const refreshed = await AuthService.refreshToken();
          setToken(refreshed.accessToken);
          localStorage.setItem('ub_access_token', refreshed.accessToken);
          const profile = await AuthService.getMe();
          setUser(profile);
        } catch {
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await AuthService.login(email, pass);
      localStorage.setItem('ub_access_token', response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('ub_access_token');
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

