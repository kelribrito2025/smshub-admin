import { useState, useEffect } from 'react';
import { Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { useStoreAuth } from '../contexts/StoreAuthContext';

export default function HeroSection() {
  const { openLoginModal, openRegisterModal } = useStoreAuth();

  const [typedText, setTypedText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const phrases = [
    'verificação de contas',
    'receber SMS online',
    'privacidade e segurança'
  ];



  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typing effect
  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (!isDeleting && typedText === currentPhrase) {
      // Pause when phrase is complete
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }
    
    if (isDeleting && typedText === '') {
      // Move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        // Delete one character
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
      } else {
        // Type one character
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
      }
    }, isDeleting ? 50 : 100);
    
    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, currentPhraseIndex]);

  return (
    <div className="text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
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

      </div>

      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-4" style={{paddingTop: '0px', height: '798px'}}>
        <div className="max-w-7xl mx-auto text-center" style={{height: '529px'}}>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-8 animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-400 text-sm font-mono">SISTEMA ONLINE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 font-mono tracking-tight">
            <span className="text-white">Número virtual para</span>
            <br />
            <span className="text-green-400 relative inline-block">
              {typedText}
              <span className={`ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity`}>|</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed">
            Gere números virtuais em segundos. Evite bloqueios, preserve sua privacidade e teste tudo com segurança total.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={openLoginModal}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-green-500 text-green-500 font-bold text-lg rounded-full transition-all duration-300 hover:scale-105 hover:bg-green-500/10"
            >
              <span className="font-mono">Login</span>
            </button>
            <button
              onClick={openRegisterModal}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-black font-bold text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50"
            >
              <span className="font-mono">Criar conta</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 border-2 border-green-300/0 rounded-full group-hover:border-green-300/50 transition-all duration-300" />
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-green-500/60 font-mono">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>SEGURO</span>
            </div>
            <div className="w-1 h-1 bg-green-500/30 rounded-full" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>INSTANTÂNEO</span>
            </div>
            <div className="w-1 h-1 bg-green-500/30 rounded-full" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>GLOBAL</span>
            </div>
          </div>
        </div>

        {/* Corner Accents */}
        <div className="absolute top-20 left-0 w-32 h-32 border-t-2 border-l-2 border-green-500/20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-green-500/20" />
      </section>
    </div>
  );
}
