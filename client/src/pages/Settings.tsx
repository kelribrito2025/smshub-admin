import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Settings as SettingsIcon, Percent, Power, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();

  // Affiliate settings states
  const [bonusPercentage, setBonusPercentage] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Affiliate queries
  const { data: affiliateSettings } = trpc.affiliateAdmin.getSettings.useQuery();
  const updateAffiliateMutation = trpc.affiliateAdmin.updateSettings.useMutation();

  useEffect(() => {
    if (affiliateSettings) {
      setBonusPercentage(affiliateSettings.bonusPercentage);
      setIsActive(affiliateSettings.isActive);
    }
  }, [affiliateSettings]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-blue-500" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as configurações do sistema
          </p>
        </div>

        {/* Affiliate Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Programa de Afiliados</CardTitle>
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
                onClick={async () => {
                  try {
                    await updateAffiliateMutation.mutateAsync({
                      bonusPercentage,
                      isActive,
                    });
                    toast.success("Configurações salvas com sucesso!");
                  } catch (error: any) {
                    toast.error("Erro ao salvar configurações", {
                      description: error.message,
                    });
                  }
                }}
                disabled={updateAffiliateMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updateAffiliateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </DashboardLayout>
  );
}
