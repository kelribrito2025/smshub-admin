import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface BannedAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BannedAccountModal({ open, onClose }: BannedAccountModalProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!open) {
      setCountdown(10);
      return;
    }

    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose(); // Auto-close after 10 seconds
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto">
          <div className="bg-black border-4 border-red-500 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">

            {/* Header */}
            <div className="relative bg-gradient-to-r from-red-500/20 to-red-600/20 border-b-2 border-red-500/30 p-6">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(239,68,68,0.1)_50%,transparent_75%)] bg-[length:20px_20px]" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-400 font-mono">
                      CONTA DESATIVADA
                    </h2>
                    <p className="text-red-400/60 text-sm font-mono mt-1">
                      Acesso negado ao sistema
                    </p>
                  </div>
                </div>

                {/* X button (visual only, blocked) */}
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border-2 border-red-500 text-red-400/50 flex items-center justify-center cursor-not-allowed">
                  <X className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6">
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6">
                  <p className="text-gray-300 font-mono text-base leading-relaxed">
                    Detectamos ações que violam de forma grave os nossos termos de serviço e, por isso, esta conta foi{' '}
                    <span className="text-red-400 font-bold">banida permanentemente</span>.
                  </p>
                </div>

                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6">
                  <p className="text-gray-300 font-mono text-base leading-relaxed">
                    O uso da plataforma não será mais permitido a partir deste momento.
                  </p>
                </div>

                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6">
                  <p className="text-gray-400 font-mono text-sm leading-relaxed">
                    Para esclarecimentos adicionais, fale com o suporte.
                  </p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="text-7xl font-bold text-red-500 tabular-nums font-mono animate-pulse">
                  {countdown}
                </div>
                <p className="text-gray-400 font-mono text-sm">
                  Você será desconectado automaticamente
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
