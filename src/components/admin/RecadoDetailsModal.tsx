import React from 'react';
import {
  X,
  MessageSquare,
  Building2,
  Calendar,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { Empresa, Recado } from '../../types';
import { formatDataBr, getRecadoStatus } from '../../lib/dateUtils';
import { getTodaySaoPaulo } from '../../lib/firebase';
import { getEmpresaLinks } from '../../lib/empresaLinks';

interface RecadoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recado: Recado | null;
  empresa: Empresa | null;
  onEdit?: (recado: Recado) => void;
}

export const RecadoDetailsModal: React.FC<RecadoDetailsModalProps> = ({
  isOpen,
  onClose,
  recado,
  empresa,
  onEdit,
}) => {
  if (!isOpen || !recado) return null;

  const hojeSp = getTodaySaoPaulo();
  const status = getRecadoStatus(recado.data_recado, hojeSp);

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="recado-details-modal">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {empresa?.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.nome}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {empresa?.nome || 'Empresa'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Status Badge */}
                {status === 'hoje' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Hoje ({formatDataBr(recado.data_recado)})
                  </span>
                )}
                {status === 'futuro' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Futuro ({formatDataBr(recado.data_recado)})
                  </span>
                )}
                {status === 'expirado' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Expirado ({formatDataBr(recado.data_recado)})
                  </span>
                )}

                {empresa && !empresa.ativo && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Inativa
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <div>
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Data de Validade
              </span>
              <p className="font-bold text-slate-900 text-xs">
                {formatDataBr(recado.data_recado)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Registrado em
              </span>
              <p className="font-medium text-slate-700 text-xs">
                {formatDateTime(recado.createdAt)}
              </p>
            </div>
          </div>

          {/* Recado Content */}
          <div>
            <span className="block text-slate-500 font-semibold mb-1">
              Conteúdo do Comunicado
            </span>
            <div className="p-4 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed text-xs whitespace-pre-wrap font-normal shadow-2xs">
              {recado.mensagem}
            </div>
          </div>

          {/* Detalhes da Empresa */}
          {empresa && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-700 block">
                  {empresa.nome} • {empresa.nicho} ({empresa.segmento})
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-xs block">
                  {getEmpresaLinks(empresa).length} sistema(s) cadastrado(s)
                </span>
              </div>
              <a
                href={getEmpresaLinks(empresa)[0]?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-sky-700 border border-slate-200 rounded-md font-semibold text-[11px] shrink-0 transition-colors shadow-2xs"
              >
                <span>Acessar principal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Audit Trail */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Criado por: {recado.criado_por === 'supervisao' ? 'Supervisão Sonax' : 'Supervisor'}
            </span>
            <span>Última atualização: {formatDateTime(recado.updatedAt)}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(recado);
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Editar Recado
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
