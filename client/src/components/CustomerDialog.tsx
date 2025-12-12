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
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [active, setActive] = useState(true);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setEmail(customer.email || "");
      setBalance((customer.balance || 0) / 100);
      setActive(customer.active !== false);
      setBanned(customer.banned || false);
    } else {
      setName("");
      setEmail("");
      setBalance(0);
      setActive(true);
      setBanned(false);
    }
  }, [customer]);

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });

  const banMutation = trpc.customers.banCustomer.useMutation({
    onSuccess: () => {
      toast.success("Cliente banido permanentemente");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao banir cliente: ${error.message}`);
    },
  });

  const unbanMutation = trpc.customers.unbanCustomer.useMutation({
    onSuccess: () => {
      toast.success("Banimento removido com sucesso");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao remover banimento: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!email.trim()) {
      toast.error("E-mail é obrigatório");
      return;
    }

    if (customer) {
      // If banning/unbanning, use specific mutations
      if (banned !== customer.banned) {
        if (banned) {
          banMutation.mutate({ id: customer.id });
        } else {
          unbanMutation.mutate({ id: customer.id });
        }
        return;
      }
      
      updateMutation.mutate({
        id: customer.id,
        name,
        email,
        active,
      });
    } else {
      createMutation.mutate({
        name,
        email,
        balance,
        active,
      });
    }
  };



  const isPending = createMutation.isPending || updateMutation.isPending || banMutation.isPending || unbanMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Editar Cliente" : "Adicionar Cliente"}</DialogTitle>
          <DialogDescription>
            {customer
              ? "Atualize as informações do cliente"
              : "Preencha os dados para criar um novo cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Nome do cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>

          {!customer && (
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial (R$)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: defina um saldo inicial para o cliente
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Cliente Ativo</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
              disabled={isPending}
            />
          </div>

          {/* Ban Section - Only for editing existing customers */}
          {customer && (
            <>
              <Separator className="my-4" />
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="banned" className="text-base font-semibold">
                      Banimento Permanente
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, o cliente não poderá acessar o sistema
                    </p>
                  </div>
                  <Switch
                    id="banned"
                    checked={banned}
                    onCheckedChange={setBanned}
                    disabled={isPending}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {customer ? "Atualizar" : "Criar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
