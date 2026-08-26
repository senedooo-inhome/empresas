import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { RecadoLeituraStatus } from '../../types';
import { confirmarLeituraRecado, getRecadosVigentesComLeitura } from '../../lib/firestoreService';
import { formatDataBr } from '../../lib/dateUtils';

export const RecadosIniciaisAgente: React.FC = () => {
  const [recados,setRecados]=useState<RecadoLeituraStatus[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState<string|null>(null);
  const load=async()=>{try{setRecados(await getRecadosVigentesComLeitura());}finally{setLoading(false)}};
  useEffect(()=>{load(); const id=setInterval(load,15000); return()=>clearInterval(id)},[]);
  const confirmar=async(id:string)=>{setSaving(id);try{await confirmarLeituraRecado(id);await load();}finally{setSaving(null)}};
  if(loading)return <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-500 flex gap-2 items-center"><RefreshCw className="w-4 h-4 animate-spin"/>Carregando recados vigentes...</div>;
  if(!recados.length)return null;
  return <section className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-5 space-y-4"><div className="flex gap-3"><div className="w-9 h-9 bg-amber-500 text-white rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5"/></div><div><h2 className="text-base font-black text-slate-900">Recados importantes</h2><p className="text-xs text-slate-600">Leia cada comunicado e confirme individualmente. Se um recado for atualizado, será necessário confirmar novamente.</p></div></div><div className="space-y-3">{recados.map(r=><div key={r.id} className="bg-white border border-amber-200 rounded-lg p-4"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase text-amber-700">{r.empresa_nome||'Empresa'} • {formatDataBr(r.data_inicio)} a {formatDataBr(r.data_fim)}</div><p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{r.mensagem}</p></div>{r.lido?<span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold"><Check className="w-4 h-4"/>Ciente</span>:<button onClick={()=>confirmar(r.id)} disabled={saving===r.id} className="shrink-0 px-4 py-2 rounded-lg bg-[#0f2b48] text-white text-xs font-bold disabled:opacity-60">{saving===r.id?'Salvando...':r.teve_leitura_anterior?'Estou ciente da atualização':'Eu li'}</button>}</div></div>)}</div></section>;
};
