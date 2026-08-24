import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Empresa } from '../../types';
import { getRecados } from '../../lib/firestoreService';

interface EmpresaDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  empresa: Empresa | null;
}

export const EmpresaDeleteModal: React.FC<EmpresaDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  empresa,
}) => {
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [recadosCount, setRecadosCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && empresa) {
      setLoadingCheck(true);
      const checkRecados = async () => {
        try {
          const list = await getRecados(empresa.id);
          if (isMounted) {
            setRecadosCount(list.length);
            setLoadingCheck(false);
          }
        } catch (e) {
          console.error('Erro ao verificar recados da empresa:', e);
          if (isMounted) {
            setLoadingCheck(false);
          }
        }
      };
      checkRecados();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, empresa]);

  if (!isOpen || !empresa) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('Erro ao confirmar exclusão/inativação:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="empresa-delete-modal">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Excluir empresa?
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
            Tem certeza que deseja excluir a empresa <strong className="text-slate-900 font-bold">{empresa.nome}</strong>?
          </p>

          {loadingCheck ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verificando histórico de comunicados...</span>
            </div>
          ) : recadosCount > 0 ? (
            <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-lg space-y-1">
              <p className="font-semibold text-xs text-amber-950">
                Atenção: Esta empresa possui {recadosCount} recado(s) histórico(s) vinculado(s).
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                Para manter a integridade dos relatórios e do histórico operacional, a empresa será <strong>inativada</strong> (preservando todos os comunicados).
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg">
              <p className="text-[11px] leading-normal">
                Nenhum recado vinculado encontrado. A empresa será removida permanentemente do banco de dados.
              </p>
            </div>
          )}
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
            disabled={submitting || loadingCheck}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : recadosCount > 0 ? (
              <span>Confirmar Inativação</span>
            ) : (
              <span>Confirmar Exclusão</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
