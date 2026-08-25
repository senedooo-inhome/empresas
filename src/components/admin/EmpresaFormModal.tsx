import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Globe,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { Empresa, SistemaLink } from '../../types';
import { getEmpresaLinks } from '../../lib/empresaLinks';
import { uploadEmpresaLogo } from '../../lib/firestoreService';

interface EmpresaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    nome: string;
    nicho: string;
    segmento: string;
    link_sistema: string;
    links_sistema: SistemaLink[];
    resumo: string;
    logo_url: string;
  }) => Promise<void>;
  empresaToEdit?: Empresa | null;
  existingNichos?: string[];
  existingSegmentos?: string[];
}

export const EmpresaFormModal: React.FC<EmpresaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  empresaToEdit,
}) => {
  const [nome, setNome] = useState('');
  const [nicho, setNicho] = useState<'CLINICA' | 'SAC'>('CLINICA');
  const [segmento, setSegmento] = useState('');
  const [linksSistema, setLinksSistema] = useState<SistemaLink[]>([
    { nome: 'Sistema principal', url: '' },
  ]);
  const [resumo, setResumo] = useState('');
  
  // Logo mode: 'url' | 'upload'
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (empresaToEdit) {
      setNome(empresaToEdit.nome || '');
      const currentNicho = (empresaToEdit.nicho || '').toUpperCase();
      setNicho(currentNicho === 'SAC' ? 'SAC' : 'CLINICA');
      setSegmento(empresaToEdit.segmento || '');
      const existingLinks = getEmpresaLinks(empresaToEdit);
      setLinksSistema(existingLinks.length ? existingLinks : [{ nome: 'Sistema principal', url: '' }]);
      setResumo(empresaToEdit.resumo || '');
      setLogoUrl(empresaToEdit.logo_url || '');
      setLogoMode('url');
      setSelectedFile(null);
      setFilePreview(null);
      setImgError(false);
    } else {
      setNome('');
      setNicho('CLINICA');
      setSegmento('');
      setLinksSistema([{ nome: 'Sistema principal', url: '' }]);
      setResumo('');
      setLogoUrl('');
      setLogoMode('url');
      setSelectedFile(null);
      setFilePreview(null);
      setImgError(false);
    }
    setErrorMsg(null);
  }, [empresaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PNG, JPG/JPEG, WEBP
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Selecione uma imagem PNG, JPG ou WEBP de até 5 MB.');
      return;
    }

    // Validate size: max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('O arquivo excede o limite de 5 MB.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setImgError(false);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!nome.trim()) {
      setErrorMsg('O nome da empresa é obrigatório.');
      return;
    }
    if (!nicho.trim()) {
      setErrorMsg('O nicho é obrigatório.');
      return;
    }
    if (!segmento.trim()) {
      setErrorMsg('O segmento é obrigatório.');
      return;
    }
    const normalizedLinks = linksSistema.map((item) => ({
      nome: item.nome.trim(),
      url: item.url.trim(),
    }));
    if (!normalizedLinks.length || normalizedLinks.some((item) => !item.nome || !item.url)) {
      setErrorMsg('Preencha o nome e o endereço de todos os sistemas.');
      return;
    }
    if (normalizedLinks.some((item) => !validateUrl(item.url))) {
      setErrorMsg('Informe URLs válidas para todos os sistemas (ex.: https://sistema.empresa.com.br).');
      return;
    }
    if (!resumo.trim()) {
      setErrorMsg('O pequeno resumo é obrigatório.');
      return;
    }

    let finalLogoUrl = logoUrl.trim();

    if (logoMode === 'upload') {
      if (!selectedFile && !finalLogoUrl) {
        setErrorMsg('Por favor, selecione um arquivo de logo para upload.');
        return;
      }
    } else {
      if (!finalLogoUrl) {
        setErrorMsg('Por favor, informe a URL da logo.');
        return;
      }
      if (!validateUrl(finalLogoUrl)) {
        setErrorMsg('Por favor, informe uma URL de logo válida (ex: https://site.com/logo.png).');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (logoMode === 'upload' && selectedFile) {
        // Perform upload to Firebase Storage
        const tempId = empresaToEdit?.id || `empresa_${Date.now()}`;
        finalLogoUrl = await uploadEmpresaLogo(tempId, selectedFile);
      }

      await onSave({
        nome: nome.trim(),
        nicho: nicho.trim(),
        segmento: segmento.trim(),
        link_sistema: normalizedLinks[0].url,
        links_sistema: normalizedLinks,
        resumo: resumo.trim(),
        logo_url: finalLogoUrl,
      });

      onClose();
    } catch (err: any) {
      console.error('[EmpresaForm] Erro ao salvar:', err);
      setErrorMsg('Não foi possível salvar a empresa. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPreview = logoMode === 'upload' ? filePreview || logoUrl : logoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="empresa-form-modal">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {empresaToEdit ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <p className="text-xs text-slate-500">
                {empresaToEdit
                  ? 'Atualize as informações cadastrais da empresa.'
                  : 'Cadastre uma nova empresa atendida pela operação.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nome da Empresa */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nome da Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: EZVOLT"
              disabled={submitting}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
              required
            />
          </div>

          {/* Nicho e Segmento (Grid 2 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nicho: Restrito a CLINICA ou SAC */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nicho <span className="text-red-500">*</span>
              </label>
              <select
                value={nicho}
                onChange={(e) => setNicho(e.target.value as 'CLINICA' | 'SAC')}
                disabled={submitting}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs cursor-pointer font-medium"
              >
                <option value="CLINICA">CLINICA</option>
                <option value="SAC">SAC</option>
              </select>
            </div>

            {/* Segmento: Inserido de forma manual */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Segmento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                placeholder="Ex.: Oftalmologia, Odontologia, Telecom..."
                disabled={submitting}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                required
              />
            </div>
          </div>

          {/* Links dos Sistemas */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block font-semibold text-slate-700">
                  Links dos Sistemas <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">Adicione um botão para cada sistema utilizado pela empresa.</p>
              </div>
              <button
                type="button"
                onClick={() => setLinksSistema((items) => [...items, { nome: '', url: '' }])}
                disabled={submitting}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar link
              </button>
            </div>

            {linksSistema.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-[0.8fr_1.4fr_auto] gap-2 items-end">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Nome do sistema</label>
                  <input
                    type="text"
                    value={item.nome}
                    onChange={(e) => setLinksSistema((items) => items.map((link, i) => i === index ? { ...link, nome: e.target.value } : link))}
                    placeholder="Ex.: Painel principal"
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Endereço</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => setLinksSistema((items) => items.map((link, i) => i === index ? { ...link, url: e.target.value } : link))}
                      placeholder="https://sistema.empresa.com.br"
                      disabled={submitting}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLinksSistema((items) => items.filter((_, i) => i !== index))}
                  disabled={submitting || linksSistema.length === 1}
                  title="Remover link"
                  className="h-[34px] w-[34px] inline-flex items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Pequeno Resumo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pequeno Resumo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Explique rapidamente para o agente a operação e o objetivo do atendimento desta empresa..."
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs resize-none"
              required
            />
          </div>

          {/* Logo da Empresa (URL ou Upload) */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-700">
                Logo da Empresa <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    logoMode === 'url' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3 h-3 inline mr-1" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    logoMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3 inline mr-1" />
                  Upload
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              {/* Preview Thumbnail */}
              <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {currentPreview && !imgError ? (
                  <img
                    src={currentPreview}
                    alt="Preview Logo"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[9px] mt-0.5 font-medium">Sem logo</span>
                  </div>
                )}
              </div>

              {/* Input according to mode */}
              <div className="flex-1">
                {logoMode === 'url' ? (
                  <div>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setImgError(false);
                      }}
                      placeholder="https://exemplo.com/logo.png"
                      disabled={submitting}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Informe o endereço direto da imagem da logomarca (PNG, JPG ou WEBP).
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      disabled={submitting}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className="px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-700 font-medium text-xs flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedFile ? selectedFile.name : 'Selecionar arquivo do computador'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1">
                      PNG, JPG ou WEBP de até 5 MB (será armazenado no Firebase Storage).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#0f2b48] hover:bg-[#1a416a] text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>{empresaToEdit ? 'Atualizar Empresa' : 'Salvar Empresa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
