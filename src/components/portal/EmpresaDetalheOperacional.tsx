import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Empresa, Recado } from '../../types';
import {
  subscribeEmpresaById,
  subscribeRecadosEmpresaHoje,
} from '../../lib/firestoreService';
import { useTodaySaoPaulo } from '../../lib/useTodaySaoPaulo';
import { formatDataBr } from '../../lib/dateUtils';
import { useNavigation } from '../../contexts/NavigationContext';

interface EmpresaDetalheOperacionalProps {
  empresaId: string;
}

export const EmpresaDetalheOperacional: React.FC<EmpresaDetalheOperacionalProps> = ({
  empresaId,
}) => {
  const { navigate } = useNavigation();
  const hojeSp = useTodaySaoPaulo(); // Data atual em America/Sao_Paulo com recálculo automático

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [recadosHoje, setRecadosHoje] = useState<Recado[]>([]);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [loadingRecados, setLoadingRecados] = useState(true);
  const [imgError, setImgError] = useState(false);

  // 1. Escutar empresa em tempo real
  useEffect(() => {
    setLoadingEmpresa(true);
    const unsubEmpresa = subscribeEmpresaById(empresaId, (emp) => {
      setEmpresa(emp);
      setLoadingEmpresa(false);
    });

    return () => unsubEmpresa();
  }, [empresaId]);

  // 2. Escutar recados válidos estritamente para hoje em tempo real
  useEffect(() => {
    setLoadingRecados(true);
    const unsubRecados = subscribeRecadosEmpresaHoje(empresaId, hojeSp, (list) => {
      setRecadosHoje(list);
      setLoadingRecados(false);
    });

    return () => unsubRecados();
  }, [empresaId, hojeSp]);

  const handleVoltar = () => {
    navigate('/portal');
  };

  // Loading inicial
  if (loadingEmpresa) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs font-semibold text-slate-500">
          Carregando informações operacionais...
        </span>
      </div>
    );
  }

  // Tratamento de Empresa Inexistente ou Inativa
  if (!empresa || !empresa.ativo) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-10 sm:p-14 text-center shadow-xs max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Esta empresa não está disponível no momento.
        </h2>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          O atendimento desta empresa foi temporariamente pausado ou inativado pela Supervisão.
        </p>
        <button
          type="button"
          onClick={handleVoltar}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para empresas</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="empresa-detalhe-operacional">
      {/* Botão Voltar */}
      <div>
        <button
          type="button"
          id="btn-voltar-portal"
          onClick={handleVoltar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para empresas</span>
        </button>
      </div>

      {/* Card Principal da Empresa */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
        {/* Header com Logo, Nome, Nicho, Segmento e Botão de Acesso */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {empresa.logo_url && !imgError ? (
                <img
                  src={empresa.logo_url}
                  alt={empresa.nome}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xl text-slate-600 bg-slate-100">
                  {empresa.nome?.charAt(0)?.toUpperCase() || 'E'}
                </div>
              )}
            </div>

            {/* Títulos e Classificação */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {empresa.nome}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {empresa.nicho}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  • {empresa.segmento}
                </span>
              </div>
            </div>
          </div>

          {/* Botão ACESSAR SISTEMA DA EMPRESA */}
          <div className="shrink-0">
            <a
              href={empresa.link_sistema}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-acessar-sistema-empresa"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>ACESSAR SISTEMA DA EMPRESA</span>
              <ExternalLink className="w-4 h-4 text-sky-400" />
            </a>
          </div>
        </div>

        {/* Pequeno Resumo Operacional */}
        {empresa.resumo && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Resumo Operacional
            </span>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 border border-slate-200/60 rounded-lg p-3.5">
              {empresa.resumo}
            </p>
          </div>
        )}
      </div>

      {/* ÁREA DE RECADO DO DIA (MUITO EVIDENTE) */}
      <div id="area-recados-do-dia">
        {loadingRecados ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
            <span>Verificando recados de hoje...</span>
          </div>
        ) : recadosHoje.length > 0 ? (
          /* Card Chamativo de Atenção com Borda e Badge Pulsante */
          <div
            id="alerta-recados-hoje"
            className="bg-amber-50/70 border-2 border-amber-400 rounded-xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all"
          >
            {/* Header do Alerta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                    ⚠ ATENÇÃO
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-amber-950 tracking-tight mt-0.5">
                    {recadosHoje.length > 1
                      ? 'RECADOS DO DIA'
                      : 'RECADO DO DIA'}
                  </h2>
                </div>
              </div>

              {/* Data em Alto Destaque */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border-2 border-amber-400 text-amber-950 rounded-lg shadow-2xs shrink-0 self-start sm:self-auto">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-sm sm:text-base font-black tracking-tight">
                  {formatDataBr(hojeSp)}
                </span>
              </div>
            </div>

            {/* Lista de Recados de Hoje */}
            <div className="pt-4 space-y-3">
              {recadosHoje.map((recado, index) => (
                <div
                  key={recado.id}
                  className="bg-white border border-amber-300/80 rounded-lg p-4 shadow-2xs text-xs sm:text-sm text-slate-900 leading-relaxed font-medium whitespace-pre-wrap"
                >
                  {recadosHoje.length > 1 && (
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                      Aviso {index + 1}
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
            id="sem-recados-hoje"
            className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs flex items-center gap-3.5 text-slate-600"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800">
                Sem observações no momento.
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Não há comunicados específicos registrados para o atendimento de hoje ({formatDataBr(hojeSp)}).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
