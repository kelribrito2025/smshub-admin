import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Percent, Power, Save, Users, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

export default function Affiliates() {
  // Settings queries
  const { data: settings, isLoading: loadingSettings } = trpc.affiliateAdmin.getSettings.useQuery();
  const updateMutation = trpc.affiliateAdmin.updateSettings.useMutation();

  // Report queries
  const { data: affiliates = [], isLoading: loadingAffiliates } =
    trpc.affiliateAdmin.getAllAffiliates.useQuery();
  const { data: referrals = [], isLoading: loadingReferrals } =
    trpc.affiliateAdmin.getAllReferrals.useQuery();

  const [bonusPercentage, setBonusPercentage] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setBonusPercentage(settings.bonusPercentage);
      setIsActive(settings.isActive);
    }
  });

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        bonusPercentage,
        isActive,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configurações", {
        description: error.message,
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      active: { label: "Ativo", variant: "default" },
      completed: { label: "Completo", variant: "outline" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant={variant.variant}>{variant.label}</Badge>;
  };

  // Calculate totals
  const totalAffiliates = affiliates.length;
  const totalEarnings = affiliates.reduce((sum, a) => sum + a.totalEarnings, 0);
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.totalReferrals, 0);
  const totalRecharged = affiliates.reduce((sum, a) => sum + a.totalRecharged, 0);

  if (loadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Gift className="w-8 h-8 text-blue-500" />
            Programa de Afiliados
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure e acompanhe o desempenho do programa de indicações
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="report">Relatórios</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Defina as regras do programa de indicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bonus Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="bonusPercentage" className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Percentual de Bônus
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="bonusPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={bonusPercentage}
                      onChange={(e) => setBonusPercentage(Number(e.target.value))}
                      className="max-w-xs"
                    />
                    <span className="text-sm text-muted-foreground">
                      Afiliados ganharão {bonusPercentage}% do valor da primeira recarga dos indicados
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exemplo: Se um indicado recarregar R$ 100,00, o afiliado ganhará R${" "}
                    {((100 * bonusPercentage) / 100).toFixed(2)} de bônus
                  </p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="flex items-center gap-2">
                      <Power className="w-4 h-4" />
                      Status do Programa
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isActive
                        ? "O programa está ativo e aceitando novas indicações"
                        : "O programa está desativado. Novas indicações não gerarão bônus"}
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  Como Funciona o Programa
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
                <p>
                  <strong>1.</strong> Cada cliente recebe um link único de indicação
                </p>
                <p>
                  <strong>2.</strong> Quando alguém se cadastra pelo link, fica vinculado ao afiliado
                </p>
                <p>
                  <strong>3.</strong> Na primeira recarga do indicado (PIX ou Stripe), o bônus é calculado
                  automaticamente
                </p>
                <p>
                  <strong>4.</strong> O bônus é creditado no saldo de bônus do afiliado
                </p>
                <p>
                  <strong>5.</strong> O saldo de bônus pode ser usado para compras, mas não pode ser sacado
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total de Afiliados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAffiliates}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clientes que indicaram alguém
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total de Indicações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReferrals}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pessoas indicadas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Bônus Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalEarnings)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de bônus gerados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total Recarregado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalRecharged)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pelos indicados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sub Tabs */}
            <Tabs defaultValue="affiliates" className="space-y-4">
              <TabsList>
                <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
                <TabsTrigger value="referrals">Indicações</TabsTrigger>
              </TabsList>

              {/* Affiliates Sub Tab */}
              <TabsContent value="affiliates">
                <Card>
                  <CardHeader>
                    <CardTitle>Listagem de Afiliados</CardTitle>
                    <CardDescription>
                      Todos os clientes que indicaram alguém e suas métricas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAffiliates ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : affiliates.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Nenhum afiliado encontrado.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PIN</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Indicações</TableHead>
                              <TableHead>Ativas</TableHead>
                              <TableHead>Taxa Conv.</TableHead>
                              <TableHead>Bônus Ganho</TableHead>
                              <TableHead>Total Recarregado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {affiliates.map((affiliate) => (
                              <TableRow key={affiliate.id}>
                                <TableCell className="font-mono">#{affiliate.pin}</TableCell>
                                <TableCell className="font-medium">{affiliate.name}</TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {affiliate.email}
                                </TableCell>
                                <TableCell>{affiliate.totalReferrals}</TableCell>
                                <TableCell>{affiliate.activeReferrals}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{affiliate.conversionRate}%</Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {formatCurrency(affiliate.totalEarnings)}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-600">
                                  {formatCurrency(affiliate.totalRecharged)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Referrals Sub Tab */}
              <TabsContent value="referrals">
                <Card>
                  <CardHeader>
                    <CardTitle>Todas as Indicações</CardTitle>
                    <CardDescription>
                      Histórico completo de quem indicou quem
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingReferrals ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : referrals.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma indicação encontrada.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Afiliado</TableHead>
                              <TableHead>Indicado</TableHead>
                              <TableHead>Data Cadastro</TableHead>
                              <TableHead>Primeira Recarga</TableHead>
                              <TableHead>Valor Recarga</TableHead>
                              <TableHead>Bônus Gerado</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {referrals.map((ref) => (
                              <TableRow key={ref.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{ref.referrerName || "N/A"}</div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {ref.referrerEmail || "N/A"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{ref.referredName || "N/A"}</div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {ref.referredEmail || "N/A"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(ref.createdAt)}</TableCell>
                                <TableCell>{formatDate(ref.firstRechargeAt)}</TableCell>
                                <TableCell className="font-semibold">
                                  {ref.firstRechargeAmount
                                    ? formatCurrency(ref.firstRechargeAmount)
                                    : "—"}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {ref.bonusGenerated ? formatCurrency(ref.bonusGenerated) : "—"}
                                </TableCell>
                                <TableCell>{getStatusBadge(ref.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
