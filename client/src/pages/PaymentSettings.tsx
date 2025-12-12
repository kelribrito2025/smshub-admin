import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone, Pencil, Check, X } from "lucide-react";

type PaymentMethod = 'pix' | 'stripe';

interface EditingState {
  method: PaymentMethod | null;
  minAmount: string;
  bonusPercentage: string;
}

export default function PaymentSettings() {
  const { data: settings, isLoading } = trpc.paymentSettings.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const updateMutation = trpc.paymentSettings.update.useMutation();
  const utils = trpc.useUtils();

  const [editing, setEditing] = useState<EditingState>({
    method: null,
    minAmount: "",
    bonusPercentage: "",
  });

  const startEdit = (method: PaymentMethod) => {
    if (editing.method !== null) {
      toast.error("Salve ou cancele a edição atual antes de editar outra linha");
      return;
    }

    const minAmount = method === 'pix' ? settings?.pixMinAmount : settings?.stripeMinAmount;
    const bonusPercentage = method === 'pix' ? settings?.pixBonusPercentage : settings?.stripeBonusPercentage;

    setEditing({
      method,
      minAmount: ((minAmount || 0) / 100).toFixed(2),
      bonusPercentage: (bonusPercentage || 0).toString(),
    });
  };

  const cancelEdit = () => {
    setEditing({
      method: null,
      minAmount: "",
      bonusPercentage: "",
    });
  };

  const saveEdit = async () => {
    if (!editing.method) return;

    // Validações
    const minAmountNum = parseFloat(editing.minAmount);
    const bonusPercentageNum = parseInt(editing.bonusPercentage);

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

      if (editing.method === 'pix') {
        await updateMutation.mutateAsync({
          pixMinAmount: minAmountCents,
          pixBonusPercentage: bonusPercentageNum,
        });
      } else {
        await updateMutation.mutateAsync({
          stripeMinAmount: minAmountCents,
          stripeBonusPercentage: bonusPercentageNum,
        });
      }

      toast.success("Configurações atualizadas com sucesso!");
      utils.paymentSettings.get.invalidate();
      cancelEdit();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const handleToggle = async (method: PaymentMethod, enabled: boolean) => {
    try {
      if (method === 'pix') {
        await updateMutation.mutateAsync({ pixEnabled: enabled });
      } else {
        await updateMutation.mutateAsync({ stripeEnabled: enabled });
      }

      toast.success(`${method === 'pix' ? 'PIX' : 'Cartão de Crédito'} ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
      utils.paymentSettings.get.invalidate();
    } catch (error) {
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const paymentMethods = [
    {
      id: 'pix' as PaymentMethod,
      name: 'PIX',
      icon: Smartphone,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
      enabled: settings?.pixEnabled ?? true,
      minAmount: settings?.pixMinAmount ?? 1000,
      bonusPercentage: settings?.pixBonusPercentage ?? 5,
    },
    {
      id: 'stripe' as PaymentMethod,
      name: 'Cartão de Crédito',
      icon: CreditCard,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      enabled: settings?.stripeEnabled ?? true,
      minAmount: settings?.stripeMinAmount ?? 2000,
      bonusPercentage: settings?.stripeBonusPercentage ?? 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-500" />
            Configurações de Pagamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie métodos de pagamento, valores mínimos e bônus
          </p>
        </div>

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
                const isEditing = editing.method === method.id;
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
                          value={editing.minAmount}
                          onChange={(e) => setEditing({ ...editing, minAmount: e.target.value })}
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
                          value={editing.bonusPercentage}
                          onChange={(e) => setEditing({ ...editing, bonusPercentage: e.target.value })}
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
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          >
                            {updateMutation.isPending ? (
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
                            onClick={cancelEdit}
                            disabled={updateMutation.isPending}
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
                          onClick={() => startEdit(method.id)}
                          disabled={updateMutation.isPending || editing.method !== null}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={(checked) => handleToggle(method.id, checked)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning se todos desabilitados */}
            {!settings?.pixEnabled && !settings?.stripeEnabled && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Atenção: Pelo menos um método de pagamento deve estar ativo para que os clientes possam fazer recargas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
