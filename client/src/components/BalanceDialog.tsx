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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/contexts/ToastContext";
import { format } from "date-fns";

interface BalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
  onSuccess: () => void;
}

export function BalanceDialog({ open, onOpenChange, customer, onSuccess }: BalanceDialogProps) {
  const [amount, setAmount] = useState(0); // Valor em centavos
  const [type, setType] = useState<"credit" | "debit" | "refund" | "withdrawal" | "hold">("credit");
  const [description, setDescription] = useState("");

  const { data: transactions, isLoading: loadingTransactions } = trpc.customers.getTransactions.useQuery(
    { customerId: customer?.id || 0, limit: 8 },
    { enabled: !!customer }
  );

  useEffect(() => {
    if (!open) {
      setAmount(0);
      setType("credit");
      setDescription("");
    }
  }, [open]);

  const addBalanceMutation = trpc.customers.addBalance.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Saldo ${type === "credit" ? "adicionado" : "removido"} com sucesso! Novo saldo: R$ ${data.balanceAfter.toFixed(2)}`
      );
      onSuccess();
      setAmount(0);
      setDescription("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (amount <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    // amount já está em centavos do CurrencyInput, backend espera centavos
    const finalAmount = (type === "credit" || type === "refund") ? amount : -amount;

    addBalanceMutation.mutate({
      customerId: customer.id,
      amount: finalAmount,
      type,
      description,
    });
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Saldo</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{customer.email} - ID: #{customer.pin}</p>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Add Balance Form */}
          <div className="space-y-4 border border-border bg-card rounded-lg p-4">
            <h3 className="font-semibold">Adicionar/Remover Saldo</h3>
            
            {/* Linha horizontal: Saldo Atual + Tipo de Operação + Valor + Descrição */}
            <div className="grid grid-cols-[180px_1fr_180px_2fr] gap-4 items-end">
              {/* Saldo Atual - Esquerda (compacto) */}
              <div className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg h-[68px] flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Saldo atual</p>
                <p className="text-lg font-bold font-mono text-green-500">R$ {(customer.balance / 100).toFixed(2)}</p>
              </div>

              {/* Tipo de Operação */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Operação</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4 text-green-600" />
                        Adicionar
                      </div>
                    </SelectItem>
                    <SelectItem value="debit">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-red-600" />
                        Debitar
                      </div>
                    </SelectItem>
                    <SelectItem value="refund">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4 text-orange-600" />
                        Reembolsar
                      </div>
                    </SelectItem>
                    <SelectItem value="withdrawal">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-purple-600" />
                        Saque
                      </div>
                    </SelectItem>
                    <SelectItem value="hold">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-yellow-600" />
                        Reter saldo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor (largura fixa 180px) */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <CurrencyInput
                  id="amount"
                  value={amount}
                  onChange={(cents) => setAmount(cents)}
                  disabled={addBalanceMutation.isPending}
                  className="h-[44px]"
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Descrição - Agora horizontal */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Motivo da transação..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={addBalanceMutation.isPending}
                  className="h-[44px]"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={addBalanceMutation.isPending}
              className="w-full"
            >
              {addBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Confirmar Transação
                </>
              )}
            </Button>
          </div>

          {/* Transaction History */}
          <div className="space-y-4 border border-border bg-card rounded-lg p-4">
            <h3 className="font-semibold">Histórico de Transações (últimas 8)</h3>
            
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Saldo Após</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs">
                          {format(new Date(transaction.createdAt), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {transaction.type === "credit" && (
                            <span className="text-green-600 flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              Crédito
                            </span>
                          )}
                          {transaction.type === "debit" && (
                            <span className="text-red-600 flex items-center gap-1">
                              <ArrowDown className="h-3 w-3" />
                              Débito
                            </span>
                          )}
                          {transaction.type === "purchase" && (
                            <span className="text-blue-600">Compra</span>
                          )}
                          {transaction.type === "refund" && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              Reembolso
                            </span>
                          )}
                          {transaction.type === "withdrawal" && (
                            <span className="text-purple-600 flex items-center gap-1">
                              <ArrowDown className="h-3 w-3" />
                              Saque
                            </span>
                          )}
                          {transaction.type === "hold" && (
                            <span className="text-yellow-600 flex items-center gap-1">
                              <ArrowDown className="h-3 w-3" />
                              Retenção
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {transaction.amount >= 0 ? "+" : ""}R$ {transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          R$ {transaction.balanceAfter.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {transaction.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma transação registrada ainda
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
