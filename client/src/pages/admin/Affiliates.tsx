import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, DollarSign, TrendingUp } from "lucide-react";

export default function Affiliates() {
  // Report queries
  const { data: affiliates = [], isLoading: loadingAffiliates } =
    trpc.affiliateAdmin.getAllAffiliates.useQuery();
  const { data: referrals = [], isLoading: loadingReferrals } =
    trpc.affiliateAdmin.getAllReferrals.useQuery();

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
            Acompanhe o desempenho do programa de indicações
          </p>
        </div>

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

        {/* Tabs */}
        <Tabs defaultValue="affiliates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
            <TabsTrigger value="referrals">Indicações</TabsTrigger>
          </TabsList>

          {/* Affiliates Tab */}
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

          {/* Referrals Tab */}
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
      </div>
    </DashboardLayout>
  );
}
