import React, { useState } from 'react';
import {
  Home,
  Building2,
  MessageSquare,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, AppRoute } from '../contexts/NavigationContext';
import { SonaxLogo } from './SonaxLogo';
import { EmpresasAdmin } from './admin/EmpresasAdmin';
import { RecadosDoDiaAdmin } from './admin/RecadosDoDiaAdmin';
import { HistoricoRecadosAdmin } from './admin/HistoricoRecadosAdmin';
import { AgentesAdmin } from './admin/AgentesAdmin';
import { DashboardSupervisao } from './admin/DashboardSupervisao';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentRoute, navigate } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'inicio',
      label: 'Início',
      route: '/admin' as AppRoute,
      icon: Home,
    },
    {
      id: 'agentes',
      label: 'Cadastro de Agentes',
      route: '/admin/agentes' as AppRoute,
      icon: Users,
    },
    {
      id: 'empresas',
      label: 'Empresas',
      route: '/admin/empresas' as AppRoute,
      icon: Building2,
    },
    {
      id: 'recados',
      label: 'Recados do Dia',
      route: '/admin/recados' as AppRoute,
      icon: MessageSquare,
    },
    {
      id: 'historico',
      label: 'Histórico de Recados',
      route: '/admin/historico' as AppRoute,
      icon: History,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const renderContent = () => {
    if (currentRoute === '/admin') {
      return (
        <div className="space-y-6" id="admin-home-view">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60 mb-3"><Shield className="w-3.5 h-3.5" /> Painel Administrativo</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard da Supervisão</h1>
              <p className="text-sm text-slate-600 mt-2">Acompanhe os agentes que acessaram o sistema hoje e quem ainda possui recados aguardando confirmação.</p>
            </div>
          </div>
          <DashboardSupervisao />
        </div>
      );
    }

    if (currentRoute === '/admin/agentes') {
      return <AgentesAdmin />;
    }

    if (currentRoute === '/admin/empresas') {
      return <EmpresasAdmin />;
    }

    if (currentRoute === '/admin/recados') {
      return <RecadosDoDiaAdmin />;
    }

    if (currentRoute === '/admin/historico') {
      return <HistoricoRecadosAdmin />;
    }

    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Módulo Operacional</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Área do sistema em estruturação.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Voltar para Início
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="admin-layout">
      {/* Header Topo */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="mobile-sidebar-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Abrir menu lateral"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="md:hidden">
            <SonaxLogo variant="brand" size="sm" showSubtitle={true} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-700 text-xs font-medium">
            <span className="text-slate-400">Ambiente</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">Supervisão Operacional</span>
          </div>
        </div>

        {/* User Identity & Logout Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 sm:border-transparent">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user?.nome || 'Supervisão Sonax'}
              </span>
              <span className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider">
                Supervisão
              </span>
            </div>
          </div>

          <button
            type="button"
            id="admin-header-logout-button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0">
          <div className="p-5 border-b border-slate-100">
            <SonaxLogo variant="brand" size="md" showSubtitle={true} />
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegação administrativa">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#00709e] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-[#00709e] hover:bg-sky-50/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-200' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              id="sidebar-logout-button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50 border-r border-slate-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <SonaxLogo variant="brand" size="md" showSubtitle={true} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.route;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.route);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-[#00709e] text-white font-semibold'
                          : 'text-slate-600 hover:text-[#00709e] hover:bg-sky-50/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
