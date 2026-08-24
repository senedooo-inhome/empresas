import React, { useState, useMemo } from 'react';
import { Search, Building2, AlertCircle, RefreshCw } from 'lucide-react';
import { Empresa } from '../../types';
import { EmpresaCard } from './EmpresaCard';
import { EmpresaModalOperacional } from './EmpresaModalOperacional';

interface PortalEmpresasGridProps {
  empresas: Empresa[];
  loading: boolean;
}

export const PortalEmpresasGrid: React.FC<PortalEmpresasGridProps> = ({
  empresas,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenEmpresa = (emp: Empresa) => {
    setSelectedEmpresa(emp);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmpresa(null);
  };

  // 1. Filtrar empresas ativas pela busca (nome, nicho ou segmento)
  const filteredEmpresas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return empresas;

    return empresas.filter((emp) => {
      const matchNome = emp.nome?.toLowerCase().includes(q) || false;
      const matchNicho = emp.nicho?.toLowerCase().includes(q) || false;
      const matchSegmento = emp.segmento?.toLowerCase().includes(q) || false;
      return matchNome || matchNicho || matchSegmento;
    });
  }, [empresas, searchQuery]);

  // 2. Agrupar dinamicamente por nicho e ordenar alfabeticamente
  const nichosAgrupados = useMemo(() => {
    const map = new Map<string, Empresa[]>();

    filteredEmpresas.forEach((emp) => {
      const nichoKey = (emp.nicho || 'Outros').trim();
      const list = map.get(nichoKey) || [];
      list.push(emp);
      map.set(nichoKey, list);
    });

    // Ordenar nichos alfabeticamente
    const sortedNichos = Array.from(map.keys()).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );

    // Ordenar empresas dentro de cada nicho alfabeticamente pelo nome
    return sortedNichos.map((nicho) => ({
      nicho,
      empresas: (map.get(nicho) || []).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ),
    }));
  }, [filteredEmpresas]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs font-semibold text-slate-500">
          Carregando empresas atendidas...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="portal-empresas-container">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Empresas Atendidas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acesse rapidamente as informações operacionais de cada empresa.
          </p>
        </div>

        {/* Input de Busca em tempo real */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="portal-busca-empresa"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-2xs transition-colors"
          />
        </div>
      </div>

      {/* Main Content: Grouped by Nicho */}
      {empresas.length === 0 ? (
        /* Empty State: Nenhuma empresa ativa */
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Nenhuma empresa disponível no momento.
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Novas empresas ativadas pela Supervisão serão exibidas aqui automaticamente.
          </p>
        </div>
      ) : nichosAgrupados.length === 0 ? (
        /* Empty State: Busca sem resultados */
        <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-xs">
          <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma empresa encontrada para "{searchQuery}".
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Tente buscar por outro termo, nicho ou segmento.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-semibold text-sky-600 hover:text-sky-800 cursor-pointer"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        /* Grupos por Nicho */
        <div className="space-y-8">
          {nichosAgrupados.map((grupo) => (
            <section key={grupo.nicho} className="space-y-3">
              {/* Nicho Title */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
                  {grupo.nicho}
                </h2>
                <span className="text-[11px] font-semibold text-slate-400">
                  ({grupo.empresas.length})
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {grupo.empresas.map((emp) => (
                  <EmpresaCard
                    key={emp.id}
                    empresa={emp}
                    onClick={() => handleOpenEmpresa(emp)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Popup com Link da Empresa e Recado do Dia */}
      <EmpresaModalOperacional
        empresa={selectedEmpresa}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};
