import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: {
    id: number;
    smshubCode: string;
    name: string;
    category: string | null;
    active: boolean;
    markupPercentage: number;
    markupFixed: number;
  } | null;
  onSuccess?: () => void;
}

export function ServiceDialog({ open, onOpenChange, service, onSuccess }: ServiceDialogProps) {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    smshubCode: "",
    name: "",
    category: "",
    active: true,
    markupPercentage: 0,
    markupFixed: 0,
  });

  const isEdit = !!service;

  useEffect(() => {
    if (service) {
      setFormData({
        smshubCode: service.smshubCode,
        name: service.name,
        category: service.category || "",
        active: service.active,
        markupPercentage: service.markupPercentage,
        markupFixed: service.markupFixed / 100, // Convert cents to reais
      });
    } else {
      setFormData({
        smshubCode: "",
        name: "",
        category: "",
        active: true,
        markupPercentage: 0,
        markupFixed: 0,
      });
    }
  }, [service, open]);

  const createMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      toast.success("Serviço adicionado com sucesso!");
      utils.services.getAll.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar serviço: ${error.message}`);
    },
  });

  const updateMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Serviço atualizado com sucesso!");
      utils.services.getAll.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar serviço: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.smshubCode.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isEdit && service) {
      updateMutation.mutate({
        id: service.id,
        name: formData.name,
        category: formData.category || undefined,
        active: formData.active,
        markupPercentage: formData.markupPercentage,
        markupFixed: Math.round(formData.markupFixed * 100), // Convert reais to cents
      });
    } else {
      createMutation.mutate({
        smshubCode: formData.smshubCode,
        name: formData.name,
        category: formData.category || undefined,
        active: formData.active,
        markupPercentage: formData.markupPercentage,
        markupFixed: Math.round(formData.markupFixed * 100), // Convert reais to cents
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const categoryOptions = [
    "Social",
    "Mensageria",
    "E-commerce",
    "Finanças",
    "Entretenimento",
    "Delivery",
    "Transporte",
    "Outros",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Serviço" : "Adicionar Novo Serviço"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize as informações do serviço"
                : "Adicione um novo serviço manualmente ao catálogo"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="smshubCode">
                  Código do SMSHub <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="smshubCode"
                  value={formData.smshubCode}
                  onChange={(e) => setFormData({ ...formData, smshubCode: e.target.value })}
                  placeholder="Ex: wa, tg, go"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Código único do serviço na API do SMSHub
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">
                Nome do Serviço <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: WhatsApp"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione uma categoria</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Ajuda a organizar os serviços no painel de vendas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="markupPercentage">Markup (%)</Label>
                <Input
                  id="markupPercentage"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={formData.markupPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, markupPercentage: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="markupFixed">Markup Fixo (R$)</Label>
                <Input
                  id="markupFixed"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.markupFixed}
                  onChange={(e) =>
                    setFormData({ ...formData, markupFixed: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Serviço Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Disponível para venda no painel público
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>{isEdit ? "Atualizar" : "Adicionar"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
