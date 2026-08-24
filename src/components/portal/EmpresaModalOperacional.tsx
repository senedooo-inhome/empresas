import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Empresa, Recado } from '../../types';
import { subscribeRecadosEmpresaHoje } from '../../lib/firestoreService';
import { useTodaySaoPaulo } from '../../lib/useTodaySaoPaulo';
import { formatDataBr } from '../../lib/dateUtils';

interface EmpresaModalOperacionalProps {
  empresa: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmpresaModalOperacional: React.FC<EmpresaModalOperacionalProps> = ({
  empresa,
  isOpen,
  onClose,
}) => {
  const hojeSp = useTodaySaoPaulo();
  const [recadosHoje, setRecadosHoje] = useState<Recado[]>([]);
  const [loadingRecados, setLoadingRecados] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isOpen || !empresa) {
      setRecadosHoje([]);
      return;
    }

    setLoadingRecados(true);
    setImgError(false);

    const unsubscribe = subscribeRecadosEmpresaHoje(empresa.id, hojeSp, (list) => {
      setRecadosHoje(list);
      setLoadingRecados(false);
    });

    return () => unsubscribe();
  }, [isOpen, empresa, hojeSp]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !empresa) return null;

  const getInitial = () => {
    return empresa.nome?.charAt(0)?.toUpperCase() || 'E';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      id="modal-empresa-operacional-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id={`modal-empresa-${empresa.id}`}
      >
        {/* Header do Modal */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Logo da Empresa */}
            <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {empresa.logo_url && !imgError ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.nome}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-700 bg-slate-100">
                  {getInitial()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {empresa.nome}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  {empresa.nicho}
                </span>
                {empresa.segmento && (
                  <span className="text-xs text-slate-500 font-medium truncate">
                    • {empresa.segmento}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botão Fechar (X) */}
          <button
            type="button"
            onClick={onClose}
            id="btn-fechar-modal-empresa"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Botão de Destaque: Link do Sistema da Empresa */}
          {empresa.link_sistema ? (
            <div className="bg-[#00709e] rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">
                  Acesso Operacional
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Sistema de Atendimento
                </h3>
                <p className="text-xs text-sky-100/90 truncate mt-0.5 max-w-md">
                  {empresa.link_sistema}
                </p>
              </div>

              <a
                href={empresa.link_sistema}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-acessar-sistema-empresa-popup"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-sky-50 active:bg-sky-100 text-[#00709e] font-extrabold text-xs rounded-lg transition-colors shadow-sm cursor-pointer shrink-0 uppercase tracking-wide"
              >
                <span>ACESSAR SISTEMA DA EMPRESA</span>
                <ExternalLink className="w-4 h-4 text-[#00709e] stroke-[2.5]" />
              </a>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Nenhum link de sistema cadastrado para esta empresa.</span>
            </div>
          )}

          {/* Seção: Recado do Dia */}
          <div className="space-y-2" id="secao-recados-do-dia-modal">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recado do Dia
              </span>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDataBr(hojeSp)}</span>
              </div>
            </div>

            {loadingRecados ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span>Carregando recados de hoje...</span>
              </div>
            ) : recadosHoje.length > 0 ? (
              /* Alerta em Destaque de Recado */
              <div
                id="modal-alerta-recados-hoje"
                className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white inline-block">
                      ⚠ ATENÇÃO OPERACIONAL
                    </span>
                    <h4 className="text-sm font-bold text-amber-950 mt-0.5">
                      {recadosHoje.length > 1
                        ? `${recadosHoje.length} Recados para hoje:`
                        : 'Recado importante para hoje:'}
                    </h4>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {recadosHoje.map((recado, index) => (
                    <div
                      key={recado.id}
                      className="bg-white border border-amber-300 rounded-lg p-3.5 text-xs sm:text-sm text-slate-900 leading-relaxed font-medium whitespace-pre-wrap shadow-2xs"
                    >
                      {recadosHoje.length > 1 && (
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Aviso #{index + 1}
                        </span>
                      )}
                      {recado.mensagem}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Card Neutro: Sem Observações */
              <div
                id="modal-sem-recados-hoje"
                className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex items-center gap-3 text-slate-600"
              >
                <div className="w-8 h-8 rounded-lg bg-white text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Sem observações no momento.
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Não há comunicados específicos registrados para o atendimento desta empresa hoje ({formatDataBr(hojeSp)}).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resumo Operacional */}
          {empresa.resumo && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Resumo Operacional
              </span>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                {empresa.resumo}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
