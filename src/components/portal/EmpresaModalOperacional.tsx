import React, { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink, AlertTriangle, Info, Calendar, RefreshCw, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Empresa, RecadoLeituraStatus } from '../../types';
import { confirmarLeituraRecado, getRecadosVigentesComLeitura } from '../../lib/firestoreService';
import { useTodaySaoPaulo } from '../../lib/useTodaySaoPaulo';
import { formatDataBr } from '../../lib/dateUtils';
import { getEmpresaLinks } from '../../lib/empresaLinks';

interface EmpresaModalOperacionalProps { empresa: Empresa | null; isOpen: boolean; onClose: () => void; }

export const EmpresaModalOperacional: React.FC<EmpresaModalOperacionalProps> = ({ empresa, isOpen, onClose }) => {
  const hojeSp = useTodaySaoPaulo();
  const [recados, setRecados] = useState<RecadoLeituraStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const load = async () => {
    if (!empresa) return;
    setLoading(true);
    try { setRecados(await getRecadosVigentesComLeitura(empresa.id, hojeSp)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isOpen || !empresa) { setRecados([]); return; }
    setImgError(false); load();
  }, [isOpen, empresa?.id, hojeSp]);

  useEffect(() => { const fn=(e:KeyboardEvent)=>{if(e.key==='Escape'&&isOpen)onClose()}; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[isOpen,onClose]);

  const pendentes = useMemo(() => recados.filter(r=>!r.lido), [recados]);
  const desbloqueado = !loading && pendentes.length === 0;

  const confirmar = async (r: RecadoLeituraStatus) => {
    setSaving(r.id);
    try { await confirmarLeituraRecado(r.id); await load(); }
    finally { setSaving(null); }
  };

  if (!isOpen || !empresa) return null;
  const links = getEmpresaLinks(empresa);

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]" onClick={e=>e.stopPropagation()}>
      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
        <div className="flex items-center gap-3.5"><div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">{empresa.logo_url&&!imgError?<img src={empresa.logo_url} alt={empresa.nome} onError={()=>setImgError(true)} className="w-full h-full object-contain p-1.5"/>:<div className="font-bold text-lg text-slate-700">{empresa.nome?.charAt(0)?.toUpperCase()||'E'}</div>}</div><div><h2 className="text-lg sm:text-xl font-bold text-slate-900">{empresa.nome}</h2><span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-sky-100 text-sky-800 border border-sky-200">{empresa.nicho}</span></div></div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-200 flex items-center justify-center"><X className="w-5 h-5"/></button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <section className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-wider text-red-600">Recados da empresa</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md"><Calendar className="w-3.5 h-3.5"/>{formatDataBr(hojeSp)}</span></div>
          {loading ? <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/>Carregando recados vigentes...</div> : recados.length ? <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600"/><p className="text-xs font-bold text-amber-950">Leia todos os recados antes de acessar os sistemas desta empresa.</p></div>{recados.map(r=><div key={r.id} className="bg-white border border-amber-200 rounded-lg p-4"><div className="text-[10px] font-bold text-amber-700 uppercase">Período: {formatDataBr(r.data_inicio)} a {formatDataBr(r.data_fim)}</div><p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{r.mensagem}</p><div className="mt-3 flex justify-end">{r.lido?<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold"><CheckCircle2 className="w-4 h-4"/>Ciente</span>:<button onClick={()=>confirmar(r)} disabled={saving===r.id} className="px-4 py-2 bg-[#0f2b48] text-white rounded-lg text-xs font-bold disabled:opacity-60">{saving===r.id?'Salvando...':r.teve_leitura_anterior?'Estou ciente da atualização':'Eu li'}</button>}</div></div>)}</div> : <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3"><Info className="w-4 h-4 text-slate-400"/><p className="text-xs text-slate-600">Não há recados vigentes para esta empresa.</p></div>}
        </section>

        <section className={`rounded-xl p-4 sm:p-5 shadow-sm ${desbloqueado?'bg-[#00709e] text-white':'bg-slate-100 border border-slate-300 text-slate-600'}`}>
          <div className="flex items-center gap-2">{desbloqueado?<ExternalLink className="w-4 h-4"/>:<LockKeyhole className="w-4 h-4"/>}<div><div className="text-[10px] font-bold uppercase tracking-wider">Acesso Operacional</div><h3 className="text-sm font-bold">Sistemas de Atendimento</h3></div></div>
          {!desbloqueado && <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">Você ainda não leu todos os recados vigentes desta empresa. Confirme “Eu li” ou “Estou ciente da atualização” para liberar os links.</div>}
          <div className="flex flex-wrap gap-2 mt-3">{links.length?links.map((link,index)=>desbloqueado?<a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#00709e] font-extrabold text-xs rounded-lg uppercase"><span>{link.nome}</span><ExternalLink className="w-4 h-4"/></a>:<button key={`${link.url}-${index}`} disabled className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400 font-extrabold text-xs rounded-lg uppercase cursor-not-allowed"><span>{link.nome}</span><LockKeyhole className="w-4 h-4"/></button>):<span className="text-xs">Nenhum link cadastrado.</span>}</div>
        </section>

        {empresa.resumo && <section><span className="text-[11px] font-bold uppercase text-slate-500">Resumo Operacional</span><div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1.5">{empresa.resumo}</div></section>}
      </div>
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg">Fechar</button></div>
    </div>
  </div>;
};
