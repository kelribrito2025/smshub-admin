import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface BannedAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BannedAccountModal({ open, onClose }: BannedAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold">Conta desativada</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-4 space-y-4">
            <p>
              Detectamos ações que violam de forma grave os nossos termos de serviço e, por isso, 
              esta conta foi <strong className="text-red-500">banida permanentemente</strong>.
            </p>
            <p>
              O uso da plataforma não será mais permitido a partir deste momento.
            </p>
            <p className="text-sm text-muted-foreground">
              Para esclarecimentos adicionais, fale com o suporte.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-4">
          <Button
            onClick={onClose}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
