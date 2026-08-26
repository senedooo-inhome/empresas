import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
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
  Clock,
  Archive,
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
import { formatDataBr, getRecadoStatus, RecadoStatus } from '../../lib/dateUtils';
import { RecadoFormModal } from './RecadoFormModal';
import { RecadoDetailsModal } from './RecadoDetailsModal';
import { RecadoDeleteModal } from './RecadoDeleteModal';

export const HistoricoRecadosAdmin: React.FC = () => {
  const hojeSp = getTodaySaoPaulo();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [recados, setRecados] = useState<Recado[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'hoje' | 'futuro' | 'expirado'>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

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

  // Real-time synchronization of empresas
  useEffect(() => {
    const unsubEmpresas = subscribeEmpresas(false, (list) => {
      setEmpresas(list);
    });
    return () => unsubEmpresas();
  }, []);

  // Real-time synchronization of all recados (history)
  useEffect(() => {
    setLoading(true);
    const unsubRecados = subscribeRecados(null, (list) => {
      setRecados(list);
      setLoading(false);
    });

    return () => unsubRecados();
  }, []);

  // Map of empresas for O(1) lookup
  const empresasMap = useMemo(() => {
    const map = new Map<string, Empresa>();
    empresas.forEach((e) => map.set(e.id, e));
    return map;
  }, [empresas]);

  // Filtered and sorted recados
  const filteredRecados = useMemo(() => {
    return recados
      .filter((recado) => {
        const empresa = empresasMap.get(recado.empresa_id);
        const empresaNome = empresa ? empresa.nome.toLowerCase() : '';
        const inicio = recado.data_inicio || recado.data_recado;
        const fim = recado.data_fim || recado.data_recado;
        const status = hojeSp < inicio ? 'futuro' : hojeSp > fim ? 'expirado' : 'hoje';

        // Filter: Empresa
        if (empresaFilter !== 'todas' && recado.empresa_id !== empresaFilter) {
          return false;
        }

        // Filter: Status
        if (statusFilter !== 'todos' && status !== statusFilter) {
          return false;
        }

        // Filter: Período (Data Inicial / Final)
        if (dataInicio && (recado.data_fim || recado.data_recado) < dataInicio) {
          return false;
        }
        if (dataFim && (recado.data_inicio || recado.data_recado) > dataFim) {
          return false;
        }

        // Filter: Search Query (Empresa Nome ou Mensagem)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchEmpresa = empresaNome.includes(q);
          const matchMensagem = recado.mensagem.toLowerCase().includes(q);
          return matchEmpresa || matchMensagem;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by data_recado DESC, then createdAt DESC
        const compDate = (b.data_inicio || b.data_recado).localeCompare(a.data_inicio || a.data_recado);
        if (compDate !== 0) return compDate;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [recados, empresasMap, empresaFilter, statusFilter, dataInicio, dataFim, searchQuery, hojeSp]);

  // Save handler
  const handleSaveRecado = async (data: {
    empresa_id: string;
    data_recado: string;
    data_inicio: string;
    data_fim: string;
    mensagem: string;
    criado_por: string;
  }) => {
    try {
      if (recadoToEdit) {
        await updateRecado(recadoToEdit.id, {
          empresa_id: data.empresa_id,
          data_recado: data.data_recado,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
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

  // Delete handler
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

  const formatCreationDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6" id="historico-recados-container">
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Histórico de Recados
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <Clock className="w-3 h-3" />
              Retenção de 3 dias
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Recados mantidos no histórico por 3 dias (limpeza automática após 3 dias).
          </p>
        </div>

        <button
          type="button"
          id="btn-novo-recado-historico"
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

      {/* Filters Area */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        {/* Row 1: Search & Empresa & Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
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

          {/* Empresa Filter */}
          <div>
            <select
              value={empresaFilter}
              onChange={(e) => setEmpresaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-sky-500"
            >
              <option value="todas">Todas as Empresas ({empresas.length})</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} {!e.ativo ? '(Inativa)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-sky-500"
            >
              <option value="todos">Todos os Status ({recados.length})</option>
              <option value="hoje">Vigentes hoje ({recados.filter((r) => (r.data_inicio || r.data_recado) <= hojeSp && (r.data_fim || r.data_recado) >= hojeSp).length})</option>
              <option value="futuro">Futuro ({recados.filter((r) => (r.data_inicio || r.data_recado) > hojeSp).length})</option>
              <option value="expirado">Expirado ({recados.filter((r) => (r.data_fim || r.data_recado) < hojeSp).length})</option>
            </select>
          </div>
        </div>

        {/* Row 2: Período (Data Inicial e Data Final) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-600 text-xs flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Período:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">De</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {(searchQuery || empresaFilter !== 'todas' || statusFilter !== 'todos' || dataInicio || dataFim) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmpresaFilter('todas');
                setStatusFilter('todos');
                setDataInicio('');
                setDataFim('');
              }}
              className="ml-auto text-sky-600 hover:text-sky-800 font-semibold text-xs cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
            <span>Carregando histórico de recados...</span>
          </div>
        ) : recados.length === 0 ? (
          /* Empty state: No messages in history */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhum recado cadastrado no histórico.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Cadastre comunicados diários ou agendamentos futuros para acompanhar aqui.
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
              <span>+ Cadastrar primeiro recado</span>
            </button>
          </div>
        ) : filteredRecados.length === 0 ? (
          /* Filtered empty state */
          <div className="py-12 px-6 text-center text-slate-500 text-xs">
            <Filter className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-800">
              Nenhum recado corresponde aos filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmpresaFilter('todas');
                setStatusFilter('todos');
                setDataInicio('');
                setDataFim('');
              }}
              className="mt-2 text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
            >
              Redefinir filtros
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
                  <th className="py-3 px-4 w-28">Criado em</th>
                  <th className="py-3 px-4 text-right w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecados.map((recado) => {
                  const empresa = empresasMap.get(recado.empresa_id);
                  const inicio = recado.data_inicio || recado.data_recado;
                  const fim = recado.data_fim || recado.data_recado;
                  const status = hojeSp < inicio ? 'futuro' : hojeSp > fim ? 'expirado' : 'hoje';

                  return (
                    <tr
                      key={recado.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Empresa */}
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
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs block truncate">
                                {empresa?.nome || 'Empresa'}
                              </span>
                              {empresa && !empresa.ativo && (
                                <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                  Inativa
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {empresa?.nicho || 'Geral'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Data de Validade */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {formatDataBr(recado.data_inicio || recado.data_recado)} a {formatDataBr(recado.data_fim || recado.data_recado)}
                      </td>

                      {/* Recado Preview */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => {
                            setRecadoToView(recado);
                            setIsDetailsOpen(true);
                          }}
                          className="text-slate-700 leading-relaxed line-clamp-2 max-w-lg cursor-pointer hover:text-slate-900"
                          title="Clique para ver o recado completo"
                        >
                          {recado.mensagem}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {status === 'hoje' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Hoje
                          </span>
                        )}
                        {status === 'futuro' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Futuro
                          </span>
                        )}
                        {status === 'expirado' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <Archive className="w-3 h-3 text-slate-400" />
                            Expirado
                          </span>
                        )}
                      </td>

                      {/* Criado em */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatCreationDate(recado.createdAt)}
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
              Mostrando <strong>{filteredRecados.length}</strong> de <strong>{recados.length}</strong> recado(s) no histórico
            </span>
            <span className="hidden sm:inline text-slate-400">
              Ordenação cronológica (mais recentes primeiro)
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
