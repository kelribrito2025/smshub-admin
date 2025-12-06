import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface CancelActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  serviceName?: string;
}

export default function CancelActivationDialog({
  open,
  onOpenChange,
  onConfirm,
  serviceName,
}: CancelActivationDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirm = async () => {
    setIsCancelling(true);
    
    // Delay de 5 segundos antes de executar cancelamento
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      await onConfirm();
    } finally {
      setIsCancelling(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (!isCancelling) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-green-900/50 text-green-400 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-400 text-xl font-bold uppercase">
            Ação
          </DialogTitle>
          <DialogDescription className="text-green-600 text-base mt-4">
            Confirmar cancelamento? O saldo utilizado será devolvido integralmente.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex-1 bg-transparent border-green-900/50 text-green-400 hover:bg-green-900/20 hover:text-green-300 disabled:opacity-50"
          >
            Não
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCancelling}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-900/50 disabled:opacity-70"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Sim'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
