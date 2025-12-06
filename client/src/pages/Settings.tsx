import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [apiKey, setApiKey] = useState("");
  const [markupPercentage, setMarkupPercentage] = useState(0);
  const [markupFixed, setMarkupFixed] = useState(0);

  const { data: apiKeySetting } = trpc.settings.get.useQuery({ key: "smshub_api_key" });
  const { data: defaultMarkup } = trpc.settings.getDefaultMarkup.useQuery();

  const setApiKeyMutation = trpc.settings.setApiKey.useMutation({
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success("API Key salva com sucesso!");
      }
      utils.settings.get.invalidate({ key: "smshub_api_key" });
      utils.settings.getBalance.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setDefaultMarkupMutation = trpc.settings.setDefaultMarkup.useMutation({
    onSuccess: () => {
      toast.success("Markup padrão salvo com sucesso!");
      utils.settings.getDefaultMarkup.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar markup: ${error.message}`);
    },
  });

  useEffect(() => {
    if (apiKeySetting?.value) {
      setApiKey(apiKeySetting.value);
    }
  }, [apiKeySetting]);

  useEffect(() => {
    if (defaultMarkup) {
      setMarkupPercentage(defaultMarkup.markupPercentage);
      setMarkupFixed(defaultMarkup.markupFixed / 100); // Convert cents to reais
    }
  }, [defaultMarkup]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira uma API Key");
      return;
    }

    setApiKeyMutation.mutate({ apiKey: apiKey.trim() });
  };

  const handleSaveMarkup = () => {
    setDefaultMarkupMutation.mutate({
      markupPercentage,
      markupFixed: Math.round(markupFixed * 100), // Convert reais to cents
    });
  };

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
            Configure a API Key do SMSHub e markups padrão
          </p>
        </div>

        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>API Key do SMSHub</CardTitle>
            <CardDescription>
              Configure sua chave de API para conectar com o SMSHub. Você pode obter sua API Key
              no painel do SMSHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Digite sua API Key do SMSHub"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sua API Key será armazenada de forma segura e usada para todas as requisições ao
                SMSHub.
              </p>
            </div>

            <Button
              onClick={handleSaveApiKey}
              disabled={setApiKeyMutation.isPending}
            >
              {setApiKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar API Key
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Default Markup Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Markup Padrão</CardTitle>
            <CardDescription>
              Configure o markup padrão que será aplicado a todos os novos serviços e países
              sincronizados. Você pode personalizar o markup individualmente depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="markupPercentage">Markup Percentual (%)</Label>
                <Input
                  id="markupPercentage"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  placeholder="0"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Percentual de markup sobre o preço do SMSHub (ex: 20 para 20%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="markupFixed">Markup Fixo (R$)</Label>
                <Input
                  id="markupFixed"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={markupFixed}
                  onChange={(e) => setMarkupFixed(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Valor fixo adicionado ao preço (em reais)
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">Exemplo de Cálculo:</h4>
              <p className="text-sm text-muted-foreground">
                Se o preço do SMSHub for R$ 1,00:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Preço base: R$ 1,00</li>
                <li>• + {markupPercentage}% = R$ {(1 * (1 + markupPercentage / 100)).toFixed(2)}</li>
                <li>• + R$ {markupFixed.toFixed(2)} fixo = R$ {(1 * (1 + markupPercentage / 100) + markupFixed).toFixed(2)}</li>
                <li className="font-medium text-foreground pt-1">
                  → Preço final: R$ {(1 * (1 + markupPercentage / 100) + markupFixed).toFixed(2)}
                </li>
              </ul>
            </div>

            <Button
              onClick={handleSaveMarkup}
              disabled={setDefaultMarkupMutation.isPending}
            >
              {setDefaultMarkupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Markup Padrão
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Configure sua API Key do SMSHub acima</li>
              <li>Defina o markup padrão que deseja aplicar</li>
              <li>Vá para a página de Sincronização para importar países e serviços</li>
              <li>Ajuste os markups individuais de países e serviços conforme necessário</li>
              <li>Ative/desative os países e serviços que deseja revender</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
