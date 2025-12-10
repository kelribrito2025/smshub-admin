import { useState, useEffect } from "react";
import { X, Copy, Check, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  amount: number; // Amount in cents
  onSuccess: () => void;
}

export function PixPaymentModal({
  isOpen,
  onClose,
  customerId,
  amount,
  onSuccess,
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [pixData, setPixData] = useState<{
    txid: string;
    pixCopyPaste: string;
    qrCodeUrl: string;
    expiresAt: Date;
  } | null>(null);

  const createChargeMutation = trpc.pix.createCharge.useMutation({
    onSuccess: (data) => {
      setPixData(data);
      const expiresAt = new Date(data.expiresAt);
      const now = new Date();
      const secondsLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      setTimeLeft(secondsLeft);
    },
    onError: (error) => {
      alert(`Erro ao gerar PIX: ${error.message}`);
      onClose();
    },
  });

  const getTransactionQuery = trpc.pix.getTransaction.useQuery(
    {
      txid: pixData?.txid || "",
      customerId,
    },
    {
      enabled: !!pixData?.txid && !paymentConfirmed,
      refetchInterval: 10000, // Poll every 10 seconds (increased to prevent 429 errors)
      retry: 1, // Only 1 retry to prevent 429 errors
      refetchOnWindowFocus: false, // Avoid requests when switching tabs
    }
  );

  // Create charge when modal opens
  useEffect(() => {
    if (isOpen && !pixData) {
      createChargeMutation.mutate({
        customerId,
        amount,
      });
    }
  }, [isOpen]);

  // Listen to SSE notifications for instant payment confirmation
  useEffect(() => {
    if (!isOpen || !pixData?.txid) return;

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const notification = customEvent.detail;
      
      // Check if this is a PIX payment confirmation for our transaction
      if (
        notification.type === "pix_payment_confirmed" &&
        notification.data?.txid === pixData.txid &&
        !paymentConfirmed
      ) {
        console.log("[PixPaymentModal] Payment confirmed via SSE:", notification);
        setPaymentConfirmed(true);
        toast.success("Pagamento confirmado! Seu saldo foi atualizado.", {
          duration: 4000,
        });
        onSuccess();
        // Close immediately after payment confirmation
        onClose();
      }
    };

    window.addEventListener("notification", handleNotification);
    return () => window.removeEventListener("notification", handleNotification);
  }, [isOpen, pixData?.txid, paymentConfirmed, onSuccess, onClose]);

  // Fallback: Check if payment was confirmed via polling (if SSE fails)
  useEffect(() => {
    if (getTransactionQuery.data?.status === "paid" && !paymentConfirmed) {
      console.log("[PixPaymentModal] Payment confirmed via polling:", getTransactionQuery.data);
      setPaymentConfirmed(true);
      toast.success("Pagamento confirmado! Seu saldo foi atualizado.", {
        duration: 4000,
      });
      onSuccess();
      // Close immediately after payment confirmation
      onClose();
    }
  }, [getTransactionQuery.data?.status, paymentConfirmed, onSuccess, onClose]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("PIX expirado. Por favor, gere um novo pagamento.");
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  const handleCopy = async () => {
    if (pixData?.pixCopyPaste) {
      await copyToClipboard(pixData.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div 
        className="relative bg-black border-2 border-green-500 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-[0_0_30px_rgba(0,255,65,0.3)]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 65, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px', borderWidth: '1px'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-green-500 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500 rounded-xl mb-1">
            {/* Custom PIX Icon SVG */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="black" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-green-500">PAGAMENTO PIX</h2>
          <p className="text-gray-400 text-sm">Escaneie o QR Code ou copie o código</p>
        </div>

        {/* Loading state */}
        {createChargeMutation.isPending && (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-3 text-sm">Gerando PIX...</p>
          </div>
        )}

        {/* Success State */}
        {paymentConfirmed && (
          <div className="text-center py-8 space-y-4">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-2">
              <Check size={48} className="text-black" strokeWidth={3} />
            </div>
            
            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-500">PAGAMENTO CONFIRMADO</h3>
              <p className="text-gray-400 text-sm">
                Sua recarga de <span className="text-green-500 font-semibold">{formatAmount(amount)}</span> foi processada com sucesso!
              </p>
            </div>

            {/* Auto-close message */}
            <p className="text-gray-500 text-xs">
              Esta janela fechará automaticamente em alguns segundos...
            </p>
          </div>
        )}

        {/* PIX Data */}
        {pixData && !paymentConfirmed && (
          <>
            {/* Amount */}
            <div className="bg-zinc-900/80 border border-green-500/30 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">VALOR</p>
              <p className="text-2xl font-bold text-green-500">
                {formatAmount(amount)}
              </p>
            </div>

            {/* QR Code - 30% menor */}
            <div className="bg-white rounded-xl p-3 flex items-center justify-center">
              <img
                src={pixData.qrCodeUrl}
                alt="QR Code PIX"
                className="w-[210px] h-[210px]"
              />
            </div>

            {/* PIX Copy-Paste Code */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Código PIX Copia e Cola
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pixData.pixCopyPaste}
                  readOnly
                  className="flex-1 bg-zinc-900/80 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 text-xs font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="bg-green-500 hover:bg-green-600 text-black px-3 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      OK
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      COPIAR
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Timer - atualiza a cada segundo */}
            <div className="bg-zinc-900/80 border border-green-500/30 rounded-xl p-3 flex items-center justify-center gap-2">
              <Clock size={18} className="text-green-500" />
              <span className="text-green-500 font-medium text-sm">
                EXPIRA EM: {formatTime(timeLeft)}
              </span>
            </div>

            {/* Status - com animação de pulso */}
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                Aguardando confirmação do pagamento...
              </p>
              <div className="mt-2 inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-500 text-xs uppercase tracking-wide">
                  VERIFICANDO PAGAMENTO
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
