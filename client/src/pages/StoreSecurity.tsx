import React from 'react';
import { useLocation } from 'wouter';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import StoreLayout from '../components/StoreLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Shield, Key, History, Smartphone } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { toast } from 'sonner';

function SessionsTable({ customerId }: { customerId: number }) {
  const sessionsQuery = trpc.security.getSessions.useQuery({ customerId });
  const terminateSessionMutation = trpc.security.terminateSession.useMutation({
    onSuccess: () => {
      toast.success('✅ Sessão encerrada com sucesso');
      sessionsQuery.refetch();
    },
    onError: () => {
      toast.error('❌ Erro ao encerrar sessão');
    },
  });

  const handleTerminateSession = (sessionId: number) => {
    if (confirm('Tem certeza que deseja encerrar esta sessão?')) {
      terminateSessionMutation.mutate({ sessionId, customerId });
    }
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        <p className="text-green-600 font-mono">Carregando sessões...</p>
      </div>
    );
  }

  const sessions = sessionsQuery.data || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-green-900/50">
            <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">
              Data/Hora
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">
              IP
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">
              Dispositivo
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">
              Localização
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">
              Ação
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr className="border-b border-green-900/30">
              <td colSpan={5} className="px-4 py-8 text-center text-green-600">
                Nenhuma sessão registrada
              </td>
            </tr>
          ) : (
            sessions.map((session) => (
              <tr key={session.id} className="border-b border-green-900/30">
                <td className="px-4 py-3 text-green-400 font-mono text-sm">
                  {new Date(session.loginAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-green-400 font-mono text-sm">
                  {session.ipAddress || 'N/A'}
                </td>
                <td className="px-4 py-3 text-green-400 font-mono text-sm">
                  {session.deviceType || 'Desconhecido'}
                </td>
                <td className="px-4 py-3 text-green-400 font-mono text-sm">
                  {session.location || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  {session.isActive ? (
                    <Button
                      onClick={() => handleTerminateSession(session.id)}
                      size="sm"
                      variant="outline"
                      className="bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-mono"
                    >
                      Encerrar
                    </Button>
                  ) : (
                    <span className="text-green-600 text-sm">Encerrada</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function StoreSecurity() {
  const { customer } = useStoreAuth();
  const [, setLocation] = useLocation();

  // Redirect to /store if not authenticated
  React.useEffect(() => {
    if (!customer) {
      setLocation('/store');
    }
  }, [customer, setLocation]);

  if (!customer) {
    return null;
  }

  return (
    <StoreLayout>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-green-400" />
          <h1 className="text-2xl font-bold text-green-400">SEGURANÇA</h1>
        </div>
        <p className="text-green-600 text-sm mb-8">
          Gerencie a segurança da sua conta
        </p>

        {/* 1. Alterar Senha */}
        <Card className="bg-black/50 border-green-900/50 p-8 mb-6">
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
            <Key className="w-5 h-5" />
            ALTERAR SENHA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                Senha Atual
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                Nova Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                Confirmar Nova Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
              />
            </div>
          </div>

          <div className="mt-6">
            <Button className="bg-green-500 hover:bg-green-400 text-black font-mono font-bold">
              🔒 ALTERAR SENHA
            </Button>
          </div>
        </Card>

        {/* 2. Histórico de Sessões */}
        <Card className="bg-black/50 border-green-900/50 p-8 mb-6">
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
            <History className="w-5 h-5" />
            HISTÓRICO DE SESSÕES
          </h2>

          <p className="text-green-600 text-sm mb-4">
            Últimos 5 logins na sua conta
          </p>

          <SessionsTable customerId={customer.id} />
        </Card>

        {/* 3. Autenticação em 2 Fatores */}
        <Card className="bg-black/50 border-green-900/50 p-8">
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            AUTENTICAÇÃO EM 2 FATORES
          </h2>

          <p className="text-green-600 text-sm mb-6">
            Adicione uma camada extra de segurança à sua conta
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-900 border border-green-900/50 rounded mb-4">
            <div>
              <p className="text-green-400 font-bold">Status: Desativado</p>
              <p className="text-green-600 text-sm">Código via E-mail</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-900/50 border border-green-900/30 rounded">
            <p className="text-green-600 text-sm mb-4">
              Quando ativado, você receberá um código de verificação por e-mail sempre que fizer login.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase">
                  Código de Verificação
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  disabled
                  className="bg-gray-900 border-green-900/50 text-green-400 font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button disabled className="bg-green-500/50 text-black font-mono font-bold cursor-not-allowed">
                  ✓ VERIFICAR CÓDIGO
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </StoreLayout>
  );
}
