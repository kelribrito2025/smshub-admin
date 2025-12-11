import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useStoreAuth } from "@/contexts/StoreAuthContext";
import StoreLayout from "@/components/StoreLayout";
import { AffiliateSkeleton } from "@/components/AffiliateSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, TrendingUp, DollarSign, Percent, Share2, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StoreAffiliate() {
  const { customer } = useStoreAuth();
  const [copied, setCopied] = useState(false);

  // Queries - sempre buscar informações do programa
  const { data: programInfo, isLoading: programInfoLoading } = trpc.affiliate.getProgramInfo.useQuery();
  
  // Queries condicionais - apenas se estiver logado
  const { data: referralLink } = trpc.affiliate.getReferralLink.useQuery(
    { customerId: customer?.id ?? 0 },
    { enabled: !!customer }
  );
  const { data: stats } = trpc.affiliate.getStats.useQuery(
    { customerId: customer?.id ?? 0 },
    { enabled: !!customer }
  );
  const { data: referrals = [] } = trpc.affiliate.getMyReferrals.useQuery(
    { customerId: customer?.id ?? 0 },
    { enabled: !!customer }
  );

  // Link genérico para usuários deslogados
  const GENERIC_LINK = "https://app.numero-virtual.com/link_de_indicação";

  const handleCopyLink = () => {
    const linkToCopy = customer ? (referralLink?.referralLink || GENERIC_LINK) : GENERIC_LINK;
    navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
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
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      active: { label: "Ativo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      completed: { label: "Completo", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  // Mostrar skeleton loading enquanto carrega informações do programa
  if (programInfoLoading) {
    return (
      <StoreLayout>
        <AffiliateSkeleton />
      </StoreLayout>
    );
  }

  if (!programInfo?.isActive) {
    return (
      <StoreLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-black/50 border-green-900/50">
            <CardHeader>
              <CardTitle className="text-green-400">Programa Desativado</CardTitle>
              <CardDescription className="text-green-600">
                O programa de afiliados está temporariamente desativado.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </StoreLayout>
    );
  }

  // Estatísticas padrão para usuários deslogados
  const displayStats = customer ? stats : {
    totalEarnings: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    conversionRate: 0
  };

  // Link de indicação a ser exibido
  const displayLink = customer ? (referralLink?.referralLink || "Carregando...") : GENERIC_LINK;

  return (
    <StoreLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-6 h-6 text-green-400" />
          <h1 className="text-2xl font-bold text-green-400">Programa de Afiliados</h1>
        </div>
        <p className="text-green-600 text-sm mb-6">
          Indique amigos e ganhe {programInfo?.bonusPercentage}% de bônus na primeira recarga deles
        </p>

        {/* (A) Link de Indicação */}
        <Card className="bg-black border border-green-900/30 relative overflow-hidden" style={{borderWidth: '2px'}}>
          {/* Grid cyber background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(to right, #22c55e 1px, transparent 1px),
              linear-gradient(to bottom, #22c55e 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            opacity: 0.05
          }} />
          
          {/* Header gradient */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-green-950/50 to-transparent pointer-events-none" />
          
          <CardHeader className="relative z-10">
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Seu Link de Indicação
            </CardTitle>
            <CardDescription className="text-green-600">
              Compartilhe este link com seus amigos para ganhar bônus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={displayLink}
                className="flex-1 bg-black border border-green-900/50 rounded-md px-4 py-2 text-green-400 font-mono text-sm"
              />
              <Button
                onClick={handleCopyLink}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* (C) Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-black/50 border-green-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Total Ganho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(displayStats?.totalEarnings || 0)}
              </div>
              <p className="text-xs text-green-600 mt-1">Saldo de bônus acumulado</p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Total de Indicações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {displayStats?.totalReferrals || 0}
              </div>
              <p className="text-xs text-green-600 mt-1">Pessoas indicadas</p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Indicações Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {displayStats?.activeReferrals || 0}
              </div>
              <p className="text-xs text-green-600 mt-1">Fizeram primeira recarga</p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <Percent className="w-4 h-4 text-green-400" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {displayStats?.conversionRate || 0}%
              </div>
              <p className="text-xs text-green-600 mt-1">Indicações que recarregaram</p>
            </CardContent>
          </Card>
        </div>

        {/* (B) Regras do Programa */}
        <Card className="bg-black/50 border-green-900/50">
          <CardHeader>
            <CardTitle className="text-green-400">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {programInfo?.rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-2 text-green-600">
                  <span className="text-green-400 font-bold mt-1">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* (D) Histórico de Indicações */}
        <Card className="bg-black/50 border-green-900/50">
          <CardHeader>
            <CardTitle className="text-green-400">Histórico de Indicações</CardTitle>
            <CardDescription className="text-green-600">
              Acompanhe o status de todas as suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!customer || referrals.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>
                  {!customer 
                    ? "Faça login para ver suas indicações." 
                    : "Você ainda não tem indicações."}
                </p>
                <p className="text-sm mt-2">
                  {!customer 
                    ? "Compartilhe o link acima para começar a ganhar!" 
                    : "Compartilhe seu link para começar a ganhar!"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-green-900/50 hover:bg-green-900/10">
                      <TableHead className="text-green-600">ID</TableHead>
                      <TableHead className="text-green-600">Nome</TableHead>
                      <TableHead className="text-green-600">Data Cadastro</TableHead>
                      <TableHead className="text-green-600">Primeira Recarga</TableHead>
                      <TableHead className="text-green-600">Valor Recarga</TableHead>
                      <TableHead className="text-green-600">Bônus Gerado</TableHead>
                      <TableHead className="text-green-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((ref) => (
                      <TableRow key={ref.id} className="border-green-900/50 hover:bg-green-900/10">
                        <TableCell className="text-green-400 font-mono">#{ref.referredId}</TableCell>
                        <TableCell className="text-green-400">{ref.referredName}</TableCell>
                        <TableCell className="text-green-600">
                          {formatDate(ref.createdAt)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {formatDate(ref.firstRechargeAt)}
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          {ref.firstRechargeAmount > 0
                            ? formatCurrency(ref.firstRechargeAmount)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          {ref.bonusGenerated > 0 ? formatCurrency(ref.bonusGenerated) : "—"}
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
      </div>
    </StoreLayout>
  );
}
