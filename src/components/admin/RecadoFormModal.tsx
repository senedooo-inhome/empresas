import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Building2, Calendar, Loader2, AlertCircle, Check } from 'lucide-react';
import { Empresa, Recado } from '../../types';
import { getTodaySaoPaulo } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDataBr } from '../../lib/dateUtils';

interface RecadoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { empresa_id: string; data_inicio: string; data_fim: string; data_recado: string; mensagem: string; criado_por: string }) => Promise<void>;
  recadoToEdit?: Recado | null;
  empresas: Empresa[];
  initialEmpresaId?: string;
  initialData?: string;
}

export const RecadoFormModal: React.FC<RecadoFormModalProps> = ({ isOpen, onClose, onSave, recadoToEdit, empresas, initialEmpresaId, initialData }) => {
  const { user } = useAuth();
  const hojeSp = getTodaySaoPaulo();
  const [empresaId, setEmpresaId] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeSp);
  const [dataFim, setDataFim] = useState(hojeSp);
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectableEmpresas = empresas.filter((e) => e.ativo || (recadoToEdit && e.id === recadoToEdit.empresa_id));

  useEffect(() => {
    if (recadoToEdit) {
      setEmpresaId(recadoToEdit.empresa_id || '');
      setDataInicio(recadoToEdit.data_inicio || recadoToEdit.data_recado || hojeSp);
      setDataFim(recadoToEdit.data_fim || recadoToEdit.data_recado || hojeSp);
      setMensagem(recadoToEdit.mensagem || '');
    } else {
      const base = initialData || hojeSp;
      setEmpresaId(initialEmpresaId || selectableEmpresas[0]?.id || '');
      setDataInicio(base);
      setDataFim(base);
      setMensagem('');
    }
    setErrorMsg(null);
  }, [recadoToEdit, isOpen, initialEmpresaId, initialData, selectableEmpresas.length, hojeSp]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!empresaId) return setErrorMsg('Selecione uma empresa válida.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) return setErrorMsg('Informe um período válido.');
    if (dataFim < dataInicio) return setErrorMsg('A data final não pode ser anterior à data inicial.');
    if (!mensagem.trim()) return setErrorMsg('A mensagem do recado é obrigatória.');

    setSubmitting(true);
    try {
      await onSave({
        empresa_id: empresaId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        data_recado: dataInicio,
        mensagem: mensagem.trim(),
        criado_por: recadoToEdit?.criado_por || user?.id || 'supervisao',
      });
      onClose();
    } catch (err) {
      console.error('[RecadoForm] Erro ao salvar recado:', err);
      const apiDetails = (err as any)?.data?.details || (err as any)?.data?.error || (err as any)?.message;
      setErrorMsg(apiDetails ? `Não foi possível salvar o recado: ${apiDetails}` : 'Não foi possível salvar o recado. Tente novamente.');
    } finally { setSubmitting(false); }
  };

  const selectedEmpresa = empresas.find((e) => e.id === empresaId);

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="recado-form-modal">
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={submitting ? undefined : onClose} />
    <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden z-10 my-8">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div><div><h3 className="text-base font-bold text-slate-900">{recadoToEdit ? 'Editar Recado' : 'Novo Recado'}</h3><p className="text-xs text-slate-500">Defina o período em que o comunicado ficará visível aos agentes.</p></div></div>
        <button type="button" onClick={onClose} disabled={submitting} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5"/></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/><span>{errorMsg}</span></div>}
        <div><label className="block font-semibold text-slate-700 mb-1">Empresa <span className="text-red-500">*</span></label><select value={empresaId} onChange={e=>setEmpresaId(e.target.value)} disabled={submitting} className="input-sonax" required><option value="" disabled>Selecione uma empresa...</option>{selectableEmpresas.map(emp=><option key={emp.id} value={emp.id}>{emp.nome} ({emp.nicho}) {!emp.ativo ? '[Inativa]' : ''}</option>)}</select>{selectedEmpresa && <div className="flex items-center gap-2 p-2 mt-1.5 bg-slate-50 border border-slate-200 rounded-lg"><Building2 className="w-4 h-4 text-slate-400"/><span className="text-[11px] text-slate-600">{selectedEmpresa.nome} • {selectedEmpresa.nicho}</span></div>}</div>
        <div><div className="flex items-center justify-between mb-1"><label className="font-semibold text-slate-700">Período do Recado <span className="text-red-500">*</span></label><span className="text-[10px] text-slate-400">Hoje: {formatDataBr(hojeSp)}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label><span className="block text-[10px] font-semibold text-slate-500 mb-1">De</span><div className="relative"><Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400"/><input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="input-sonax pl-8" required /></div></label><label><span className="block text-[10px] font-semibold text-slate-500 mb-1">Até</span><div className="relative"><Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400"/><input type="date" value={dataFim} min={dataInicio} onChange={e=>setDataFim(e.target.value)} className="input-sonax pl-8" required /></div></label></div><p className="text-[10px] text-slate-500 mt-1.5">O recado ficará visível durante todo esse período, incluindo a data inicial e a final.</p></div>
        <div><label className="block font-semibold text-slate-700 mb-1">Recado / Comunicado Operacional <span className="text-red-500">*</span></label><textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} rows={5} className="input-sonax resize-none" placeholder="Digite as orientações que o agente deve ler e confirmar..." required /></div>
        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5"><button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg">Cancelar</button><button type="submit" disabled={submitting || selectableEmpresas.length===0} className="px-4 py-2 bg-[#0f2b48] text-white font-semibold rounded-lg flex gap-2 items-center disabled:opacity-60">{submitting?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Check className="w-3.5 h-3.5 text-sky-400"/>}{recadoToEdit?'Atualizar Recado':'Salvar Recado'}</button></div>
      </form>
    </div>
  </div>;
};
