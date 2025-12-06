import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Webhook } from "lucide-react";

export default function WebhookSetup() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configStatus, setConfigStatus] = useState<"idle" | "success" | "error">("idle");

  const setupWebhookMutation = trpc.pix.setupWebhook.useMutation({
    onSuccess: (data) => {
      setConfigStatus("success");
      setIsConfiguring(false);
      toast.success("Webhook configurado com sucesso!");
      console.log("[Webhook] Configured:", data);
    },
    onError: (error) => {
      setConfigStatus("error");
      setIsConfiguring(false);
      toast.error(`Erro ao configurar webhook: ${error.message}`);
      console.error("[Webhook] Error:", error);
    },
  });

  const handleSetupWebhook = () => {
    if (!webhookUrl) {
      toast.error("Por favor, insira a URL do webhook");
      return;
    }

    setIsConfiguring(true);
    setConfigStatus("idle");
    setupWebhookMutation.mutate({ webhookUrl });
  };

  const handleAutoDetect = () => {
    // Auto-detect current domain
    const currentDomain = window.location.origin;
    const autoWebhookUrl = `${currentDomain}/api/webhook/pix`;
    setWebhookUrl(autoWebhookUrl);
    toast.info("URL do webhook detectada automaticamente");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
          <Webhook className="w-8 h-8 text-blue-500" />
          Configuração de Webhook PIX
        </h1>
        <p className="text-gray-400">
          Configure o webhook da EfiPay para receber notificações automáticas de pagamento PIX.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">O que é o Webhook?</h2>
        <p className="text-gray-400 mb-4">
          O webhook é uma URL que a EfiPay chamará automaticamente quando um pagamento PIX for confirmado.
          Isso permite que o sistema atualize o saldo do cliente em tempo real, sem necessidade de polling manual.
        </p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-500 mb-2">Como funciona:</h3>
          <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
            <li>Cliente gera QR Code PIX</li>
            <li>Cliente paga o PIX</li>
            <li>EfiPay detecta o pagamento</li>
            <li>EfiPay envia notificação para o webhook</li>
            <li>Sistema atualiza saldo automaticamente</li>
          </ol>
        </div>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Configurar Webhook</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL do Webhook
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://seu-dominio.com/api/webhook/pix"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                disabled={isConfiguring}
              />
              <Button
                onClick={handleAutoDetect}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
                disabled={isConfiguring}
              >
                Auto-detectar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              A URL deve ser pública e acessível pela internet
            </p>
          </div>

          <Button
            onClick={handleSetupWebhook}
            disabled={isConfiguring || !webhookUrl}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
          >
            {isConfiguring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando...
              </>
            ) : (
              "Configurar Webhook"
            )}
          </Button>

          {configStatus === "success" && (
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Webhook configurado com sucesso!</span>
            </div>
          )}

          {configStatus === "error" && (
            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Erro ao configurar webhook. Verifique os logs.</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Configuração Manual</h2>
        <p className="text-gray-400 mb-4">
          Se preferir, você pode configurar o webhook manualmente no painel da EfiPay:
        </p>
        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2 mb-4">
          <li>Acesse <a href="https://sejaefi.com.br/" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline inline-flex items-center gap-1">sejaefi.com.br <ExternalLink className="h-3 w-3" /></a></li>
          <li>Faça login na sua conta</li>
          <li>Vá em <strong className="text-white">API Pix</strong> → <strong className="text-white">Webhooks</strong></li>
          <li>Clique em <strong className="text-white">Configurar Webhook</strong></li>
          <li>Insira a URL: <code className="bg-zinc-800 px-2 py-1 rounded text-green-500">{webhookUrl || "https://seu-dominio.com/api/webhook/pix"}</code></li>
          <li>Selecione sua chave PIX</li>
          <li>Clique em <strong className="text-white">Salvar</strong></li>
        </ol>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-xs text-yellow-500">
            <strong>Importante:</strong> Certifique-se de que a URL está acessível publicamente e que o certificado SSL está válido.
          </p>
        </div>
      </Card>
    </div>
  );
}
