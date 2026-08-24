import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginWithBackend, logoutBackend, getSessionUser } from '../lib/firebaseAuth';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  isSupervisao: boolean;
  isAgente: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restaura a sessão autenticada via backend na inicialização (F5)
    let isMounted = true;

    async function checkAuth() {
      try {
        const currentUser = await getSessionUser();
        if (isMounted) {
          setUser(currentUser);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithBackend(email, pass);
      setUser(profile);
      return profile;
    } catch (err: any) {
      console.error('[Auth error]', err);
      let msg = 'E-mail ou senha inválidos.';
      if (err.message && (err.message.includes('não autorizado') || err.message.includes('sem perfil'))) {
        msg = 'Usuário não autorizado para acessar este sistema.';
      } else if (err.message && err.message.includes('E-mail e senha')) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutBackend();
    } catch (e) {
      console.warn('[Logout]', e);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isSupervisao: user?.role === 'supervisao',
        isAgente: user?.role === 'agente',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
