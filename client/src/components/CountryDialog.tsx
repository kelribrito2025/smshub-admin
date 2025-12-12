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

interface CountryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: {
    id: number;
    smshubId: number;
    name: string;
    code: string;
    active: boolean;
    markupPercentage: number;
    markupFixed: number;
  } | null;
  onSuccess?: () => void;
}

export function CountryDialog({ open, onOpenChange, country, onSuccess }: CountryDialogProps) {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    smshubId: 0,
    name: "",
    code: "",
    active: true,
    markupPercentage: 0,
    markupFixed: 0,
  });

  const isEdit = !!country;

  useEffect(() => {
    if (country) {
      setFormData({
        smshubId: country.smshubId,
        name: country.name,
        code: country.code,
        active: country.active,
        markupPercentage: country.markupPercentage,
        markupFixed: country.markupFixed / 100, // Convert cents to reais
      });
    } else {
      setFormData({
        smshubId: 0,
        name: "",
        code: "",
        active: true,
        markupPercentage: 0,
        markupFixed: 0,
      });
    }
  }, [country, open]);

  const createMutation = trpc.countries.create.useMutation({
    onSuccess: () => {
      toast.success("País adicionado com sucesso!");
      utils.countries.getAll.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar país: ${error.message}`);
    },
  });

  const updateMutation = trpc.countries.update.useMutation({
    onSuccess: () => {
      toast.success("País atualizado com sucesso!");
      utils.countries.getAll.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar país: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isEdit && country) {
      updateMutation.mutate({
        id: country.id,
        name: formData.name,
        code: formData.code,
        active: formData.active,
        markupPercentage: formData.markupPercentage,
        markupFixed: Math.round(formData.markupFixed * 100), // Convert reais to cents
      });
    } else {
      createMutation.mutate({
        smshubId: formData.smshubId,
        name: formData.name,
        code: formData.code,
        active: formData.active,
        markupPercentage: formData.markupPercentage,
        markupFixed: Math.round(formData.markupFixed * 100), // Convert reais to cents
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar País" : "Adicionar Novo País"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize as informações do país"
                : "Adicione um novo país manualmente ao catálogo"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="smshubId">
                  ID do SMSHub <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="smshubId"
                  type="number"
                  min="0"
                  value={formData.smshubId}
                  onChange={(e) => setFormData({ ...formData, smshubId: Number(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  ID numérico do país na API do SMSHub
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">
                Nome do País <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Brasil"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: BR"
                required
              />
              <p className="text-xs text-muted-foreground">
                Código do país (geralmente 2 letras)
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
                <Label htmlFor="active">País Ativo</Label>
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
