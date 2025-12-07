import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { AlertTriangle } from 'lucide-react';

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

  return (
    <Dialog open={open} onOpenChange={() => {}}> {/* Prevent manual close */}
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold">Conta desativada</DialogTitle>
          </div>
          <div className="text-base leading-relaxed pt-4 space-y-4 text-muted-foreground">
            <p>
              Detectamos ações que violam de forma grave os nossos termos de serviço e, por isso, 
              esta conta foi <strong className="text-red-500">banida permanentemente</strong>.
            </p>
            <p>
              O uso da plataforma não será mais permitido a partir deste momento.
            </p>
            <p className="text-sm">
              Para esclarecimentos adicionais, fale com o suporte.
            </p>
          </div>
        </DialogHeader>
        <div className="flex justify-center mt-6">
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-bold text-red-500 tabular-nums">
              {countdown}
            </div>
            <p className="text-sm text-muted-foreground">
              Você será desconectado automaticamente
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
