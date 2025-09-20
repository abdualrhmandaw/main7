import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, logoutUser } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  isLoading: boolean;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  signOut: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (error || !data) {
          setUser(currentUser);
        } else {
          const refreshed: User = {
            ...currentUser,
            name: data.name ?? currentUser.name,
            email: data.email ?? currentUser.email,
            phone: data.phone ?? currentUser.phone,
            company: data.company ?? currentUser.company,
            role: (data.role as any) ?? currentUser.role,
            pricingCategory: (data as any).pricing_category ?? (currentUser as any).pricingCategory ?? null,
            allowedCustomers: (data as any).allowed_customers ?? (currentUser as any).allowedCustomers ?? null,
          };
          setUser(refreshed);
          localStorage.setItem('currentUser', JSON.stringify(refreshed));
        }
      } catch {
        setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile: user,
    isLoading,
    loading: isLoading,
    login,
    logout,
    signOut: logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
