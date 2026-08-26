import React, { useState, useEffect } from 'react';
import { LogOut, User, Building2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { SonaxLogo } from './SonaxLogo';
import { Empresa } from '../types';
import { subscribeEmpresas } from '../lib/firestoreService';
import { PortalEmpresasGrid } from './portal/PortalEmpresasGrid';
import { EmpresaDetalheOperacional } from './portal/EmpresaDetalheOperacional';
import { RecadosIniciaisAgente } from './portal/RecadosIniciaisAgente';

export const PortalLayout: React.FC = () => {
  const { user, logout, isSupervisao } = useAuth();
  const { currentRoute, navigate } = useNavigation();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  // Escutar apenas empresas ativas (apenasAtivas = true)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeEmpresas(true, (list) => {
      setEmpresas(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Detectar se está visualizando uma empresa individual: /portal/empresa/:id
  const isEmpresaDetail = currentRoute.startsWith('/portal/empresa/');
  const empresaIdFromRoute = isEmpresaDetail
    ? currentRoute.replace('/portal/empresa/', '').trim()
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="portal-layout">
      {/* Clean Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <div
            className="cursor-pointer"
            onClick={() => navigate('/portal')}
            title="Ir para o início do Portal"
          >
            <SonaxLogo variant="brand" size="md" showSubtitle={true} />
          </div>
          <div className="hidden sm:block h-5 w-px bg-slate-200" />
          <span className="hidden sm:inline-block text-xs font-bold text-slate-700">
            Portal Operacional
          </span>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          {isSupervisao && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
              title="Acessar o painel administrativo da supervisão"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel da Supervisão</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user?.nome || 'Agente Sonax In Home'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {user?.role === 'supervisao' ? 'Supervisão' : 'Agente'}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="portal-logout-button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto flex flex-col justify-start">
        {isEmpresaDetail && empresaIdFromRoute ? (
          <EmpresaDetalheOperacional empresaId={empresaIdFromRoute} />
        ) : (
          <div className="space-y-6">
            <RecadosIniciaisAgente />
            <PortalEmpresasGrid empresas={empresas} loading={loading} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 text-center text-slate-400 text-xs">
        Sonax In Home • Portal Operacional
      </footer>
    </div>
  );
};
