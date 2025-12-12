import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import DashboardLayout from '../../components/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, CheckCircle2, XCircle, Info, RefreshCw, Copy, Check, Loader2, DollarSign, TrendingUp, Clock, Server } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { toast } from '@/contexts/ToastContext';
import { CurrencyInput } from '../../components/ui/currency-input';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface ApiFormData {
  name: string;
  url: string;
  token: string;
  priority: number;
  active: boolean;
  currency: 'BRL' | 'USD';
  profitPercentage: number;
  minimumPrice: number;
  maxSimultaneousOrders: number;
  cancelLimit: number;
  cancelWindowMinutes: number;
  blockDurationMinutes: number;
}

export default function Apis() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<number | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ApiFormData>({
    name: '',
    url: '',
    token: '',
    priority: 0,
    active: true,
    currency: 'USD',
    profitPercentage: 0,
    minimumPrice: 0,
    maxSimultaneousOrders: 0,
    cancelLimit: 5,
    cancelWindowMinutes: 10,
    blockDurationMinutes: 30,
  });

  const apisQuery = trpc.apis.list.useQuery();
  const exchangeRateQuery = trpc.exchangeRate.getInfo.useQuery();
  const fullSyncMutation = trpc.exchangeRate.fullSync.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronização concluída!`, {
        description: `${data.apisUpdated} APIs e ${data.pricesRecalculated} preços atualizados`
      });
      exchangeRateQuery.refetch();
      apisQuery.refetch();
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar câmbio', {
        description: error.message
      });
    }
  });
  const createMutation = trpc.apis.create.useMutation({
    onSuccess: () => {
      toast.success('API adicionada com sucesso!');
      apisQuery.refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao adicionar API', {
        description: error.message,
      });
    },
  });

  const updateMutation = trpc.apis.update.useMutation({
    onSuccess: () => {
      toast.success('API atualizada e preços recalculados automaticamente!');
      apisQuery.refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar API', {
        description: error.message,
      });
    },
  });

  const deleteMutation = trpc.apis.delete.useMutation({
    onSuccess: () => {
      toast.success('API removida com sucesso!');
      apisQuery.refetch();
    },
    onError: (error) => {
      toast.error('Erro ao remover API', {
        description: error.message,
      });
    },
  });

  const toggleActiveMutation = trpc.apis.toggleActive.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado!');
      apisQuery.refetch();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      token: '',
      priority: 0,
      active: true,
      currency: 'USD',
      profitPercentage: 0,
      minimumPrice: 0,
      maxSimultaneousOrders: 0,
      cancelLimit: 5,
      cancelWindowMinutes: 10,
      blockDurationMinutes: 30,
    });
    setEditingApi(null);
  };

  const handleOpenDialog = (api?: any) => {
    if (api) {
      setEditingApi(api.id);
      setFormData({
        name: api.name,
        url: api.url,
        token: api.token,
        priority: api.priority,
        active: api.active,
        currency: api.currency || 'USD',
        profitPercentage: typeof api.profitPercentage === 'string' ? parseFloat(api.profitPercentage) : (api.profitPercentage || 0),
        minimumPrice: api.minimumPrice || 0,
        maxSimultaneousOrders: api.maxSimultaneousOrders || 0,
        cancelLimit: api.cancelLimit || 5,
        cancelWindowMinutes: api.cancelWindowMinutes || 10,
        blockDurationMinutes: api.blockDurationMinutes || 30,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    console.log('[Apis.tsx] handleSubmit called');
    console.log('[Apis.tsx] editingApi:', editingApi);
    console.log('[Apis.tsx] formData:', JSON.stringify(formData, null, 2));
    console.log('[Apis.tsx] formData.active:', formData.active, 'type:', typeof formData.active);
    
    if (editingApi) {
      const payload = {
        id: editingApi,
        ...formData,
      };
      console.log('[Apis.tsx] Sending update payload:', JSON.stringify(payload, null, 2));
      updateMutation.mutate(payload);
    } else {
      console.log('[Apis.tsx] Sending create payload:', JSON.stringify(formData, null, 2));
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja remover esta API?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (id: number) => {
    toggleActiveMutation.mutate({ id });
  };

  const maskToken = (token: string) => {
    if (token.length <= 5) return '*****';
    return '*****' + token.slice(-5);
  };

  const copyToClipboard = async (text: string, apiId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTokenId(apiId);
      
      // Vibração tátil (mobile)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      toast.success('Token copiado!');
      
      // Reset ícone após 2 segundos
      setTimeout(() => {
        setCopiedTokenId(null);
      }, 2000);
    } catch (err) {
      toast.error('Erro ao copiar token');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Server className="w-8 h-8 text-blue-500" />
              Gerenciar APIs
            </h1>
            <p className="text-gray-400 mt-2">
              Configure múltiplas APIs SMSHub compatíveis com fallback automático
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Nova API
          </Button>
        </div>

        {/* Exchange Rate Card */}
        <Card className="bg-green-900/20 border-green-500/30" style={{paddingTop: '0px'}}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <DollarSign className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-green-400">Cotação USD/BRL</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-sm">
                            {exchangeRateQuery.data?.nextUpdate && (
                              <p>
                                <strong>Próxima Atualização:</strong>{' '}
                                {new Date(exchangeRateQuery.data.nextUpdate).toLocaleString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                            <p>Atualização automática diária às 9h (horário de Brasília)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {exchangeRateQuery.isLoading ? (
                    <p className="text-sm text-gray-300 mt-1">Carregando cotação...</p>
                  ) : exchangeRateQuery.data?.rate ? (
                    <div className="flex items-baseline gap-3 mt-1">
                      <p className="text-2xl font-bold text-green-400">
                        R$ {exchangeRateQuery.data.rate.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(exchangeRateQuery.data.lastUpdate!).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 mt-1">
                      Nenhuma API em USD configurada
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => fullSyncMutation.mutate()}
                disabled={fullSyncMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              >
                {fullSyncMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar Agora
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card style={{ backgroundColor: '#141417' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">APIs Configuradas</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Ao alterar a <strong>Taxa de Lucro</strong> ou <strong>Preço Mínimo</strong> de uma API, 
                      todos os preços vinculados a ela serão recalculados automaticamente. Você não precisa 
                      sincronizar manualmente no Catálogo.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="text-gray-400">
              As APIs serão tentadas em ordem de prioridade (menor número = maior prioridade)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apisQuery.isLoading ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : apisQuery.data && apisQuery.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-300">Id</TableHead>
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300">URL</TableHead>
                    <TableHead className="text-gray-300">Token</TableHead>
                    <TableHead className="text-gray-300">Prioridade</TableHead>
                    <TableHead className="text-gray-300">Reativação</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apisQuery.data.map((api: any) => (
                    <TableRow key={api.id}>
                      <TableCell className="text-gray-300">{api.id}</TableCell>
                      <TableCell className="text-gray-300 font-medium">{api.name}</TableCell>
                      <TableCell className="text-gray-300 text-sm">{api.url}</TableCell>
                      <TableCell className="text-gray-300 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{maskToken(api.token)}</span>
                          <button
                            onClick={() => copyToClipboard(api.token, api.id)}
                            className="p-1.5 hover:bg-gray-800 rounded transition-colors touch-manipulation"
                            type="button"
                            title="Copiar token completo"
                          >
                            {copiedTokenId === api.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 hover:text-green-400" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{api.priority}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(api.id)}
                          className="p-1 hover:opacity-80 transition-opacity"
                        >
                          {api.active ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {api.active ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenDialog(api)}
                            className="p-2 hover:bg-gray-800 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-green-400" />
                          </button>
                          <Switch
                            checked={api.active}
                            onCheckedChange={() => handleToggleActive(api.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Nenhuma API configurada. Clique em "Adicionar Nova API" para começar.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog for Add/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingApi ? 'Editar API' : 'Adicionar Nova API'}
              </DialogTitle>
              <DialogDescription>
                Configure uma API SMSHub compatível
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome, Posição e Limite na mesma linha */}
              <TooltipProvider>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Opção 1"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">
                      Posição da API
                    </Label>
                    <Input
                      id="priority"
                      type="number"
                      min="0"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Limite de Pedidos Simultâneos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="maxSimultaneousOrders">
                        Limite de Pedidos
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Máximo de pedidos ativos por cliente nesta API. 0 = sem limite.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="maxSimultaneousOrders"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0"
                      value={formData.maxSimultaneousOrders}
                      onChange={(e) => setFormData({ ...formData, maxSimultaneousOrders: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </TooltipProvider>

              {/* Limite de Cancelamentos */}
              <TooltipProvider>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="cancelLimit">
                        Limite de Cancelamentos (X)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quantidade máxima de cancelamentos permitidos dentro da janela de tempo. Ex: 5 cancelamentos.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="cancelLimit"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      placeholder="5"
                      value={formData.cancelLimit}
                      onChange={(e) => setFormData({ ...formData, cancelLimit: parseInt(e.target.value) || 5 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="cancelWindowMinutes">
                        Janela de Tempo (Y min)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Período em minutos usado para contabilizar os cancelamentos. Ex: últimos 10 minutos.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="cancelWindowMinutes"
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      placeholder="10"
                      value={formData.cancelWindowMinutes}
                      onChange={(e) => setFormData({ ...formData, cancelWindowMinutes: parseInt(e.target.value) || 10 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="blockDurationMinutes">
                        Tempo de Bloqueio (Z min)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Duração em minutos que o usuário ficará bloqueado ao atingir o limite. Ex: 30 minutos.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="blockDurationMinutes"
                      type="number"
                      min="1"
                      max="10080"
                      step="1"
                      placeholder="30"
                      value={formData.blockDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, blockDurationMinutes: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
              </TooltipProvider>

              <div className="space-y-2">
                <Label htmlFor="url">URL da API</Label>
                <Input
                  id="url"
                  placeholder="https://api.smshub.org/stubs/handler_api"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token/API Key</Label>
                <Input
                  id="token"
                  placeholder="Digite o token da API"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  className="font-mono"
                />
              </div>

              <TooltipProvider>
                <div className="grid grid-cols-3 gap-4">
                  {/* Moeda de Custo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="currency">
                        Moeda de Custo
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Defina a moeda em que a API retorna os preços. O sistema converterá USD para BRL automaticamente.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.currency}
                      onValueChange={(value: 'BRL' | 'USD') => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">🇧🇷 Real BRL</SelectItem>
                        <SelectItem value="USD">🇺🇸 Dólar USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Taxa de Lucro */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="profitPercentage">
                        Taxa de Lucro (%)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Percentual aplicado sobre o custo da API. Ex: custo R$ 1,00 + 150% = R$ 2,50</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="profitPercentage"
                      type="number"
                      min="0"
                      max="1000"
                      step="0.01"
                      placeholder="Ex: 150"
                      value={formData.profitPercentage}
                      onChange={(e) => setFormData({ ...formData, profitPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Preço Mínimo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="minimumPrice">
                        Preço Mínimo (R$)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Valor mínimo absoluto. O sistema usará o maior entre o preço calculado e este valor.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CurrencyInput
                      id="minimumPrice"
                      placeholder="R$ 0,00"
                      value={formData.minimumPrice}
                      onChange={(cents) => setFormData({ ...formData, minimumPrice: cents })}
                    />
                  </div>


                </div>
              </TooltipProvider>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="active" className="cursor-pointer">
                  API ativa
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.url || !formData.token || updateMutation.isPending || createMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-400" />
                    Sincronizando...
                  </>
                ) : createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-400" />
                    Adicionando...
                  </>
                ) : (
                  editingApi ? 'Salvar Alterações' : 'Adicionar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
