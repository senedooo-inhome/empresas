import React, { useState } from 'react';
import { X, Building2, ExternalLink, Calendar, Tag, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { Empresa } from '../../types';
import { getEmpresaLinks } from '../../lib/empresaLinks';

interface EmpresaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa | null;
  onEdit?: (empresa: Empresa) => void;
}

export const EmpresaDetailsModal: React.FC<EmpresaDetailsModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onEdit,
}) => {
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !empresa) return null;

  const formatDate = (isoStr: string) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="empresa-details-modal">
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
              {empresa.logo_url && !imgError ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.nome}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {empresa.nome}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
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
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-[11px] text-slate-500 font-medium">{empresa.nicho}</span>
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
          {/* Nicho e Segmento */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <div>
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <Tag className="w-3 h-3 text-slate-500" />
                Nicho
              </span>
              <p className="font-semibold text-slate-900 text-xs">{empresa.nicho}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-slate-500" />
                Segmento
              </span>
              <p className="font-semibold text-slate-900 text-xs">{empresa.segmento}</p>
            </div>
          </div>

          {/* Links dos Sistemas */}
          <div>
            <span className="block text-slate-500 font-medium mb-1">Links dos Sistemas Operacionais</span>
            <div className="space-y-2">
              {getEmpresaLinks(empresa).map((link, index) => (
                <div key={`${link.url}-${index}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="min-w-0 mr-2">
                    <span className="block font-semibold text-slate-800">{link.nome}</span>
                    <span className="block font-mono text-slate-500 truncate">{link.url}</span>
                  </div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-md font-semibold text-[11px] shrink-0 transition-colors">
                    <span>Acessar</span><ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo da Operação */}
          <div>
            <span className="block text-slate-500 font-medium mb-1">Resumo Operacional</span>
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 leading-relaxed text-xs whitespace-pre-wrap">
              {empresa.resumo}
            </div>
          </div>

          {/* Metadados / Datas */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Criada em: {formatDate(empresa.createdAt)}
            </span>
            <span>Atualizada em: {formatDate(empresa.updatedAt)}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(empresa);
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Editar Informações
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
