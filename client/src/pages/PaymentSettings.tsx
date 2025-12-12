import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "@/contexts/ToastContext";
import { Loader2, CreditCard, Smartphone } from "lucide-react";

export default function PaymentSettings() {
  const { data: settings, isLoading, refetch } = trpc.paymentSettings.get.useQuery();
  const updateMutation = trpc.paymentSettings.update.useMutation();

  const [pixEnabled, setPixEnabled] = useState(settings?.pixEnabled ?? true);
  const [stripeEnabled, setStripeEnabled] = useState(settings?.stripeEnabled ?? true);

  // Update local state when data loads
  if (settings && pixEnabled !== settings.pixEnabled) {
    setPixEnabled(settings.pixEnabled);
  }
  if (settings && stripeEnabled !== settings.stripeEnabled) {
    setStripeEnabled(settings.stripeEnabled);
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        pixEnabled,
        stripeEnabled,
      });
      
      toast.success("Configurações de pagamento atualizadas!");
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const hasChanges = 
    settings && 
    (pixEnabled !== settings.pixEnabled || stripeEnabled !== settings.stripeEnabled);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-500" />
            Configurações de Pagamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie quais formas de pagamento estão disponíveis no painel de vendas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
            <CardDescription>
              Ative ou desative métodos de pagamento. As alterações refletem imediatamente no painel de vendas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PIX Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Smartphone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <Label htmlFor="pix-toggle" className="text-base font-semibold cursor-pointer">
                    PIX
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pagamento instantâneo via PIX (EfiPay)
                  </p>
                </div>
              </div>
              <Switch
                id="pix-toggle"
                checked={pixEnabled}
                onCheckedChange={setPixEnabled}
              />
            </div>

            {/* Stripe Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="stripe-toggle" className="text-base font-semibold cursor-pointer">
                    Stripe
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Cartão de crédito/débito via Stripe
                  </p>
                </div>
              </div>
              <Switch
                id="stripe-toggle"
                checked={stripeEnabled}
                onCheckedChange={setStripeEnabled}
              />
            </div>

            {/* Warning if all disabled */}
            {!pixEnabled && !stripeEnabled && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Atenção: Pelo menos um método de pagamento deve estar ativo para que os clientes possam fazer recargas.
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending || (!pixEnabled && !stripeEnabled)}
                className="min-w-32"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • <strong>PIX ativo:</strong> Clientes verão a opção de pagamento via PIX no modal de recarga
            </p>
            <p>
              • <strong>Stripe ativo:</strong> Clientes verão a opção de pagamento via cartão de crédito/débito
            </p>
            <p>
              • <strong>Ambos ativos:</strong> Clientes podem escolher entre PIX ou cartão
            </p>
            <p>
              • <strong>Ambos inativos:</strong> Modal de recarga não será exibido (botão desabilitado)
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
