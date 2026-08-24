import React from 'react';
import { Loader2 } from 'lucide-react';
import { SonaxLogo } from './SonaxLogo';

export const LoadingScreen: React.FC = () => {
  return (
    <div
      id="sonax-loading-screen"
      className="min-h-screen w-full bg-[#0a1f33] flex flex-col items-center justify-center p-6 text-white select-none"
    >
      <div className="flex flex-col items-center gap-6">
        <SonaxLogo variant="light" size="lg" showSubtitle={true} />
        <div className="flex items-center gap-3 text-slate-300 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
          <span>Verificando credenciais e carregando sessão...</span>
        </div>
      </div>
    </div>
  );
};
