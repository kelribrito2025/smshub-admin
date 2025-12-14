import { useState, useEffect } from 'react';
import { Shield, Zap, Globe, ArrowRight } from 'lucide-react';

interface CyberBannerProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export default function CyberBanner({
  title = "Números virtuais para verificação de contas",
  subtitle = "Receba SMS online sem precisar de chip físico. Ativação imediata, + de 20 países.",
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

  const features = [
    "Receba SMS online sem precisar de chip físico. Ativação imediata, mais de 20 países.",
    "Interface intuitiva com busca inteligente de serviços.",
    "Receba SMS ilimitados por até 20 minutos. Tempo suficiente para validação de contas.",
    "Preços competitivos e transparentes. Pague apenas pelo serviço que utilizar, sem surpresas.",
    "Cada número virtual é vendido apenas uma vez, garantindo privacidade total.",
    "Indicado para empresas, marketing, testes, validações e uso pessoal.",
    "Estorno automático em caso de não recebimento de SMS. Mais segurança e confiança para sua compra."
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative min-h-[400px] bg-black text-white rounded-2xl overflow-hidden border-2 border-red-600">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, 0.03) 25%, rgba(34, 197, 94, 0.03) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.03) 75%, rgba(34, 197, 94, 0.03) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, 0.03) 25%, rgba(34, 197, 94, 0.03) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.03) 75%, rgba(34, 197, 94, 0.03) 76%, transparent 77%, transparent)
              `,
              backgroundSize: '80px 80px'
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent ${scanLine}%, rgba(34, 197, 94, 0.03) ${scanLine + 1}%, transparent ${scanLine + 2}%)`
            }}
          />
        </div>

        {/* Top Section with Title */}
        <div className="relative border-b-2 border-red-600 p-6 bg-black">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-green-500/50 rounded-full" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-green-400 font-mono">
              {title}
            </h2>
          </div>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            {subtitle}
          </p>
        </div>

        {/* Features List */}
        <div className="relative p-8 space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 text-gray-300">
              <span className="text-green-400 mt-1 flex-shrink-0">&gt;</span>
              <p className="text-sm md:text-base leading-relaxed">{feature}</p>
            </div>
          ))}
        </div>

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-green-500/20" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-green-500/20" />
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl overflow-hidden border-2 border-red-600 p-8 md:p-12">
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, 0.05) 25%, rgba(34, 197, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, 0.05) 75%, rgba(34, 197, 94, 0.05) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Status Indicators */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-green-500/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

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

        {/* Content */}
        <div className="relative z-10 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 font-mono">
            Quer utilizar nossos serviços?
          </h3>
          <p className="text-gray-300 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Crie uma conta em nosso painel para começar a utilizar nossos serviços e receba benefícios imperdíveis.
          </p>

          <button
            onClick={onButtonClick}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-black font-bold text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50"
          >
            <span className="font-mono">{buttonText}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 border-2 border-green-300/0 rounded-full group-hover:border-green-300/50 transition-all duration-300" />
          </button>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-green-500/60 font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>SISTEMA ONLINE</span>
            </div>
            <div className="w-1 h-1 bg-green-500/30 rounded-full" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>SEGURO</span>
            </div>
          </div>
        </div>

        {/* Corner Borders */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-green-500/20 rounded-tl-2xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-green-500/20 rounded-br-2xl" />
      </div>
    </div>
  );
}
