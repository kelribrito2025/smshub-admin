import { useState } from 'react';
import { useLocation } from 'wouter';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ShoppingBag, Mail, User, Loader2, Lock } from 'lucide-react';

export default function StoreLogin() {
  const [, setLocation] = useLocation();
  const { login, register } = useStoreAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!password || password.length < 8) {
          setError('Senha deve ter no mínimo 8 caracteres');
          setIsLoading(false);
          return;
        }
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Nome é obrigatório');
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 8) {
          setError('Senha deve ter no mínimo 8 caracteres');
          setIsLoading(false);
          return;
        }
        await register(email, password, name);
      }
      setLocation('/store');
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-sm text-green-600 mt-2 font-mono">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-green-400 font-mono text-sm">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-black/50 border-green-900/50 text-green-400 placeholder:text-green-900 focus:border-green-500 font-mono"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-green-400 font-mono text-sm">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-black/50 border-green-900/50 text-green-400 placeholder:text-green-900 focus:border-green-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-green-400 font-mono text-sm">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-black/50 border-green-900/50 text-green-400 placeholder:text-green-900 focus:border-green-500 font-mono"
                required
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg">
              <p className="text-sm text-red-400 font-mono">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>{isLogin ? 'Entrar' : 'Criar Conta'}</>
            )}
          </Button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-green-600 hover:text-green-400 transition-colors font-mono"
          >
            {isLogin ? (
              <>Não tem conta? <span className="text-green-400 font-bold">Criar agora</span></>
            ) : (
              <>Já tem conta? <span className="text-green-400 font-bold">Fazer login</span></>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 pt-6 border-t border-green-900/50">
          <p className="text-xs text-green-600 text-center font-mono">
            Compre números SMS para verificação de contas
            <br />
            WhatsApp, Telegram, Google e mais de 200 serviços
          </p>
        </div>
      </Card>
    </div>
  );
}
