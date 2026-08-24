import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { SonaxLogo } from './SonaxLogo';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useNavigation();

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let normalizedUser = usuario.trim();

    if (!normalizedUser || !senha) {
      setErrorMessage('Por favor, preencha o usuário e a senha.');
      return;
    }

    // Facilidade: se digitar apenas o nome do usuário sem @, mapeia para o email correspondente
    if (!normalizedUser.includes('@')) {
      if (normalizedUser.toLowerCase() === 'sonaxinhome') {
        normalizedUser = 'sonaxinhome@gmail.com';
      } else if (normalizedUser.toLowerCase() === 'supervisao') {
        normalizedUser = 'supervisao@sonax.net.br';
      }
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const userProfile = await login(normalizedUser, senha);
      if (userProfile.role === 'agente') {
        navigate('/portal');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      console.error('[Login technical error]', err);
      if (err.message && (err.message.includes('não autorizado') || err.message.includes('sem perfil'))) {
        setErrorMessage('Usuário não autorizado para acessar este sistema.');
      } else {
        setErrorMessage('Usuário ou senha inválidos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="login-screen"
      className="min-h-screen w-full bg-[#00709e] flex flex-col items-center justify-center p-4 select-none relative"
    >
      <div className="w-full max-w-[340px] flex flex-col items-center">
        {/* Logo Sonax Cloud + Handset */}
        <div className="mb-10 flex flex-col items-center justify-center">
          <SonaxLogo variant="cyan" size="xl" showSubtitle={false} />
        </div>

        {/* Form Container */}
        <div className="w-full">
          <h1 className="text-white text-base sm:text-lg font-normal mb-4 tracking-normal text-left">
            Login de Agente
          </h1>

          {errorMessage && (
            <div
              id="login-error-message"
              className="mb-4 p-2.5 rounded bg-red-900/80 border border-red-500/60 text-white text-xs flex items-center gap-2 leading-tight"
            >
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Campo Usuário */}
            <div>
              <input
                id="login-usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuário"
                autoComplete="username"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-[#006087]/50 border border-[#2090b8] rounded text-sm text-white placeholder-sky-200/70 focus:outline-none focus:border-sky-300 focus:bg-[#005a7f] transition-all disabled:opacity-50"
                required
              />
            </div>

            {/* Campo Senha */}
            <div>
              <input
                id="login-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-[#006087]/50 border border-[#2090b8] rounded text-sm text-white placeholder-sky-200/70 focus:outline-none focus:border-sky-300 focus:bg-[#005a7f] transition-all disabled:opacity-50"
                required
              />
            </div>

            {/* Botão ENTRAR */}
            <div className="pt-0.5">
              <button
                type="submit"
                id="login-submit-button"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#005e86] hover:bg-[#005378] active:bg-[#004a6c] border border-[#208eb6] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                    <span>ENTRANDO...</span>
                  </>
                ) : (
                  <span>ENTRAR</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Text */}
        <div className="mt-14 text-center text-sky-200/70 text-xs font-normal">
          2018 © Sonavoip pabx.
        </div>
      </div>
    </div>
  );
};
