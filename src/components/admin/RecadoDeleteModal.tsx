import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Empresa, Recado } from '../../types';
import { formatDataBr } from '../../lib/dateUtils';

interface RecadoDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recado: Recado | null;
  empresa: Empresa | null;
}

export const RecadoDeleteModal: React.FC<RecadoDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recado,
  empresa,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !recado) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('Erro ao excluir recado:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="recado-delete-modal">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Excluir recado?
            </h3>
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

        {/* Modal Body */}
        <div className="p-6 space-y-3 text-xs">
          <p className="text-slate-700 text-sm leading-relaxed">
            Tem certeza que deseja excluir este recado da empresa{' '}
            <strong className="text-slate-900 font-bold">{empresa?.nome || 'vinculada'}</strong>?
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-600">
            <div className="text-[11px] font-semibold text-slate-700">
              Período: {formatDataBr(recado.data_inicio || recado.data_recado)} a {formatDataBr(recado.data_fim || recado.data_recado)}
            </div>
            <p className="text-xs italic line-clamp-3 text-slate-600">
              "{recado.mensagem}"
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Excluir</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
