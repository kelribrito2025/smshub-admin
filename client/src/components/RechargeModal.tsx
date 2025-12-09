import { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, Smartphone, Shield, ArrowRight, Zap, Lock, Bitcoin } from 'lucide-react';
import { PixPaymentModal } from './PixPaymentModal';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'pix' | 'stripe' | 'crypto';

const SUGGESTED_VALUES = [20, 30, 50, 100, 200];

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  const { customer } = useStoreAuth();
  const { data: paymentSettings } = trpc.paymentSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Payment settings rarely change, cache for 5 minutes
    refetchOnWindowFocus: false,
  });
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [selectedValue, setSelectedValue] = useState<number | null>(20);
  const [customValue, setCustomValue] = useState<string>('');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState(0);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);

  const createStripeCheckout = trpc.stripe.createCheckoutSession.useMutation();

  // Auto-select first available payment method
  useEffect(() => {
    if (paymentSettings) {
      if (paymentSettings.pixEnabled) {
        setSelectedMethod('pix');
      } else if (paymentSettings.stripeEnabled) {
        setSelectedMethod('stripe');
      }
    }
  }, [paymentSettings]);

  if (!isOpen) return null;

  // Check if at least one payment method is enabled
  const hasPaymentMethod = paymentSettings?.pixEnabled || paymentSettings?.stripeEnabled;
  
  if (!hasPaymentMethod) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-black rounded-2xl shadow-2xl border-2 border-red-500/30 p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white font-mono">
              PAGAMENTOS INDISPONÍVEIS
            </h2>
            <p className="text-gray-400 font-mono text-sm">
              Nenhum método de pagamento está ativo no momento. Entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSuggestedValueClick = (value: number) => {
    setSelectedValue(value);
    // Format value in Brazilian format (with comma)
    setCustomValue(value.toFixed(2).replace('.', ','));
  };

  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove all non-numeric characters
    value = value.replace(/[^0-9]/g, '');
    
    // If empty, set to empty string
    if (value === '') {
      setCustomValue('');
      setSelectedValue(null);
      return;
    }
    
    // Convert to number (treating as cents)
    const numValue = parseInt(value, 10);
    
    // Format as Brazilian currency (divide by 100 to get reais)
    const formatted = (numValue / 100).toFixed(2).replace('.', ',');
    
    setCustomValue(formatted);
    setSelectedValue(null);
  };

  const handleProceed = () => {
    // Parse Brazilian format (comma as decimal separator)
    const amount = customValue ? parseFloat(customValue.replace(',', '.')) : selectedValue;
    if (!amount || amount <= 0) {
      toast.error('Por favor, selecione ou digite um valor válido');
      return;
    }

    if (!customer) {
      toast.error('Você precisa estar logado para recarregar');
      return;
    }

    if (selectedMethod === 'pix') {
      // Open PIX payment modal
      setPixAmount(Math.round(amount * 100)); // Convert to cents
      setShowPixModal(true);
    } else if (selectedMethod === 'stripe') {
      // Create Stripe checkout session
      setIsProcessingStripe(true);
      createStripeCheckout.mutate(
        { amount: Math.round(amount * 100), customerId: customer.id },
        {
          onSuccess: (data) => {
            // Redirect to Stripe checkout
            window.location.href = data.checkoutUrl;
          },
          onError: (error) => {
            setIsProcessingStripe(false);
            toast.error(error.message || 'Erro ao criar sessão de pagamento');
          },
        }
      );
    } else {
      toast.info('Pagamento com criptomoedas em breve!');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-black border border-green-500 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row">
          {/* Left Panel - Cyber Green/Black */}
          <div className="md:w-2/5 bg-gradient-to-br from-black via-green-950 to-black p-6 md:p-10 md:flex md:flex-col md:justify-between text-green-400 relative overflow-hidden border-r-2 border-green-500/30">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-black border-[1.5px] border-green-500 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 md:w-7 md:h-7 text-green-400" strokeWidth={2} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-mono text-green-400">
                    Recarregar
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="md:hidden text-green-400 hover:text-white transition-colors p-1 border border-green-500/50 rounded-lg hover:bg-green-500/10"
                >
                  <X size={24} strokeWidth={2} />
                </button>
              </div>
              <p className="text-green-300 text-sm leading-relaxed font-mono">
                Recarregue sua conta de forma rápida e segura.{' '}
                <span className="hidden md:inline">Escolha o valor e o método de pagamento.</span>
              </p>
            </div>

            {/* Features List */}
            <div className="relative z-10 space-y-3 md:space-y-4 mt-6 md:mt-0">
              <div className="hidden md:flex items-center gap-3 text-xs md:text-sm font-mono bg-black/30 border border-green-500/30 rounded-lg p-3">
                <div className="w-8 h-8 border border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-400" strokeWidth={2} />
                </div>
                <span className="text-green-300">Transação 100% segura</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm font-mono bg-black/30 border border-green-500/30 rounded-lg p-3">
                <div className="w-8 h-8 border border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-green-400" strokeWidth={2} />
                </div>
                <span className="text-green-300">Confirmação instantânea</span>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs md:text-sm font-mono bg-black/30 border border-green-500/30 rounded-lg p-3">
                <div className="w-8 h-8 border border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-green-400" strokeWidth={2} />
                </div>
                <span className="text-green-300">Dados criptografados</span>
              </div>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="flex-1 p-6 md:p-10 relative overflow-y-auto bg-black">
            <button
              onClick={onClose}
              className="hidden md:block absolute top-6 right-6 text-green-400 hover:text-white transition-colors p-2 hover:bg-green-500/10 rounded-xl border border-green-500/30"
            >
              <X size={20} strokeWidth={2} />
            </button>

            <div className="space-y-6 md:space-y-8 md:mt-4">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-3 md:mb-4 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  MÉTODO DE PAGAMENTO
                </label>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {/* PIX */}
                  {paymentSettings?.pixEnabled && (
                    <button
                      onClick={() => setSelectedMethod('pix')}
                      className={`p-3 md:p-4 rounded-xl transition-all border ${
                        selectedMethod === 'pix'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-green-500/30 hover:border-green-500/50 bg-black/50 hover:bg-green-500/5'
                      }`}
                    >
                      <Smartphone
                        className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 md:mb-2 ${
                          selectedMethod === 'pix' ? 'text-green-400' : 'text-green-500/50'
                        }`}
                        strokeWidth={2}
                      />
                      <div className={`text-[10px] md:text-xs font-bold font-mono ${
                        selectedMethod === 'pix' ? 'text-green-400' : 'text-green-500/70'
                      }`}>
                        PIX
                      </div>
                    </button>
                  )}

                  {/* Stripe */}
                  {paymentSettings?.stripeEnabled && (
                    <button
                      onClick={() => setSelectedMethod('stripe')}
                      className={`p-3 md:p-4 rounded-xl transition-all border ${
                        selectedMethod === 'stripe'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-green-500/30 hover:border-green-500/50 bg-black/50 hover:bg-green-500/5'
                      }`}
                    >
                      <CreditCard
                        className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 md:mb-2 ${
                          selectedMethod === 'stripe' ? 'text-green-400' : 'text-green-500/50'
                        }`}
                        strokeWidth={2}
                      />
                      <div className={`text-[10px] md:text-xs font-bold font-mono ${
                        selectedMethod === 'stripe' ? 'text-green-400' : 'text-green-500/70'
                      }`}>
                        CARTÃO
                      </div>
                    </button>
                  )}

                  {/* Crypto (disabled) */}
                  <button
                    disabled
                    className="p-3 md:p-4 rounded-xl transition-all border opacity-50 cursor-not-allowed border-green-500/30 bg-black/50"
                  >
                    <Bitcoin className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 md:mb-2 text-green-500/50" strokeWidth={2} />
                    <div className="text-[10px] md:text-xs font-bold font-mono text-green-500/70">
                      CRIPTO
                    </div>
                  </button>
                </div>
              </div>

              {/* Suggested Amounts */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-3 md:mb-4 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  VALORES SUGERIDOS
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SUGGESTED_VALUES.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleSuggestedValueClick(amount)}
                    className={`py-2.5 md:py-3 rounded-lg font-bold text-xs md:text-sm transition-all font-mono border ${
                      selectedValue === amount
                        ? 'bg-green-500/20 text-green-400 border-green-500'
                        : 'bg-black/50 text-green-500/70 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5'
                    }`}
                    >
                      R${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-sm font-bold text-green-400 mb-3 md:mb-4 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  VALOR PERSONALIZADO
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold text-sm md:text-base font-mono">
                    R$
                  </span>
                  <input
                    type="text"
                    value={customValue}
                    onChange={handleCustomValueChange}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full pl-12 pr-4 py-3 md:py-3.5 rounded-lg border border-green-500/30 bg-black/50 focus:border-green-500 focus:outline-none text-green-400 placeholder-green-500/30 text-base md:text-lg font-mono transition-all"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleProceed}
                disabled={isProcessingStripe}
                className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 group font-mono text-base md:text-lg border border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingStripe ? (
                  'PROCESSANDO...'
                ) : (
                  <>
                    CONTINUAR
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PIX Payment Modal */}
      {showPixModal && (
        <PixPaymentModal
          isOpen={showPixModal}
          onClose={() => {
            setShowPixModal(false);
            onClose(); // Close parent modal too
          }}
          amount={pixAmount}
          customerId={customer?.id || 0}
          onSuccess={() => {
            setShowPixModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
