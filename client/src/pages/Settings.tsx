import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Users, Pencil, Check, X, Loader2, Info, Settings as SettingsIcon, CreditCard, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PaymentMethod = 'pix' | 'stripe';

interface AffiliateEditingState {
  bonusPercentage: string;
  description: string;
}

interface PaymentEditingState {
  method: PaymentMethod | null;
  minAmount: string;
  bonusPercentage: string;
}

export default function Settings() {
  const { user } = useAuth();

  // Affiliate settings
  const { data: affiliateSettings, isLoading: isLoadingAffiliate } = trpc.affiliateAdmin.getSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const updateAffiliateMutation = trpc.affiliateAdmin.updateSettings.useMutation();

  // Payment settings
  const { data: paymentSettings, isLoading: isLoadingPayment } = trpc.paymentSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const updatePaymentMutation = trpc.paymentSettings.update.useMutation();

  const utils = trpc.useUtils();

  const [isEditingAffiliate, setIsEditingAffiliate] = useState(false);
  const [affiliateEditing, setAffiliateEditing] = useState<AffiliateEditingState>({
    bonusPercentage: "",
    description: "",
  });

  const [paymentEditing, setPaymentEditing] = useState<PaymentEditingState>({
    method: null,
    minAmount: "",
    bonusPercentage: "",
  });

  // Affiliate functions
  const startAffiliateEdit = () => {
    if (isEditingAffiliate) {
      toast.error("Salve ou cancele a edição atual antes de editar novamente");
      return;
    }

    setAffiliateEditing({
      bonusPercentage: (affiliateSettings?.bonusPercentage || 10).toString(),
      description: affiliateSettings?.description || "Bônus de 10% sobre a 1ª recarga do indicados.",
    });
    setIsEditingAffiliate(true);
  };

  const cancelAffiliateEdit = () => {
    setIsEditingAffiliate(false);
    setAffiliateEditing({
      bonusPercentage: "",
      description: "",
    });
  };

  const saveAffiliateEdit = async () => {
    const bonusPercentageNum = parseInt(affiliateEditing.bonusPercentage);

    if (isNaN(bonusPercentageNum) || bonusPercentageNum < 0 || bonusPercentageNum > 100) {
      toast.error("Percentual de bônus deve estar entre 0 e 100");
      return;
    }

    if (!affiliateEditing.description.trim()) {
      toast.error("Descrição não pode estar vazia");
      return;
    }

    try {
      await updateAffiliateMutation.mutateAsync({
        bonusPercentage: bonusPercentageNum,
        description: affiliateEditing.description,
      });

      toast.success("Configurações atualizadas com sucesso!");
      utils.affiliateAdmin.getSettings.invalidate();
      cancelAffiliateEdit();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const handleAffiliateToggle = async (enabled: boolean) => {
    try {
      await updateAffiliateMutation.mutateAsync({ isActive: enabled });
      toast.success(`Programa de afiliados ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
      utils.affiliateAdmin.getSettings.invalidate();
    } catch (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  // Payment functions
  const startPaymentEdit = (method: PaymentMethod) => {
    if (paymentEditing.method !== null) {
      toast.error("Salve ou cancele a edição atual antes de editar outra linha");
      return;
    }

    const minAmount = method === 'pix' ? paymentSettings?.pixMinAmount : paymentSettings?.stripeMinAmount;
    const bonusPercentage = method === 'pix' ? paymentSettings?.pixBonusPercentage : paymentSettings?.stripeBonusPercentage;

    setPaymentEditing({
      method,
      minAmount: ((minAmount || 0) / 100).toFixed(2),
      bonusPercentage: (bonusPercentage || 0).toString(),
    });
  };

  const cancelPaymentEdit = () => {
    setPaymentEditing({
      method: null,
      minAmount: "",
      bonusPercentage: "",
    });
  };

  const savePaymentEdit = async () => {
    if (!paymentEditing.method) return;

    const minAmountNum = parseFloat(paymentEditing.minAmount);
    const bonusPercentageNum = parseInt(paymentEditing.bonusPercentage);

    if (isNaN(minAmountNum) || minAmountNum < 0) {
      toast.error("Valor mínimo inválido");
      return;
    }

    if (isNaN(bonusPercentageNum) || bonusPercentageNum < 0 || bonusPercentageNum > 100) {
      toast.error("Bônus deve estar entre 0 e 100");
      return;
    }

    try {
      const minAmountCents = Math.round(minAmountNum * 100);

      if (paymentEditing.method === 'pix') {
        await updatePaymentMutation.mutateAsync({
          pixMinAmount: minAmountCents,
          pixBonusPercentage: bonusPercentageNum,
        });
      } else {
        await updatePaymentMutation.mutateAsync({
          stripeMinAmount: minAmountCents,
          stripeBonusPercentage: bonusPercentageNum,
        });
      }

      toast.success("Configurações atualizadas com sucesso!");
      utils.paymentSettings.get.invalidate();
      cancelPaymentEdit();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const handlePaymentToggle = async (method: PaymentMethod, enabled: boolean) => {
    try {
      if (method === 'pix') {
        await updatePaymentMutation.mutateAsync({ pixEnabled: enabled });
      } else {
        await updatePaymentMutation.mutateAsync({ stripeEnabled: enabled });
      }

      toast.success(`${method === 'pix' ? 'PIX' : 'Cartão de Crédito'} ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
      utils.paymentSettings.get.invalidate();
    } catch (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  if (isLoadingAffiliate || isLoadingPayment) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const affiliateBonusPercentage = affiliateSettings?.bonusPercentage || 10;
  const affiliateDescription = affiliateSettings?.description || "Bônus de 10% sobre a 1ª recarga do indicados.";
  const affiliateIsActive = affiliateSettings?.isActive ?? true;

  const paymentMethods = [
    {
      id: 'pix' as PaymentMethod,
      name: 'PIX',
      icon: Smartphone,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
      enabled: paymentSettings?.pixEnabled ?? true,
      minAmount: paymentSettings?.pixMinAmount ?? 1000,
      bonusPercentage: paymentSettings?.pixBonusPercentage ?? 5,
    },
    {
      id: 'stripe' as PaymentMethod,
      name: 'Cartão',
      icon: CreditCard,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      enabled: paymentSettings?.stripeEnabled ?? true,
      minAmount: paymentSettings?.stripeMinAmount ?? 2000,
      bonusPercentage: paymentSettings?.stripeBonusPercentage ?? 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-blue-500" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie métodos de pagamento e programa de afiliados
          </p>
        </div>

        {/* Card 1: Métodos de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
            <CardDescription>
              Configure os métodos de pagamento disponíveis no painel de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Header da tabela */}
            <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr] gap-4 pb-3 mb-4 border-b text-sm font-semibold text-muted-foreground">
              <div>Método</div>
              <div>Valor Mínimo (R$)</div>
              <div>Bônus (%)</div>
              <div>Status</div>
              <div className="text-right">Ações</div>
            </div>

            {/* Rows */}
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const isEditing = paymentEditing.method === method.id;
                const Icon = method.icon;

                return (
                  <div
                    key={method.id}
                    className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr] gap-4 items-center p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
                  >
                    {/* Método */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${method.iconBg} rounded-lg`}>
                        <Icon className={`w-5 h-5 ${method.iconColor}`} />
                      </div>
                      <span className="font-semibold">{method.name}</span>
                    </div>

                    {/* Valor Mínimo */}
                    <div>
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Valor Mínimo (R$)</div>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentEditing.minAmount}
                          onChange={(e) => setPaymentEditing({ ...paymentEditing, minAmount: e.target.value })}
                          className="h-9"
                          placeholder="10.00"
                        />
                      ) : (
                        <span className="text-sm">R$ {(method.minAmount / 100).toFixed(2)}</span>
                      )}
                    </div>

                    {/* Bônus */}
                    <div>
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Bônus (%)</div>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={paymentEditing.bonusPercentage}
                          onChange={(e) => setPaymentEditing({ ...paymentEditing, bonusPercentage: e.target.value })}
                          className="h-9"
                          placeholder="5"
                        />
                      ) : (
                        <span className="text-sm">{method.bonusPercentage}%</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${method.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="text-sm">{method.enabled ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={savePaymentEdit}
                            disabled={updatePaymentMutation.isPending}
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          >
                            {updatePaymentMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Salvar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelPaymentEdit}
                            disabled={updatePaymentMutation.isPending}
                            className="text-gray-500 hover:text-gray-600 hover:bg-gray-500/10"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startPaymentEdit(method.id)}
                          disabled={updatePaymentMutation.isPending || paymentEditing.method !== null}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={(checked) => handlePaymentToggle(method.id, checked)}
                        disabled={updatePaymentMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning se todos desabilitados */}
            {!paymentSettings?.pixEnabled && !paymentSettings?.stripeEnabled && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Atenção: Pelo menos um método de pagamento deve estar ativo para que os clientes possam fazer recargas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Configurações do Programa de Afiliados */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Programa de Afiliados</CardTitle>
            <CardDescription>
              Defina as regras do programa de indicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Header da tabela */}
            <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_2.5fr_1fr_1.5fr] gap-4 pb-3 mb-4 border-b text-sm font-semibold text-muted-foreground">
              <div>Programa</div>
              <div>Percentual de Bônus</div>
              <div>Descrição</div>
              <div>Status</div>
              <div className="text-right">Ações</div>
            </div>

            {/* Row */}
            <div className="grid md:grid-cols-[2fr_1.5fr_2.5fr_1fr_1.5fr] gap-4 items-center p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
              {/* Programa */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-semibold">Programa de Afiliados</span>
              </div>

              {/* Percentual de Bônus */}
              <div>
                <div className="md:hidden text-xs text-muted-foreground mb-1">Percentual de Bônus</div>
                {isEditingAffiliate ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={affiliateEditing.bonusPercentage}
                    onChange={(e) => setAffiliateEditing({ ...affiliateEditing, bonusPercentage: e.target.value })}
                    className="h-9 max-w-[100px]"
                    placeholder="10"
                  />
                ) : (
                  <span className="text-sm font-medium">{affiliateBonusPercentage}%</span>
                )}
              </div>

              {/* Descrição */}
              <div>
                <div className="md:hidden text-xs text-muted-foreground mb-1">Descrição</div>
                {isEditingAffiliate ? (
                  <Input
                    type="text"
                    value={affiliateEditing.description}
                    onChange={(e) => setAffiliateEditing({ ...affiliateEditing, description: e.target.value })}
                    className="h-9"
                    placeholder="Descrição do programa"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{affiliateDescription}</span>
                )}
              </div>

              {/* Status */}
              <div>
                <div className="md:hidden text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${affiliateIsActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm">{affiliateIsActive ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2">
                {isEditingAffiliate ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={saveAffiliateEdit}
                      disabled={updateAffiliateMutation.isPending}
                      className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    >
                      {updateAffiliateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Salvar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelAffiliateEdit}
                      disabled={updateAffiliateMutation.isPending}
                      className="text-gray-500 hover:text-gray-600 hover:bg-gray-500/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startAffiliateEdit}
                    disabled={updateAffiliateMutation.isPending}
                  >
                    Editar
                  </Button>
                )}
                
                <Switch
                  checked={affiliateIsActive}
                  onCheckedChange={handleAffiliateToggle}
                  disabled={updateAffiliateMutation.isPending}
                />
              </div>
            </div>

            {/* Bloco de Exemplo */}
            <div className="flex items-start gap-3 p-4 mt-4 bg-muted/30 border border-border rounded-lg">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold">Exemplo:</span> Se um indicado recarregar R$ 100,00, o afiliado ganhará R$ {((100 * affiliateBonusPercentage) / 100).toFixed(2)} de bônus
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
