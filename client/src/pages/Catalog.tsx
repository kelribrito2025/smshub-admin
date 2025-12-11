import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { RefreshCw, Search, Filter, Plus, Pencil, Download, HelpCircle, Trash2, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';

interface CatalogItem {
  id: number;
  countryId: number;
  countryName: string;
  countryCode: string;
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  apiId: number | null;
  apiName: string | null;
  smshubPrice: number;
  ourPrice: number;
  fixedPrice: boolean;
  quantityAvailable: number;
  active: boolean;
  lastSync: Date | null;
}

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500); // ✅ Debounce to avoid 429
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterApi, setFilterApi] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  // const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null);
  const [importCountryId, setImportCountryId] = useState<string>('');
  const [importApiId, setImportApiId] = useState<string>('');
  const [formData, setFormData] = useState({
    countryId: '',
    serviceName: '',
    serviceCode: '',
    category: 'Other',
    apiId: '',
    smshubPrice: '',
    ourPrice: '',
    quantityAvailable: '0',
    active: true,
  });

  // Buscar página atual COM FILTROS para exibição
  const { data: pricesResponse, isLoading, refetch } = trpc.prices.getAll.useQuery({
    page: currentPage,
    pageSize,
    searchTerm: debouncedSearchTerm.trim() || undefined,
    filterCountry: filterCountry !== 'all' ? filterCountry : undefined,
    filterStatus: filterStatus !== 'all' ? filterStatus : undefined,
    filterApi: filterApi !== 'all' ? filterApi : undefined,
  } as any);

  // Buscar TODOS os registros para estatísticas COM filtros aplicados (sem paginação)
  const { data: allPricesResponse } = trpc.prices.getAll.useQuery(
    {
      page: 1,
      pageSize: 999999, // Buscar todos os registros sem limite
      filterCountry: filterCountry !== 'all' ? filterCountry : undefined,
      filterStatus: filterStatus !== 'all' ? filterStatus : undefined,
      filterApi: filterApi !== 'all' ? filterApi : undefined,
    } as any,
    {
      enabled: true,
      staleTime: 60000, // Cache por 1 minuto
    }
  );

  const utils = trpc.useUtils();
  const syncPrices = trpc.sync.syncPrices.useMutation();
  const togglePrice = trpc.prices.toggleActive.useMutation({
    onSuccess: () => {
      // Invalidar ambas as queries para atualizar tanto a tabela quanto as estatísticas
      utils.prices.getAll.invalidate();
    },
  });
  const createManual = trpc.prices.createManual.useMutation();
  const editService = trpc.prices.editService.useMutation();
  const importCountryServices = trpc.prices.importCountryServices.useMutation();

  const { data: countries } = trpc.countries.getAll.useQuery();
  const { data: apis } = trpc.apis.list.useQuery();

  const handleSync = async () => {
    try {
      const result = await syncPrices.mutateAsync();
      toast.success(`Sincronizado! ${result.pricesImported} preços importados, ${result.servicesCreated} serviços criados`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar');
    }
  };

  // Get selected API info
  const selectedApi = apis?.find(api => api.id === parseInt(importApiId));

  const handleImport = async () => {
    if (!importApiId) {
      toast.error('Selecione uma API');
      return;
    }

    if (!importCountryId) {
      toast.error('Selecione um país');
      return;
    }

    // Validate API is active
    const selectedApiData = apis?.find(a => a.id === parseInt(importApiId));
    if (selectedApiData && !selectedApiData.active) {
      toast.error(`Esta API está inativa e não pode receber novos serviços. Por favor, ative a API "${selectedApiData.name}" antes de importar.`);
      return;
    }

    try {
      toast.info('Importando serviços... Isso pode levar alguns minutos.');
      const result = await importCountryServices.mutateAsync({
        apiId: parseInt(importApiId),
        countryId: parseInt(importCountryId),
        priceMultiplier: 1, // Not used anymore - API config determines pricing
      }) as { total: number; created: number; updated: number; skipped?: number; errors: string[] };
      
      const message = `Importação concluída! ${result.created} novos, ${result.updated} atualizados${result.skipped ? `, ${result.skipped} indisponíveis` : ''}. Total processado: ${result.total}`;
      toast.success(message);
      
      if (result.errors.length > 0) {
        console.error('Erros durante importação:', result.errors);
        toast.error(`Erros durante importação: ${result.errors.join(',')}`);
      }
      
      setIsImportDialogOpen(false);
      setImportCountryId('');
      setImportApiId('');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar serviços');
    }
  };

  const handleToggle = async (priceId: number, currentStatus: boolean) => {
    try {
      await togglePrice.mutateAsync({ priceId, active: !currentStatus });
      toast.success(currentStatus ? 'Serviço desativado' : 'Serviço ativado');
      // refetch() não é mais necessário - invalidação automática via onSuccess
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status');
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await editService.mutateAsync({
        priceId: editingItem.id,
        serviceName: editingItem.serviceName,
        serviceCode: editingItem.serviceCode,
        smshubPrice: Math.round(editingItem.smshubPrice), // Já está em centavos, não multiplicar
        ourPrice: Math.round(editingItem.ourPrice), // Já está em centavos, não multiplicar
        fixedPrice: editingItem.fixedPrice,
        quantityAvailable: editingItem.quantityAvailable,
        active: editingItem.active,
      });
      toast.success('Serviço atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar serviço');
    }
  };

  // const handleDelete = (item: CatalogItem) => {
  //   setDeletingItem(item);
  //   setIsDeleteDialogOpen(true);
  // };

  // const handleConfirmDelete = async () => {
  //   if (!deletingItem) return;

  //   try {
  //     await deletePrice.mutateAsync({ id: deletingItem.id });
  //     toast.success('Serviço excluído com sucesso!');
  //     setIsDeleteDialogOpen(false);
  //     setDeletingItem(null);
  //     refetch();
  //   } catch (error: any) {
  //     toast.error(error.message || 'Erro ao excluir serviço');
  //   }
  // };

  const handleCreateManual = async () => {
    try {
      if (!formData.countryId || !formData.serviceName || !formData.serviceCode || !formData.apiId || !formData.smshubPrice || !formData.ourPrice) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      await createManual.mutateAsync({
        countryId: parseInt(formData.countryId),
        serviceName: formData.serviceName,
        serviceCode: formData.serviceCode,
        category: formData.category,
        apiId: parseInt(formData.apiId),
        smshubPrice: Math.round(parseFloat(formData.smshubPrice) * 100), // Converter reais para centavos
        ourPrice: Math.round(parseFloat(formData.ourPrice) * 100), // Converter reais para centavos
        quantityAvailable: parseInt(formData.quantityAvailable),
        active: formData.active,
      });
      toast.success('Serviço criado com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        countryId: '',
        serviceName: '',
        serviceCode: '',
        category: 'Other',
        apiId: '',
        smshubPrice: '',
        ourPrice: '',
        quantityAvailable: '0',
        active: true,
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar serviço');
    }
  };

  // Transform ALL prices data for statistics and global search
  const allResponse = allPricesResponse as any;
  const allPrices = Array.isArray(allResponse) ? allResponse : (allResponse?.items || []);
  const allCatalogItems: CatalogItem[] = allPrices.map((item: any) => ({
    id: item.price?.id || 0,
    countryId: item.price?.countryId || 0,
    countryName: item.country?.name || '',
    countryCode: item.country?.code || '',
    serviceId: item.price?.serviceId || 0,
    serviceName: item.service?.name || '',
    serviceCode: item.service?.smshubCode || '',
    apiId: item.price?.apiId || null,
    apiName: item.api?.name || null,
    smshubPrice: item.price?.smshubPrice || 0,
    ourPrice: item.price?.ourPrice || 0,
    fixedPrice: item.price?.fixedPrice ?? false,
    quantityAvailable: item.price?.quantityAvailable || 0,
    active: item.price?.active ?? true,
    lastSync: item.price?.lastSync || null,
  }));

  // Transform CURRENT PAGE prices data for display
  const response = pricesResponse as any;
  const prices = Array.isArray(response) ? response : (response?.items || []);
  const totalPages = Array.isArray(response) ? 1 : (response?.totalPages || 1);
  const totalItems = Array.isArray(response) ? response.length : (response?.total || 0);
  
  const catalogItems: CatalogItem[] = prices.map((item: any) => ({
    id: item.price?.id || 0,
    countryId: item.price?.countryId || 0,
    countryName: item.country?.name || '',
    countryCode: item.country?.code || '',
    serviceId: item.price?.serviceId || 0,
    serviceName: item.service?.name || '',
    serviceCode: item.service?.smshubCode || '',
    apiId: item.price?.apiId || null,
    apiName: item.api?.name || null,
    smshubPrice: item.price?.smshubPrice || 0,
    ourPrice: item.price?.ourPrice || 0,
    fixedPrice: item.price?.fixedPrice ?? false,
    quantityAvailable: item.price?.quantityAvailable || 0,
    active: item.price?.active ?? true,
    lastSync: item.price?.lastSync || null,
  }));

  // Backend agora filtra, então não precisamos filtrar novamente no frontend
  // Apenas usamos os dados retornados diretamente
  const filteredItems = catalogItems;
  
  // Para estatísticas, usamos os dados já filtrados pelo backend (sem filtro local adicional)
  // O backend já aplicou todos os filtros (país, status, API) na query allPricesResponse
  const globalFilteredItems = allCatalogItems;

  // Get unique countries for filter (from all countries in the system)
  const uniqueCountries = (countries || [])
    .map((country) => ({
      code: country.code,
      name: country.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-500" />
            Catálogo de Serviços
          </h1>
          <p className="text-gray-400 mt-1">
            Gerencie todos os serviços disponíveis por país
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Importar Serviços
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Importar Serviços de um País</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-gray-400">
                  Importe todos os serviços disponíveis de uma API para um país específico.
                </p>
                
                <div>
                  <Label htmlFor="import-api">API *</Label>
                  <Select value={importApiId} onValueChange={setImportApiId}>
                    <SelectTrigger className="bg-black/30 border-border">
                      <SelectValue placeholder="Selecione a API" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-border">
                      {(apis || []).map((api) => (
                        <SelectItem 
                          key={api.id} 
                          value={api.id.toString()}
                          disabled={!api.active}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{api.name}</span>
                            {!api.active && (
                              <span className="ml-2 text-xs text-red-500">(Inativa)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {importApiId && apis?.find(a => a.id === parseInt(importApiId))?.active === false && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Esta API está inativa e não pode receber novos serviços.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="import-country">País *</Label>
                  <Select value={importCountryId} onValueChange={setImportCountryId}>
                    <SelectTrigger className="bg-black/30 border-border">
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-border">
                      {(countries || []).filter(country => country.active).map((country) => (
                        <SelectItem key={country.id} value={country.id.toString()}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Informações da API selecionada */}
                {selectedApi && (
                  <TooltipProvider>
                    <div className="space-y-3 p-4 bg-black/20 border border-border rounded-lg">
                      <p className="text-sm font-medium text-gray-300">Configuração de Preços da API</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400">Moeda de Custo</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Moeda em que os preços são retornados pela API. Se for USD, será convertido para BRL automaticamente.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-3 py-2 bg-black/30 border border-border rounded-md text-sm">
                              {selectedApi.currency === 'BRL' ? 'Real BRL' : 'Dólar USD'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-400">Taxa de Lucro (%)</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Percentual de lucro aplicado sobre o custo da API. Ex: 155% significa que o preço final será 2.55x o custo.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-3 py-2 bg-black/30 border border-border rounded-md text-sm">
                              {selectedApi.profitPercentage}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-gray-400">Preço Mínimo (R$)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-gray-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Preço mínimo que será cobrado, mesmo que o cálculo com taxa de lucro resulte em valor menor.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="px-3 py-2 bg-black/30 border border-border rounded-md text-sm">
                            R$ {(selectedApi.minimumPrice / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Os serviços importados usarão as configurações de preço desta API.
                      </p>
                    </div>
                  </TooltipProvider>
                )}

                <div className="flex gap-2 justify-end mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setImportCountryId('');
                      setImportApiId('');
                    }}
                    className="border-gray-700 hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importCountryServices.isPending || (selectedApi && !selectedApi.active)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {importCountryServices.isPending ? 'Importando...' : 'Importar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Serviço Manualmente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Select value={formData.countryId} onValueChange={(value) => setFormData({ ...formData, countryId: value })}>
                    <SelectTrigger className="bg-black/30 border-border">
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-border">
                      {(countries || []).map((country) => (
                        <SelectItem key={country.id} value={country.id.toString()}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serviceName">Nome do Serviço *</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="Ex: WhatsApp"
                    className="bg-black/30 border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="serviceCode">Código *</Label>
                  <Input
                    id="serviceCode"
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    placeholder="Ex: wa"
                    className="bg-black/30 border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Social"
                    className="bg-black/30 border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="api">API *</Label>
                  <Select value={formData.apiId} onValueChange={(value) => setFormData({ ...formData, apiId: value })}>
                    <SelectTrigger className="bg-black/30 border-border">
                      <SelectValue placeholder="Selecione a API" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-border">
                      {(apis || []).map((api) => (
                        <SelectItem key={api.id} value={api.id.toString()}>
                          {api.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smshubPrice">Preço SMSHub *</Label>
                    <Input
                      id="smshubPrice"
                      type="number"
                      step="0.01"
                      value={formData.smshubPrice}
                      onChange={(e) => setFormData({ ...formData, smshubPrice: e.target.value })}
                      placeholder="0.00"
                      className="bg-black/30 border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ourPrice">Nosso Preço *</Label>
                    <Input
                      id="ourPrice"
                      type="number"
                      step="0.01"
                      value={formData.ourPrice}
                      onChange={(e) => setFormData({ ...formData, ourPrice: e.target.value })}
                      placeholder="0.00"
                      className="bg-black/30 border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="quantityAvailable">Quantidade Disponível</Label>
                  <Input
                    id="quantityAvailable"
                    type="number"
                    value={formData.quantityAvailable}
                    onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
                    placeholder="0"
                    className="bg-black/30 border-border"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateManual}
                    disabled={createManual.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {createManual.isPending ? 'Criando...' : 'Criar Serviço'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSync}
            disabled={syncPrices.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {syncPrices.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Catálogo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por país, serviço ou código..."
              className="pl-10 bg-black/30 border-border text-white"
            />
          </div>

          {/* Country Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary" style={{backgroundColor: '#1c1c1f'}}
            >
              <option value="all">Todos os países</option>
              {uniqueCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary" style={{backgroundColor: '#1c1c1f'}}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {/* API Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterApi}
              onChange={(e) => setFilterApi(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary" style={{backgroundColor: '#1c1c1f'}}
            >
              <option value="all">Todas as APIs</option>
              {apis?.map((api) => (
                <option key={api.id} value={api.id.toString()}>
                  {api.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stats - Usando registros filtrados por país */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Serviços Ativos</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {globalFilteredItems.filter((i) => i.active).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Serviços Inativos</div>
          <div className="text-2xl font-bold mt-1 text-red-600">
            {globalFilteredItems.filter((i) => !i.active).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Países Disponíveis</div>
          <div className="text-2xl font-bold mt-1">
            {new Set(allCatalogItems.map((i) => i.countryCode)).size}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Serviços Únicos</div>
          <div className="text-2xl font-bold mt-1">
            {new Set(allCatalogItems.map((i) => i.serviceCode)).size}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  País
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  API
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Preço SMSHub
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Nosso Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Disponível
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" style={{backgroundColor: '#141417'}}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-900/30">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Carregando catálogo...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Nenhum serviço encontrado
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{item.countryName}</div>
                      <div className="text-sm text-gray-400">{item.countryCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{item.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="px-2 py-1 bg-gray-900 rounded text-purple-400 text-sm">
                        {item.serviceCode}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded text-blue-400 text-sm">
                        {item.apiId ? `Opção ${item.apiId}` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      R$ {(item.smshubPrice / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                      R$ {(item.ourPrice / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.quantityAvailable > 0
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {item.quantityAvailable}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Switch
                        checked={item.active}
                        onCheckedChange={() => handleToggle(item.id, item.active)}
                        disabled={togglePrice.isPending}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 hover:bg-green-900/30 rounded transition-colors"
                          title="Editar serviço"
                        >
                          <Pencil className="w-4 h-4 text-green-400" />
                        </button>
                        {/* Delete button commented until backend is implemented */}
                        {/* <button
                          onClick={() => handleDelete(item)}
                          className="p-2 hover:bg-red-900/30 rounded transition-colors"
                          title="Excluir serviço"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-black/50 border border-border rounded-lg">
          <div className="text-sm text-gray-400">
            Página {currentPage} de {totalPages} • Total: {totalItems} serviços
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-gray-400">Página</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-16 text-center bg-black/30 border-border text-white"
              />
              <span className="text-sm text-gray-400">de {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Última
            </Button>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="text-sm text-gray-400 text-center">
          Exibindo {filteredItems.length} de {globalFilteredItems.length} serviços encontrados (Total: {allCatalogItems.length})
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>País</Label>
                <Input
                  value={editingItem.countryName}
                  disabled
                  className="bg-gray-900 border-gray-700 opacity-50"
                />
              </div>

              <div>
                <Label htmlFor="edit-serviceName">Nome do Serviço *</Label>
                <Input
                  id="edit-serviceName"
                  value={editingItem.serviceName}
                  onChange={(e) => setEditingItem({ ...editingItem, serviceName: e.target.value })}
                  placeholder="Ex: WhatsApp"
                  className="bg-black/30 border-border"
                />
              </div>

              <div>
                <Label htmlFor="edit-serviceCode">Código *</Label>
                <Input
                  id="edit-serviceCode"
                  value={editingItem.serviceCode}
                  onChange={(e) => setEditingItem({ ...editingItem, serviceCode: e.target.value })}
                  placeholder="Ex: wa"
                  className="bg-black/30 border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-smshubPrice">Preço de Custo (SMSHub)</Label>
                  <Input
                    id="edit-smshubPrice"
                    type="number"
                    step="0.01"
                    value={(editingItem.smshubPrice / 100).toFixed(2)}
                    disabled
                    className="bg-gray-900 border-gray-700 opacity-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-ourPrice">Nosso Preço *</Label>
                  <Input
                    id="edit-ourPrice"
                    type="text"
                    inputMode="numeric"
                    value={(editingItem.ourPrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Remove tudo exceto dígitos
                      value = value.replace(/\D/g, '');
                      
                      // Converte para número (em centavos)
                      const cents = parseInt(value) || 0;
                      
                      setEditingItem({ ...editingItem, ourPrice: cents });
                    }}
                    placeholder="0,00"
                    className="bg-black/30 border-border"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-fixedPrice" className="text-sm font-medium">Preço Fixo</Label>
                  <p className="text-xs text-gray-400">Quando ativo, o preço não será atualizado automaticamente</p>
                </div>
                <Switch
                  id="edit-fixedPrice"
                  checked={editingItem.fixedPrice}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, fixedPrice: checked })}
                />
              </div>

              <div>
                <Label htmlFor="edit-quantityAvailable">Quantidade Disponível</Label>
                <Input
                  id="edit-quantityAvailable"
                  type="number"
                  value={editingItem.quantityAvailable}
                  onChange={(e) => setEditingItem({ ...editingItem, quantityAvailable: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="bg-black/30 border-border"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editingItem.active}
                  onChange={(e) => setEditingItem({ ...editingItem, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-active">Ativo</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingItem(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={editService.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {editService.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Commented out until backend is implemented */}
      {/* <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja excluir o serviço <strong>{deletingItem?.serviceName}</strong> do país <strong>{deletingItem?.countryName}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletePrice.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePrice.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
      </div>
    </DashboardLayout>
  );
}
