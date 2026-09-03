import React from 'react';
import { ArrowRight, Headphones, Stethoscope } from 'lucide-react';

interface PortalNichoSelectorProps {
  onSelectClinica: () => void;
  onSelectSac: () => void;
  clinicaCount: number;
  sacCount: number;
  loading?: boolean;
}

export const PortalNichoSelector: React.FC<PortalNichoSelectorProps> = ({
  onSelectClinica,
  onSelectSac,
  clinicaCount,
  sacCount,
  loading = false,
}) => {
  return (
    <section className="w-full max-w-5xl mx-auto py-6 sm:py-12" id="portal-nicho-selector">
      <div className="text-center mb-8 sm:mb-10">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-extrabold uppercase tracking-wider text-sky-700">
          Portal Operacional
        </span>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Selecione o tipo de atendimento
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Escolha um nicho para visualizar somente as empresas e os recados correspondentes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <button
          type="button"
          id="btn-nicho-clinica"
          onClick={onSelectClinica}
          className="group relative overflow-hidden text-left bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-7 h-7" />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">CLÍNICA</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Acesse as empresas e os recados cadastrados no nicho Clínica.
                </p>
                <span className="inline-flex mt-4 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">
                  {loading ? 'Carregando empresas...' : `${clinicaCount} ${clinicaCount === 1 ? 'empresa ativa' : 'empresas ativas'}`}
                </span>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          id="btn-nicho-sac"
          onClick={onSelectSac}
          className="group relative overflow-hidden text-left bg-white border-2 border-slate-200 hover:border-sky-400 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-sky-50 group-hover:bg-sky-100 transition-colors" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">SAC</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Acesse as empresas e os recados cadastrados no nicho SAC.
                </p>
                <span className="inline-flex mt-4 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">
                  {loading ? 'Carregando empresas...' : `${sacCount} ${sacCount === 1 ? 'empresa ativa' : 'empresas ativas'}`}
                </span>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-full bg-sky-600 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-6">
        Você pode voltar a esta tela a qualquer momento pelo logo da Sonax ou pelo botão “Trocar nicho”.
      </p>
    </section>
  );
};
