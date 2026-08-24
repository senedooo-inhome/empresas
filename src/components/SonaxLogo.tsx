import React from 'react';

interface SonaxLogoProps {
  variant?: 'light' | 'dark' | 'brand' | 'cyan';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
}

export const SonaxLogo: React.FC<SonaxLogoProps> = ({
  variant = 'brand',
  size = 'md',
}) => {
  const sizeConfig = {
    sm: { text: 'text-lg tracking-wider' },
    md: { text: 'text-xl tracking-wider' },
    lg: { text: 'text-2xl tracking-wider' },
    xl: { text: 'text-3xl sm:text-4xl tracking-widest' },
    '2xl': { text: 'text-4xl sm:text-5xl tracking-widest' },
  }[size];

  // Configuração de cores por variante
  let mainColor = 'text-[#00709e]';
  let accentColor = 'text-[#005a7f]';

  if (variant === 'cyan') {
    mainColor = 'text-[#38bdf8]';
    accentColor = 'text-sky-300';
  } else if (variant === 'light') {
    mainColor = 'text-white';
    accentColor = 'text-sky-200';
  } else if (variant === 'dark') {
    mainColor = 'text-[#00709e]';
    accentColor = 'text-slate-600';
  } else {
    // brand
    mainColor = 'text-[#00709e]';
    accentColor = 'text-sky-700';
  }

  return (
    <div
      className="inline-flex items-center justify-center select-none"
      id="sonax-text-logo"
    >
      <span
        className={`font-black uppercase leading-none font-sans ${sizeConfig.text} ${mainColor}`}
        style={{
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '0.08em',
        }}
      >
        SONAX <span className={`font-bold ${accentColor}`}>IN HOME</span>
      </span>
    </div>
  );
};
