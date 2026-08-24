import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Empresa, Recado } from '../../types';
import { getTodaySaoPaulo } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDataBr } from '../../lib/dateUtils';

interface RecadoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    empresa_id: string;
    data_recado: string;
    mensagem: string;
    criado_por: string;
  }) => Promise<void>;
  recadoToEdit?: Recado | null;
  empresas: Empresa[];
  initialEmpresaId?: string;
  initialData?: string;
}

export const RecadoFormModal: React.FC<RecadoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recadoToEdit,
  empresas,
  initialEmpresaId,
  initialData,
}) => {
  const { user } = useAuth();
  const hojeSp = getTodaySaoPaulo();

  const [empresaId, setEmpresaId] = useState('');
  const [dataRecado, setDataRecado] = useState(hojeSp);
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter only active companies for new recados, or include the current company if editing an inactive one
  const selectableEmpresas = empresas.filter(
    (e) => e.ativo || (recadoToEdit && e.id === recadoToEdit.empresa_id)
  );

  useEffect(() => {
    if (recadoToEdit) {
      setEmpresaId(recadoToEdit.empresa_id || '');
      setDataRecado(recadoToEdit.data_recado || hojeSp);
      setMensagem(recadoToEdit.mensagem || '');
    } else {
      setEmpresaId(initialEmpresaId || selectableEmpresas[0]?.id || '');
      setDataRecado(initialData || hojeSp);
      setMensagem('');
    }
    setErrorMsg(null);
  }, [recadoToEdit, isOpen, initialEmpresaId, initialData, selectableEmpresas.length, hojeSp]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation
    if (!empresaId) {
      setErrorMsg('Selecione uma empresa válida.');
      return;
    }
    if (!dataRecado.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dataRecado.trim())) {
      setErrorMsg('Informe uma data válida para o recado.');
      return;
    }
    if (!mensagem.trim()) {
      setErrorMsg('A mensagem do recado é obrigatória.');
      return;
    }

    setSubmitting(true);

    try {
      // Use authenticated supervisor UID as criado_por (or preserve original if editing)
      const creatorUid = recadoToEdit?.criado_por || user?.id || 'supervisao';

      await onSave({
        empresa_id: empresaId,
        data_recado: dataRecado.trim(),
        mensagem: mensagem.trim(),
        criado_por: creatorUid,
      });

      onClose();
    } catch (err) {
      console.error('[RecadoForm] Erro ao salvar recado:', err);
      setErrorMsg('Não foi possível salvar o recado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmpresa = empresas.find((e) => e.id === empresaId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="recado-form-modal">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {recadoToEdit ? 'Editar Recado' : 'Novo Recado'}
              </h3>
              <p className="text-xs text-slate-500">
                {recadoToEdit
                  ? 'Atualize as orientações operacionais do comunicado.'
                  : 'Cadastre um comunicado operacional para a empresa.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Empresa Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Empresa <span className="text-red-500">*</span>
            </label>
            {selectableEmpresas.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
                Nenhuma empresa ativa cadastrada. Cadastre ou reative uma empresa antes de criar recados.
              </div>
            ) : (
              <div className="space-y-1.5">
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                  required
                >
                  <option value="" disabled>
                    Selecione uma empresa...
                  </option>
                  {selectableEmpresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome} ({emp.nicho} — {emp.segmento}) {!emp.ativo ? '[Inativa]' : ''}
                    </option>
                  ))}
                </select>

                {selectedEmpresa && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {selectedEmpresa.logo_url ? (
                        <img
                          src={selectedEmpresa.logo_url}
                          alt={selectedEmpresa.nome}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 truncate font-medium">
                      {selectedEmpresa.nome} • {selectedEmpresa.nicho}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data do Recado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Data do Recado <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Fuso: America/Sao_Paulo ({formatDataBr(hojeSp)})
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <input
                type="date"
                value={dataRecado}
                onChange={(e) => setDataRecado(e.target.value)}
                disabled={submitting}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Você pode selecionar hoje, agendar para uma data futura ou registrar uma data anterior.
            </p>
          </div>

          {/* Recado do Dia (Mensagem) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Recado do Dia / Comunicado Operacional <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite as orientações, avisos de instabilidade, procedimentos específicos ou notas do dia para os agentes..."
              rows={4}
              disabled={submitting}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs resize-none"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || selectableEmpresas.length === 0}
              className="px-4 py-2 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>{recadoToEdit ? 'Atualizar Recado' : 'Salvar Recado'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
