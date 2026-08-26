import React, { useEffect, useState } from 'react';
import { Users, UserCheck, AlertTriangle, RefreshCw, Clock3 } from 'lucide-react';
import { getDashboardSupervisao } from '../../lib/firestoreService';

export const DashboardSupervisao: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setData(await getDashboardSupervisao()); } finally { setLoading(false); } };
  useEffect(()=>{ load(); const id=setInterval(load,30000); return()=>clearInterval(id); },[]);
  if (loading && !data) return <div className="p-10 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2"/>Carregando acompanhamento...</div>;
  const agentes=data?.agentes||[], acessos=data?.acessos_hoje||[], pendentes=data?.pendentes_ciencia||[];
  return <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card icon={<Users className="w-5 h-5"/>} title="Agentes cadastrados" value={agentes.length} />
      <Card icon={<UserCheck className="w-5 h-5"/>} title="Entraram no sistema hoje" value={acessos.length} />
      <Card icon={<AlertTriangle className="w-5 h-5"/>} title="Com recados pendentes" value={pendentes.length} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"><Header title="Agentes que entraram hoje"/><div className="divide-y divide-slate-100">{acessos.length?acessos.map((a:any)=><div key={a.id} className="p-4 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-900">{a.nome}</div><div className="text-[11px] text-slate-500">Ramal {a.ramal||'—'} • {a.turno||'Turno não informado'}</div></div><div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5"/>{a.ultimo_acesso_hoje?new Date(a.ultimo_acesso_hoje).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Hoje'}</div></div>):<Empty text="Nenhum agente entrou no sistema hoje."/>}</div></section>
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"><Header title="Não clicaram em Eu li / Estou ciente"/><div className="divide-y divide-slate-100">{pendentes.length?pendentes.map((a:any)=><div key={a.id} className="p-4 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-900">{a.nome}</div><div className="text-[11px] text-slate-500">{a.nicho_agente||'Agente'} • Ramal {a.ramal||'—'}</div></div><span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{a.recados_pendentes} pendente(s)</span></div>):<Empty text="Todos estão cientes dos recados vigentes."/>}</div></section>
    </div>
  </div>;
};
const Card=({icon,title,value}:{icon:React.ReactNode;title:string;value:number})=><div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4"><div className="w-11 h-11 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">{icon}</div><div><div className="text-2xl font-black text-slate-900">{value}</div><div className="text-xs text-slate-500">{title}</div></div></div>;
const Header=({title}:{title:string})=><div className="p-4 border-b border-slate-200"><h2 className="text-sm font-bold text-slate-900">{title}</h2></div>;
const Empty=({text}:{text:string})=><div className="p-8 text-center text-xs text-slate-500">{text}</div>;
