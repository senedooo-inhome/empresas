import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type AppRoute =
  | '/login'
  | '/admin'
  | '/admin/empresas'
  | '/admin/recados'
  | '/admin/historico'
  | '/admin/agentes'
  | '/portal';

interface NavigationContextType {
  currentRoute: string;
  navigate: (route: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = window.location.pathname;
    const isValid =
      path === '/login' ||
      path === '/admin' ||
      path === '/admin/empresas' ||
      path === '/admin/recados' ||
      path === '/admin/historico' ||
      path === '/admin/agentes' ||
      path === '/portal' ||
      path.startsWith('/portal/empresa/');
    return isValid ? path : '/login';
  });

  const navigate = (route: string) => {
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    setCurrentRoute(route);
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const isValid =
        path === '/login' ||
        path === '/admin' ||
        path === '/admin/empresas' ||
        path === '/admin/recados' ||
        path === '/admin/historico' ||
      path === '/admin/agentes' ||
      path === '/portal' ||
      path.startsWith('/portal/empresa/');

      if (isValid) {
        setCurrentRoute(path);
      } else {
        setCurrentRoute(user ? '/admin' : '/login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Enforce route protection
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Unauthenticated user -> always /login
      if (currentRoute !== '/login') {
        navigate('/login');
      }
    } else {
      // Authenticated user
      if (user.role === 'agente') {
        if (currentRoute === '/login' || currentRoute.startsWith('/admin')) navigate('/portal');
      } else if (currentRoute === '/login') {
        navigate('/admin');
      }
    }
  }, [user, loading, currentRoute]);

  return (
    <NavigationContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation deve ser utilizado dentro de um NavigationProvider');
  }
  return context;
}
