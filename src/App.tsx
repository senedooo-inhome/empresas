import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { LoginScreen } from './components/LoginScreen';
import { AdminLayout } from './components/AdminLayout';
import { PortalLayout } from './components/PortalLayout';
import { LoadingScreen } from './components/LoadingScreen';

const MainRouter: React.FC = () => {
  const { user, loading } = useAuth();

  // Show discreet loading screen during auth/session hydration
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated -> show LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  // Se o usuário for Agente (sonaxinhome@gmail.com), renderiza estritamente o PortalLayout (tela única de empresas com popup)
  if (user.role === 'agente') {
    return <PortalLayout />;
  }

  // Usuário Supervisão -> AdminLayout
  return <AdminLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <MainRouter />
      </NavigationProvider>
    </AuthProvider>
  );
}
