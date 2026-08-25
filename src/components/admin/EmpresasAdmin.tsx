import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  Filter,
} from 'lucide-react';
import { Empresa, SistemaLink } from '../../types';
import {
  subscribeEmpresas,
  createEmpresa,
  updateEmpresa,
  inativarOuExcluirEmpresa,
} from '../../lib/firestoreService';
import { EmpresaFormModal } from './EmpresaFormModal';
import { EmpresaDetailsModal } from './EmpresaDetailsModal';
import { EmpresaDeleteModal } from './EmpresaDeleteModal';
import { getEmpresaLinks } from '../../lib/empresaLinks';

export const EmpresasAdmin: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ativas' | 'inativas'>('todas');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [empresaToEdit, setEmpresaToEdit] = useState<Empresa | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [empresaToView, setEmpresaToView] = useState<Empresa | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Subscribe to real-time updates from Firestore (both active and inactive for supervision)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeEmpresas(false, (list) => {
      setEmpresas(list);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Collect unique nichos and segmentos for dynamic suggestions
  const existingNichos = useMemo(() => {
    const set = new Set<string>();
    empresas.forEach((e) => {
      if (e.nicho?.trim()) set.add(e.nicho.trim());
    });
    if (set.size === 0) {
      return ['Energia', 'Saúde', 'Tecnologia', 'Financeiro'];
    }
    return Array.from(set).sort();
  }, [empresas]);

  const existingSegmentos = useMemo(() => {
    const set = new Set<string>();
    empresas.forEach((e) => {
      if (e.segmento?.trim()) set.add(e.segmento.trim());
    });
    if (set.size === 0) {
      return ['Mobilidade Elétrica', 'Energia Solar', 'Atendimento', 'Seguros'];
    }
    return Array.from(set).sort();
  }, [empresas]);

  // Filtered and sorted empresas (A-Z)
  const filteredEmpresas = useMemo(() => {
    return empresas
      .filter((empresa) => {
        // Status filter
        if (statusFilter === 'ativas' && !empresa.ativo) return false;
        if (statusFilter === 'inativas' && empresa.ativo) return false;

        // Search query filter (nome, nicho, segmento)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNome = empresa.nome.toLowerCase().includes(q);
          const matchNicho = empresa.nicho.toLowerCase().includes(q);
          const matchSegmento = empresa.segmento.toLowerCase().includes(q);
          return matchNome || matchNicho || matchSegmento;
        }

        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [empresas, statusFilter, searchQuery]);

  // Save (Create or Edit)
  const handleSaveEmpresa = async (data: {
    nome: string;
    nicho: string;
    segmento: string;
    link_sistema: string;
    links_sistema: SistemaLink[];
    resumo: string;
    logo_url: string;
  }) => {
    try {
      if (empresaToEdit) {
        await updateEmpresa(empresaToEdit.id, data);
        showToast('Empresa atualizada com sucesso.');
      } else {
        await createEmpresa({
          ...data,
          ativo: true,
        });
        showToast('Empresa cadastrada com sucesso.');
      }
    } catch (e) {
      console.error('Erro ao salvar empresa:', e);
      showToast('Não foi possível salvar a empresa. Tente novamente.', 'error');
      throw e;
    }
  };

  // Reativar empresa inativa
  const handleReativar = async (empresa: Empresa) => {
    try {
      await updateEmpresa(empresa.id, { ativo: true });
      showToast('Empresa reativada com sucesso.');
    } catch (e) {
      console.error('Erro ao reativar empresa:', e);
      showToast('Não foi possível reativar a empresa. Tente novamente.', 'error');
    }
  };

  // Confirm delete/inactivate
  const handleConfirmDelete = async () => {
    if (!empresaToDelete) return;
    try {
      const res = await inativarOuExcluirEmpresa(empresaToDelete.id);
      if (res.inativada) {
        showToast('Empresa inativada com sucesso. O histórico de recados foi preservado.');
      } else {
        showToast('Empresa excluída com sucesso.');
      }
    } catch (e) {
      console.error('Erro ao excluir/inativar empresa:', e);
      showToast('Não foi possível realizar a ação. Tente novamente.', 'error');
    }
  };

  return (
    <div className="space-y-6" id="empresas-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Empresas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerencie as empresas atendidas pela Sonax In Home.
          </p>
        </div>

        <button
          type="button"
          id="btn-nova-empresa"
          onClick={() => {
            setEmpresaToEdit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto bg-slate-100 p-1 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => setStatusFilter('todas')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'todas'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({empresas.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ativas')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ativas'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ativas ({empresas.filter((e) => e.ativo).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inativas')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'inativas'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inativas ({empresas.filter((e) => !e.ativo).length})
          </button>
        </div>
      </div>

      {/* Main Table / Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
            <span>Carregando empresas...</span>
          </div>
        ) : empresas.length === 0 ? (
          /* Empty state: No companies registered */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhuma empresa cadastrada.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Cadastre a primeira empresa para iniciar a operação e permitir a emissão de comunicados.
            </p>
            <button
              type="button"
              onClick={() => {
                setEmpresaToEdit(null);
                setIsFormOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Cadastrar primeira empresa</span>
            </button>
          </div>
        ) : filteredEmpresas.length === 0 ? (
          /* Empty state: Filtered out */
          <div className="py-12 px-6 text-center text-slate-500 text-xs">
            <Filter className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-800">
              Nenhuma empresa encontrada com os filtros aplicados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('todas');
              }}
              className="mt-2 text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              Limpar filtros de busca
            </button>
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-16">Logo</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Nicho</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 text-right w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmpresas.map((empresa) => (
                  <tr
                    key={empresa.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Logo Column */}
                    <td className="py-3 px-4">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-2xs">
                        {empresa.logo_url ? (
                          <img
                            src={empresa.logo_url}
                            alt={empresa.nome}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>

                    {/* Empresa (Nome) */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {empresa.nome}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <a
                          href={getEmpresaLinks(empresa)[0]?.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-sky-600 inline-flex items-center gap-0.5 truncate max-w-[200px]"
                          title={getEmpresaLinks(empresa)[0]?.url}
                        >
                          <span>{getEmpresaLinks(empresa)[0]?.nome || 'Sem link'}</span>
                          {getEmpresaLinks(empresa).length > 1 && (
                            <span className="font-semibold text-sky-600">+{getEmpresaLinks(empresa).length - 1}</span>
                          )}
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    </td>

                    {/* Nicho */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60 font-medium text-[11px]">
                        {empresa.nicho}
                      </span>
                    </td>

                    {/* Segmento */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {empresa.segmento}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {empresa.ativo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                          <XCircle className="w-3 h-3" />
                          Inativa
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Visualizar / Detalhes */}
                        <button
                          type="button"
                          onClick={() => {
                            setEmpresaToView(empresa);
                            setIsDetailsOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => {
                            setEmpresaToEdit(empresa);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                          title="Editar empresa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reativar ou Inativar/Excluir */}
                        {!empresa.ativo ? (
                          <button
                            type="button"
                            onClick={() => handleReativar(empresa)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Reativar empresa"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEmpresaToDelete(empresa);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Excluir ou inativar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && filteredEmpresas.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Mostrando <strong>{filteredEmpresas.length}</strong> de <strong>{empresas.length}</strong> empresas cadastradas
            </span>
            <span className="hidden sm:inline text-slate-400">
              Ordenação alfabética (A → Z)
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <EmpresaFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEmpresaToEdit(null);
        }}
        onSave={handleSaveEmpresa}
        empresaToEdit={empresaToEdit}
        existingNichos={existingNichos}
        existingSegmentos={existingSegmentos}
      />

      <EmpresaDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setEmpresaToView(null);
        }}
        empresa={empresaToView}
        onEdit={(empresa) => {
          setEmpresaToEdit(empresa);
          setIsFormOpen(true);
        }}
      />

      <EmpresaDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setEmpresaToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        empresa={empresaToDelete}
      />
    </div>
  );
};
