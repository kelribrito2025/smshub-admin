import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('customerId');
    const mail = params.get('email');
    if (id) setCustomerId(parseInt(id));
    if (mail) setEmail(mail);
  }, []);

  const verifyMutation = trpc.store.verifyEmail.useMutation({
    onSuccess: () => {
      setVerified(true);
      toast.success('Email verificado com sucesso!');
      setTimeout(() => setLocation('/login'), 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendMutation = trpc.store.resendVerificationCode.useMutation({
    onSuccess: () => {
      toast.success('Novo código enviado!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleVerify = () => {
    if (!customerId) return;
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    verifyMutation.mutate({ customerId, code });
  };

  const handleResend = () => {
    if (!customerId) return;
    resendMutation.mutate({ customerId });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !verifyMutation.isPending) {
      handleVerify();
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black border-2 border-green-500/30 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-400 mb-2">Email Verificado!</h1>
          <p className="text-green-600 text-sm">
            Redirecionando para login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      {/* Matrix Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff41 2px, #00ff41 4px),
                           repeating-linear-gradient(90deg, transparent, transparent 2px, #00ff41 2px, #00ff41 4px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="max-w-md w-full bg-black border-2 border-green-500/30 rounded-lg p-8 relative z-10">
        <div className="text-center mb-8">
          {/* Logo N */}
          <div className="inline-flex w-16 h-16 bg-green-500 rounded-lg items-center justify-center text-black text-4xl font-bold mb-4">
            N
          </div>
          <h1 className="text-2xl font-bold text-green-400 mb-2">Verifique seu Email</h1>
          <p className="text-green-600 text-sm">
            Enviamos um código de 6 dígitos para:
          </p>
          <p className="text-green-400 font-mono mt-2">{email}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-green-600 mb-2">
              Código de Verificação
            </label>
            <Input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyPress={handleKeyPress}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono bg-black border-green-500/30 text-green-400 focus:border-green-500"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifyMutation.isPending || code.length !== 6}
            className="w-full bg-green-500 text-black hover:bg-green-400 font-bold"
          >
            {verifyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verificar
          </Button>

          <div className="text-center pt-4 border-t border-green-500/30">
            <p className="text-sm text-green-600 mb-2">Não recebeu o código?</p>
            <button
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="text-sm text-green-400 hover:text-green-300 underline font-mono"
            >
              {resendMutation.isPending ? 'Enviando...' : 'Reenviar código'}
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-green-600">
              O código expira em 15 minutos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
