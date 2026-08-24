import React, { useState } from 'react';
import { Empresa } from '../../types';
import { Building2, ChevronRight } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';

interface EmpresaCardProps {
  empresa: Empresa;
  onClick?: () => void;
}

export const EmpresaCard: React.FC<EmpresaCardProps> = ({ empresa, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getInitial = () => {
    return empresa.nome?.charAt(0)?.toUpperCase() || 'E';
  };

  return (
    <div
      onClick={handleClick}
      id={`empresa-card-${empresa.id}`}
      className="group bg-white rounded-xl border border-slate-200/90 hover:border-sky-400 p-4 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md flex items-center justify-between gap-3 text-left relative overflow-hidden"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Logo Container */}
        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-200 group-hover:bg-sky-50/40 transition-colors">
          {empresa.logo_url && !imgError ? (
            <img
              src={empresa.logo_url}
              alt={empresa.nome}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-base text-slate-600 bg-slate-100">
              {getInitial()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-800 transition-colors">
            {empresa.nome}
          </h3>
          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
            {empresa.segmento || empresa.nicho}
          </p>
        </div>
      </div>

      {/* Action Indicator */}
      <div className="w-7 h-7 rounded-md bg-slate-50 group-hover:bg-sky-500 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
};
