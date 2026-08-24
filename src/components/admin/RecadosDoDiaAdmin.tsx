import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Empresa, Recado } from '../../types';
import {
  subscribeEmpresas,
  subscribeRecados,
  createRecado,
  updateRecado,
  deleteRecado,
} from '../../lib/firestoreService';
import { getTodaySaoPaulo } from '../../lib/firebase';
import { formatDataBr } from '../../lib/dateUtils';
import { RecadoFormModal } from './RecadoFormModal';
import { RecadoDetailsModal } from './RecadoDetailsModal';
import { RecadoDeleteModal } from './RecadoDeleteModal';

export const RecadosDoDiaAdmin: React.FC = () => {
  const hojeSp = getTodaySaoPaulo(); // 'YYYY-MM-DD' in America/Sao_Paulo

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [recados, setRecados] = useState<Recado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recadoToEdit, setRecadoToEdit] = useState<Recado | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [recadoToView, setRecadoToView] = useState<Recado | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recadoToDelete, setRecadoToDelete] = useState<Recado | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Real-time synchronization of empresas (all)
  useEffect(() => {
    const unsubEmpresas = subscribeEmpresas(false, (list) => {
      setEmpresas(list);
    });
    return () => unsubEmpresas();
  }, []);

  // Real-time synchronization of recados for today (America/Sao_Paulo)
  useEffect(() => {
    setLoading(true);
    const unsubRecados = subscribeRecados(hojeSp, (list) => {
      setRecados(list);
      setLoading(false);
    });

    return () => unsubRecados();
  }, [hojeSp]);

  // Empresas map for quick O(1) lookup
  const empresasMap = useMemo(() => {
    const map = new Map<string, Empresa>();
    empresas.forEach((e) => map.set(e.id, e));
    return map;
  }, [empresas]);

  // Filtered recados (by search query or empresa filter)
  const filteredRecados = useMemo(() => {
    return recados.filter((recado) => {
      const empresa = empresasMap.get(recado.empresa_id);
      const empresaNome = empresa ? empresa.nome.toLowerCase() : '';

      // Empresa filter
      if (empresaFilter !== 'todas' && recado.empresa_id !== empresaFilter) {
        return false;
      }

      // Search query filter (empresa name or message content)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEmpresa = empresaNome.includes(q);
        const matchMensagem = recado.mensagem.toLowerCase().includes(q);
        return matchEmpresa || matchMensagem;
      }

      return true;
    });
  }, [recados, empresasMap, empresaFilter, searchQuery]);

  // Handle Save (Create or Update)
  const handleSaveRecado = async (data: {
    empresa_id: string;
    data_recado: string;
    mensagem: string;
    criado_por: string;
  }) => {
    try {
      if (recadoToEdit) {
        await updateRecado(recadoToEdit.id, {
          empresa_id: data.empresa_id,
          data_recado: data.data_recado,
          mensagem: data.mensagem,
        });
        showToast('Recado atualizado com sucesso.');
      } else {
        await createRecado(data);
        showToast('Recado cadastrado com sucesso.');
      }
    } catch (e) {
      console.error('Erro ao salvar recado:', e);
      showToast('Não foi possível salvar o recado. Tente novamente.', 'error');
      throw e;
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!recadoToDelete) return;
    try {
      await deleteRecado(recadoToDelete.id);
      showToast('Recado excluído com sucesso.');
    } catch (e) {
      console.error('Erro ao excluir recado:', e);
      showToast('Não foi possível excluir o recado. Tente novamente.', 'error');
    }
  };

  return (
    <div className="space-y-6" id="recados-dia-container">
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Recados do Dia
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>{formatDataBr(hojeSp)}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cadastre e acompanhe as informações operacionais válidas para hoje.
          </p>
        </div>

        <button
          type="button"
          id="btn-novo-recado"
          onClick={() => {
            setRecadoToEdit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>Novo Recado</span>
        </button>
      </div>

      {/* Filters Bar */}
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
            placeholder="Buscar empresa ou recado..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
        </div>

        {/* Empresa Filter Dropdown */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 shrink-0 hidden sm:inline">
            Empresa:
          </label>
          <select
            value={empresaFilter}
            onChange={(e) => setEmpresaFilter(e.target.value)}
            className="w-full md:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="todas">Todas as Empresas ({empresas.length})</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} {!e.ativo ? '(Inativa)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table / Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
            <span>Carregando recados do dia...</span>
          </div>
        ) : recados.length === 0 ? (
          /* Empty state: No messages registered for today */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhum recado cadastrado para hoje ({formatDataBr(hojeSp)}).
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Cadastre comunicados ou avisos operacionais para orientar os agentes no atendimento de hoje.
            </p>
            <button
              type="button"
              onClick={() => {
                setRecadoToEdit(null);
                setIsFormOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Novo Recado para Hoje</span>
            </button>
          </div>
        ) : filteredRecados.length === 0 ? (
          /* Filtered empty state */
          <div className="py-12 px-6 text-center text-slate-500 text-xs">
            <Filter className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-800">
              Nenhum recado encontrado com os filtros aplicados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmpresaFilter('todas');
              }}
              className="mt-2 text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-48">Empresa</th>
                  <th className="py-3 px-4 w-28">Data</th>
                  <th className="py-3 px-4">Recado</th>
                  <th className="py-3 px-4 w-24">Status</th>
                  <th className="py-3 px-4 text-right w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecados.map((recado) => {
                  const empresa = empresasMap.get(recado.empresa_id);

                  return (
                    <tr
                      key={recado.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Empresa (Logo + Nome) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                            {empresa?.logo_url ? (
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
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate">
                              {empresa?.nome || 'Empresa'}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {empresa?.nicho || 'Operação'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {formatDataBr(recado.data_recado)}
                      </td>

                      {/* Recado Preview */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => {
                            setRecadoToView(recado);
                            setIsDetailsOpen(true);
                          }}
                          className="text-slate-700 leading-relaxed line-clamp-2 max-w-xl cursor-pointer hover:text-slate-900"
                          title="Clique para ver o recado completo"
                        >
                          {recado.mensagem}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Hoje
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Visualizar */}
                          <button
                            type="button"
                            onClick={() => {
                              setRecadoToView(recado);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                            title="Visualizar comunicado completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => {
                              setRecadoToEdit(recado);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                            title="Editar comunicado"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => {
                              setRecadoToDelete(recado);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Excluir comunicado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && filteredRecados.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Mostrando <strong>{filteredRecados.length}</strong> de <strong>{recados.length}</strong> recado(s) de hoje
            </span>
            <span className="hidden sm:inline text-slate-400">
              Fuso horário: America/Sao_Paulo
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecadoFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setRecadoToEdit(null);
        }}
        onSave={handleSaveRecado}
        recadoToEdit={recadoToEdit}
        empresas={empresas}
      />

      <RecadoDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setRecadoToView(null);
        }}
        recado={recadoToView}
        empresa={recadoToView ? empresasMap.get(recadoToView.empresa_id) || null : null}
        onEdit={(recado) => {
          setRecadoToEdit(recado);
          setIsFormOpen(true);
        }}
      />

      <RecadoDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setRecadoToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        recado={recadoToDelete}
        empresa={recadoToDelete ? empresasMap.get(recadoToDelete.empresa_id) || null : null}
      />
    </div>
  );
};
