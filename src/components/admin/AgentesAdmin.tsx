import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Agente } from '../../types';
import { createAgente, deleteAgente, getAgentes, updateAgente } from '../../lib/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

const SUPERVISAO_GESTORA = 'supervisao@sonax.net.br';

type FormState = {
  nome: string;
  ramal: string;
  codigo_sonax: string;
  nicho_agente: 'SAC' | 'CLINICAS' | 'SAC & CLINICA';
  turno: string;
  senha: string;
};

const initialForm: FormState = {
  nome: '',
  ramal: '',
  codigo_sonax: '26253',
  nicho_agente: 'SAC',
  turno: '',
  senha: '',
};

export const AgentesAdmin: React.FC = () => {
  const { user } = useAuth();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const canManageAgents = useMemo(
    () => String(user?.email || '').trim().toLowerCase() === SUPERVISAO_GESTORA,
    [user?.email],
  );

  const carregar = async () => {
    setLoading(true);
    try {
      setAgentes(await getAgentes());
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível carregar os agentes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const limparEdicao = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const iniciarEdicao = (agente: Agente) => {
    if (!canManageAgents) return;
    setFeedback(null);
    setEditingId(agente.id);
    setForm({
      nome: agente.nome || agente.login || '',
      ramal: agente.ramal || '',
      codigo_sonax: agente.codigo_sonax || '26253',
      nicho_agente: agente.nicho_agente || 'SAC',
      turno: agente.turno || '',
      senha: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);

    try {
      if (editingId) {
        if (!canManageAgents) throw new Error('Este login não possui permissão para editar agentes.');
        await updateAgente(editingId, form);
        setFeedback({ type: 'ok', text: `Agente ${form.nome} atualizado com sucesso.` });
        limparEdicao();
      } else {
        await createAgente(form);
        setFeedback({ type: 'ok', text: `Agente cadastrado. Login criado: ${form.nome}` });
        setForm(initialForm);
      }
      await carregar();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || (editingId ? 'Não foi possível atualizar o agente.' : 'Não foi possível cadastrar o agente.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (agente: Agente) => {
    if (!canManageAgents) return;
    const confirmou = window.confirm(
      `Excluir o agente "${agente.nome}"?\n\nO login do agente também será removido do Supabase Auth.`,
    );
    if (!confirmou) return;

    setFeedback(null);
    setDeletingId(agente.id);
    try {
      await deleteAgente(agente.id);
      if (editingId === agente.id) limparEdicao();
      setFeedback({ type: 'ok', text: `Agente ${agente.nome} excluído com sucesso.` });
      await carregar();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Não foi possível excluir o agente.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 shadow-xs">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Cadastro de Agentes</h1>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Esta tela é importante para a operação: cadastre aqui os agentes da Sonax In Home para que eles consigam fazer login no sistema. O nome informado será o login do agente e a senha será a definida abaixo.
            </p>
            {canManageAgents && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                Edição e exclusão liberadas para {SUPERVISAO_GESTORA}.
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 shadow-xs space-y-4 min-w-0">
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex gap-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {editingId && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
            <div className="text-xs font-semibold">Você está editando um agente. A senha só será alterada se preencher o campo Senha.</div>
            <button
              type="button"
              onClick={limparEdicao}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md border border-amber-300 hover:bg-amber-100 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar edição
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Field label="Nome do agente">
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input-sonax"
              placeholder="Ex.: Lucas Santos"
            />
          </Field>
          <Field label="Ramal">
            <input
              required
              value={form.ramal}
              onChange={(e) => setForm({ ...form, ramal: e.target.value })}
              className="input-sonax"
              placeholder="Ex.: 1042"
            />
          </Field>
          <Field label="Código da Sonax">
            <input
              required
              value={form.codigo_sonax}
              onChange={(e) => setForm({ ...form, codigo_sonax: e.target.value })}
              className="input-sonax bg-slate-50"
            />
          </Field>
          <Field label="Nicho">
            <select
              value={form.nicho_agente}
              onChange={(e) => setForm({ ...form, nicho_agente: e.target.value as FormState['nicho_agente'] })}
              className="input-sonax"
            >
              <option value="SAC">SAC</option>
              <option value="CLINICAS">Clínicas</option>
              <option value="SAC & CLINICA">SAC & Clínica</option>
            </select>
          </Field>
          <Field label="Turno">
            <input
              required
              value={form.turno}
              onChange={(e) => setForm({ ...form, turno: e.target.value })}
              className="input-sonax"
              placeholder="Ex.: Manhã / 08h às 14h"
            />
          </Field>
          <Field label={editingId ? 'Nova senha (opcional)' : 'Senha'}>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                required={!editingId}
                minLength={form.senha ? 6 : undefined}
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="input-sonax pl-9"
                placeholder={editingId ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
              />
            </div>
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button
            disabled={saving}
            className={`px-5 py-2.5 rounded-lg text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60 ${
              editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0f2b48] hover:bg-[#1a416a]'
            }`}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingId ? 'Salvar alterações' : 'Cadastrar agente'}
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden min-w-0">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-700" />
          <h2 className="text-sm font-bold text-slate-900">Agentes cadastrados</h2>
          <span className="text-xs text-slate-400">({agentes.length})</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Carregando...</div>
        ) : agentes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">Nenhum agente cadastrado.</div>
        ) : (
          <div className="w-full overflow-x-hidden">
            <table className="w-full table-fixed text-xs sonax-fit-table">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-3 w-[28%]">Nome / Login</th>
                  <th className="text-left p-3 w-[11%]">Ramal</th>
                  <th className="text-left p-3 w-[18%]">Nicho</th>
                  <th className="text-left p-3 w-[19%]">Turno</th>
                  <th className="text-left p-3 w-[12%]">Código</th>
                  {canManageAgents && <th className="text-right p-3 w-[12%]">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {agentes.map((agente) => (
                  <tr key={agente.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-semibold text-slate-800 break-words" title={agente.nome}>
                      {agente.nome}
                    </td>
                    <td className="p-3 break-words">{agente.ramal}</td>
                    <td className="p-3 break-words">{agente.nicho_agente}</td>
                    <td className="p-3 break-words">{agente.turno}</td>
                    <td className="p-3 break-words">{agente.codigo_sonax}</td>
                    {canManageAgents && (
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(agente)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                            title="Editar agente"
                            aria-label={`Editar ${agente.nome}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => excluir(agente)}
                            disabled={deletingId === agente.id}
                            className="inline-flex items-center justify-center p-2 rounded-md text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
                            title="Excluir agente"
                            aria-label={`Excluir ${agente.nome}`}
                          >
                            {deletingId === agente.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block min-w-0">
    <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
    {children}
  </label>
);
