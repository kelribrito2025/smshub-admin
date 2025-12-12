import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp, Loader2, Save, X, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BalanceSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
  onSuccess: () => void;
}

export function BalanceSidePanel({ open, onOpenChange, customer, onSuccess }: BalanceSidePanelProps) {
  const [amount, setAmount] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [type, setType] = useState<"credit" | "debit" | "refund" | "withdrawal" | "hold">("credit");
  const [description, setDescription] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Buscar todas as transações (sem limite)
  const { data: transactions, isLoading: loadingTransactions } = trpc.customers.getTransactions.useQuery(
    { customerId: customer?.id || 0, limit: 100 },
    { enabled: !!customer }
  );

  useEffect(() => {
    if (!open) {
      setAmount(0);
      setAmountDisplay("");
      setType("credit");
      setDescription("");
      setExpandedRow(null);
    }
  }, [open]);

  // Função para formatar centavos em reais (234 -> "2,34")
  const formatCentsToReais = (cents: number): string => {
    const reais = cents / 100;
    return reais.toFixed(2).replace(".", ",");
  };

  // Handler para input de centavos
  const handleAmountChange = (value: string) => {
    // Remove tudo que não é número
    const onlyNumbers = value.replace(/\D/g, "");
    
    if (onlyNumbers === "") {
      setAmount(0);
      setAmountDisplay("");
      return;
    }

    // Converte para número (centavos)
    const cents = parseInt(onlyNumbers, 10);
    
    // Limita a 150000 centavos (R$ 1.500,00)
    const limitedCents = Math.min(cents, 150000);
    
    setAmount(limitedCents);
    setAmountDisplay(formatCentsToReais(limitedCents));
  };

  const addBalanceMutation = trpc.customers.addBalance.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Saldo ${type === "credit" ? "adicionado" : "removido"} com sucesso! Novo saldo: R$ ${data.balanceAfter.toFixed(2)}`
      );
      onSuccess();
      setAmount(0);
      setAmountDisplay("");
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

    // amount já está em centavos, não precisa converter
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
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-[500px] bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Gerenciar Saldo</h2>
            <p className="text-sm text-muted-foreground mt-1">{customer.email} - ID: #{customer.pin}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formulário de Transação */}
          <div className="space-y-4 border border-border bg-card rounded-lg p-4">
            <h3 className="font-semibold text-sm">Adicionar/Remover Saldo</h3>
            
            {/* Linha Horizontal: Saldo + Tipo + Valor */}
            <div className="grid grid-cols-3 gap-3">
              {/* Saldo Disponível - Compacto */}
              <div className="space-y-2">
                <Label className="text-xs">Saldo Disponível</Label>
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-teal-500/20 border border-green-500/30 px-3 flex items-center" style={{paddingTop: '8px', paddingBottom: '8px', height: '36px'}}>
                  <p className="text-lg font-bold font-mono text-green-500">
                    R$ {(customer.balance / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tipo de Operação */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs">Tipo de Operação</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="h-[42px]">
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

              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={amountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={addBalanceMutation.isPending}
                  className="" style={{height: '36px'}}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Motivo da transação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={addBalanceMutation.isPending}
              />
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

          {/* Histórico de Transações */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Histórico de Transações</h3>
            
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead className="w-[80px]">Tipo</TableHead>
                      <TableHead className="w-[90px]">Valor</TableHead>
                      <TableHead className="w-[90px]">Saldo Após</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => [
                        <TableRow 
                          key={transaction.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedRow(expandedRow === transaction.id ? null : transaction.id)}
                        >
                          <TableCell className="text-xs">
                            {format(new Date(transaction.createdAt), "dd/MM/yy HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">
                            {transaction.type === "credit" && (
                              <span className="text-green-600 flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                Créd.
                              </span>
                            )}
                            {transaction.type === "debit" && (
                              <span className="text-red-600 flex items-center gap-1">
                                <ArrowDown className="h-3 w-3" />
                                Déb.
                              </span>
                            )}
                            {transaction.type === "purchase" && (
                              <span className="text-blue-600 text-xs">Compra</span>
                            )}
                            {transaction.type === "refund" && (
                              <span className="text-orange-600 flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                Reemb.
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
                                Ret.
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`text-xs font-mono ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {transaction.amount >= 0 ? "+" : ""}R$ {transaction.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            R$ {transaction.balanceAfter.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {transaction.description || "-"}
                          </TableCell>
                        </TableRow>,
                        expandedRow === transaction.id && (
                          <TableRow key={`${transaction.id}-expanded`}>
                            <TableCell colSpan={5} className="bg-muted/30 p-4">
                              <div className="text-xs">
                                <span className="font-semibold">Info: </span>
                                <span className="text-muted-foreground">{transaction.description || "Sem descrição"}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                    ].filter(Boolean))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma transação registrada ainda
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
