import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { Agente } from '../../types';
import { createAgente, getAgentes } from '../../lib/firestoreService';

export const AgentesAdmin: React.FC = () => {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ nome: '', ramal: '', codigo_sonax: '26253', nicho_agente: 'SAC' as 'SAC' | 'CLINICAS' | 'SAC & CLINICA', turno: '', senha: '' });

  const carregar = async () => {
    try { setAgentes(await getAgentes()); } catch { setFeedback({ type: 'error', text: 'Não foi possível carregar os agentes.' }); } finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      await createAgente(form);
      setFeedback({ type: 'ok', text: `Agente cadastrado. Login criado: ${form.nome}` });
      setForm({ nome: '', ramal: '', codigo_sonax: '26253', nicho_agente: 'SAC', turno: '', senha: '' });
      await carregar();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Não foi possível cadastrar o agente.' });
    } finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"><UserPlus className="w-5 h-5" /></div>
        <div><h1 className="text-xl font-bold text-slate-900">Cadastro de Agentes</h1><p className="text-sm text-slate-600 mt-1 leading-relaxed">Esta tela é importante para a operação: cadastre aqui os agentes da Sonax In Home para que eles consigam fazer login no sistema. O nome informado será o login do agente e a senha será a definida abaixo.</p></div>
      </div>
    </div>

    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      {feedback && <div className={`p-3 rounded-lg border text-xs flex gap-2 ${feedback.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{feedback.type === 'ok' ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}<span>{feedback.text}</span></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome do agente"><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className="input-sonax" placeholder="Ex.: Lucas Santos" /></Field>
        <Field label="Ramal"><input required value={form.ramal} onChange={e=>setForm({...form,ramal:e.target.value})} className="input-sonax" placeholder="Ex.: 1042" /></Field>
        <Field label="Código da Sonax"><input required value={form.codigo_sonax} onChange={e=>setForm({...form,codigo_sonax:e.target.value})} className="input-sonax bg-slate-50" /></Field>
        <Field label="Nicho"><select value={form.nicho_agente} onChange={e=>setForm({...form,nicho_agente:e.target.value as any})} className="input-sonax"><option value="SAC">SAC</option><option value="CLINICAS">Clínicas</option><option value="SAC & CLINICA">SAC & Clínica</option></select></Field>
        <Field label="Turno"><input required value={form.turno} onChange={e=>setForm({...form,turno:e.target.value})} className="input-sonax" placeholder="Ex.: Manhã / 08h às 14h" /></Field>
        <Field label="Senha"><div className="relative"><KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input required minLength={6} type="password" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} className="input-sonax pl-9" placeholder="Mínimo 6 caracteres" /></div></Field>
      </div>
      <div className="flex justify-end pt-2"><button disabled={saving} className="px-5 py-2.5 rounded-lg bg-[#0f2b48] hover:bg-[#1a416a] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60">{saving && <Loader2 className="w-4 h-4 animate-spin"/>}Cadastrar agente</button></div>
    </form>

    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2"><Users className="w-4 h-4 text-sky-700"/><h2 className="text-sm font-bold text-slate-900">Agentes cadastrados</h2><span className="text-xs text-slate-400">({agentes.length})</span></div>
      {loading ? <div className="p-8 text-center text-xs text-slate-500">Carregando...</div> : agentes.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">Nenhum agente cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="text-left p-3">Nome / Login</th><th className="text-left p-3">Ramal</th><th className="text-left p-3">Nicho</th><th className="text-left p-3">Turno</th><th className="text-left p-3">Código</th></tr></thead><tbody>{agentes.map(a=><tr key={a.id} className="border-t border-slate-100"><td className="p-3 font-semibold text-slate-800">{a.nome}</td><td className="p-3">{a.ramal}</td><td className="p-3">{a.nicho_agente}</td><td className="p-3">{a.turno}</td><td className="p-3">{a.codigo_sonax}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
};

const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>{children}</label>;
