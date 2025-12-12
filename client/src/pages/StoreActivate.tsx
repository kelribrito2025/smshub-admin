import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ShoppingBag, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function StoreActivate() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const activateMutation = trpc.store.activateAccount.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('id');

    if (!customerId) {
      setStatus('error');
      setMessage('Link de ativação inválido');
      return;
    }

    activateMutation.mutate(
      { customerId: parseInt(customerId, 10) },
      {
        onSuccess: (data) => {
          setStatus('success');
          setMessage(data.message);
        },
        onError: (error) => {
          setStatus('error');
          setMessage(error.message);
        },
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00ff4110_1px,transparent_1px),linear-gradient(to_bottom,#00ff4110_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Glowing orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />

      <Card className="relative w-full max-w-md bg-black/80 backdrop-blur-sm border-green-900/50 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-green-400 font-mono">SMS.STORE</h1>
          <p className="text-sm text-green-600 mt-2 font-mono">Ativação de Conta</p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-green-400 animate-spin" />
              <p className="text-green-400 font-mono">Ativando sua conta...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400" />
              <p className="text-green-400 font-mono text-center">{message}</p>
              <Button
                onClick={() => window.open('https://app.numero-virtual.com', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono mt-4"
              >
                Fazer Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400" />
              <p className="text-red-400 font-mono text-center">{message}</p>
              <Button
                onClick={() => setLocation('/store/login')}
                variant="outline"
                className="w-full border-green-900/50 text-green-400 hover:bg-green-900/20 font-mono mt-4"
              >
                Voltar ao Login
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
