import { useState, useEffect } from 'react';

interface CyberBannerProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export default function CyberBanner({
  title = "Quer utilizar nossos serviços?",
  subtitle = "Crie uma conta em nosso painel para começar a utilizar nossos serviços e receba benefícios imperdíveis.",
  buttonText = "Criar conta",
  onButtonClick = () => {}
}: CyberBannerProps) {
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-7xl mx-auto p-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-black via-gray-900 to-black border-2 border-green-500 shadow-2xl shadow-green-500/20">
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Scanning Line Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent ${scanLine}%, rgba(34, 197, 94, 0.1) ${scanLine + 1}%, transparent ${scanLine + 2}%)`
          }}
        />

        {/* Status Indicators */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <div className="absolute top-4 left-10 w-3 h-3 bg-green-500/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />

        {/* Audio Bars */}
        <div className="absolute bottom-4 right-4 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-green-500 rounded-full"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animation: 'pulse 2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Corner Borders */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-green-500/30 rounded-tl-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-green-500/30 rounded-br-3xl" />

        {/* Content */}
        <div className="relative z-10 px-8 py-16 md:py-20 text-center">
          <div className="mb-6">
            <div className="inline-block">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 font-mono tracking-tight">
                {title}
              </h2>
              <div className="h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" />
            </div>
          </div>

          <p className="text-gray-300 text-base md:text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>

          <button
            onClick={onButtonClick}
            className="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-black bg-green-500 rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/50"
          >
            <div className="absolute inset-0 w-0 bg-green-400 transition-all duration-300 ease-out group-hover:w-full" />

            <span className="relative z-10 flex items-center gap-2 font-mono">
              {buttonText}
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>

            <div className="absolute inset-0 border-2 border-green-300/0 rounded-full group-hover:border-green-300/50 transition-all duration-300" />
          </button>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-green-500/60 font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>SISTEMA ONLINE</span>
            </div>
            <div className="w-1 h-1 bg-green-500/30 rounded-full" />
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>SEGURO</span>
            </div>
          </div>
        </div>

        {/* Inner Border */}
        <div className="absolute inset-0 border-2 border-green-500/10 rounded-3xl pointer-events-none" />
      </div>
    </div>
  );
}
