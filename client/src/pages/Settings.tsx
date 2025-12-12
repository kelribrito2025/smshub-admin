import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Users, Pencil, Check, X, Loader2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EditingState {
  bonusPercentage: string;
  description: string;
}

export default function Settings() {
  const { user } = useAuth();

  const { data: settings, isLoading } = trpc.affiliateAdmin.getSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const updateMutation = trpc.affiliateAdmin.updateSettings.useMutation();
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState<EditingState>({
    bonusPercentage: "",
    description: "",
  });

  const startEdit = () => {
    if (isEditing) {
      toast.error("Salve ou cancele a edição atual antes de editar novamente");
      return;
    }

    setEditing({
      bonusPercentage: (settings?.bonusPercentage || 10).toString(),
      description: settings?.description || "Afiliados ganharão 10% do valor da primeira recarga dos indicados",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditing({
      bonusPercentage: "",
      description: "",
    });
  };

  const saveEdit = async () => {
    // Validações
    const bonusPercentageNum = parseInt(editing.bonusPercentage);

    if (isNaN(bonusPercentageNum) || bonusPercentageNum < 0 || bonusPercentageNum > 100) {
      toast.error("Percentual de bônus deve estar entre 0 e 100");
      return;
    }

    if (!editing.description.trim()) {
      toast.error("Descrição não pode estar vazia");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        bonusPercentage: bonusPercentageNum,
        description: editing.description,
      });

      toast.success("Configurações atualizadas com sucesso!");
      utils.affiliateAdmin.getSettings.invalidate();
      cancelEdit();
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
      console.error(error);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ isActive: enabled });
      toast.success(`Programa de afiliados ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
      utils.affiliateAdmin.getSettings.invalidate();
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

  const bonusPercentage = settings?.bonusPercentage || 10;
  const description = settings?.description || "Afiliados ganharão 10% do valor da primeira recarga dos indicados";
  const isActive = settings?.isActive ?? true;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Configurações do Programa de Afiliados
          </h1>
          <p className="text-muted-foreground mt-2">
            Defina as regras do programa de indicação
          </p>
        </div>

        {/* Tabela de Configurações */}
        <Card>
          <CardContent className="p-0">
            {/* Header da tabela */}
            <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_2.5fr_1fr_1.5fr] gap-4 px-6 py-4 border-b bg-muted/30 text-sm font-semibold text-muted-foreground">
              <div>Programa</div>
              <div>Percentual de Bônus</div>
              <div>Descrição</div>
              <div>Status</div>
              <div className="text-right">Ações</div>
            </div>

            {/* Row */}
            <div className="grid md:grid-cols-[2fr_1.5fr_2.5fr_1fr_1.5fr] gap-4 items-center px-6 py-5 bg-card/50 hover:bg-card/80 transition-colors">
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
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editing.bonusPercentage}
                    onChange={(e) => setEditing({ ...editing, bonusPercentage: e.target.value })}
                    className="h-9 max-w-[100px]"
                    placeholder="10"
                  />
                ) : (
                  <span className="text-sm font-medium">{bonusPercentage}%</span>
                )}
              </div>

              {/* Descrição */}
              <div>
                <div className="md:hidden text-xs text-muted-foreground mb-1">Descrição</div>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="h-9"
                    placeholder="Descrição do programa"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{description}</span>
                )}
              </div>

              {/* Status */}
              <div>
                <div className="md:hidden text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm">{isActive ? 'Ativo' : 'Inativo'}</span>
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
                    onClick={startEdit}
                    disabled={updateMutation.isPending}
                  >
                    Editar
                  </Button>
                )}
                
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggle}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco de Exemplo */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-lg">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold">Exemplo:</span> Se um indicado recarregar R$ 100,00, o afiliado ganhará R$ {((100 * bonusPercentage) / 100).toFixed(2)} de bônus
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
