import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { DollarSign, Edit, Loader2, Plus, Search, Trash2, Users, Wallet, TrendingUp, Bell } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/CustomerDialog";
import { BalanceSidePanel } from "@/components/BalanceSidePanel";
import { SendNotificationModal } from "@/components/SendNotificationModal";
import { format } from "date-fns";

export default function Customers() {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [balanceCustomer, setBalanceCustomer] = useState<any>(null);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  const { data: customers, isLoading } = trpc.customers.getAll.useQuery();
  const { data: stats } = trpc.customers.getStats.useQuery();

  const toggleActiveMutation = trpc.customers.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.active ? "Cliente ativado" : "Cliente desativado");
      utils.customers.getAll.invalidate();
      utils.customers.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso!");
      utils.customers.getAll.invalidate();
      utils.customers.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toString().includes(searchTerm) ||
      customer.pin?.toString().includes(searchTerm)
  );

  // Pagination calculations
  const totalItems = filteredCustomers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = filteredCustomers?.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDelete = (customer: any) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${customer.name}?`)) {
      deleteCustomerMutation.mutate({ id: customer.id });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" />
              Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os clientes do painel de vendas
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm font-medium flex items-center gap-2 cursor-help">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Clientes Ativos (30d)
                    </CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clientes que realizaram pelo menos uma compra nos últimos 30 dias</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats?.activeCustomersLast30Days || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats?.totalBalance || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Saldo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats?.averageBalance || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  Gerencie cadastros, saldos e status dos clientes
                </CardDescription>
              </div>
              <Button
                onClick={() => setNotificationModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <Bell className="mr-2 h-4 w-4" />
                Enviar Notificação
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por PIN, ID, nome ou email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PIN</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers && paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id}
                        className={customer.banned ? "border-2 border-red-500/50 animate-pulse" : ""}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono font-bold">
                            #{customer.pin}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{customer.id}</TableCell>
                        <TableCell className="font-semibold">{customer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                        <TableCell>
                          <span className="font-mono">
                            R$ {(customer.balance / 100).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={customer.active}
                            onCheckedChange={() =>
                              toggleActiveMutation.mutate({ id: customer.id })
                            }
                            disabled={toggleActiveMutation.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(customer.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBalanceCustomer(customer)}
                              title="Gerenciar saldo"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditCustomer(customer)}
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer)}
                              title="Excluir cliente"
                              disabled={deleteCustomerMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm
                          ? "Nenhum cliente encontrado"
                          : "Nenhum cliente cadastrado ainda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-black/50 border border-border rounded-lg">
            <div className="text-sm text-gray-400">
              Página {currentPage} de {totalPages} • Total: {totalItems} clientes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-gray-400">Página</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 text-center bg-black/30 border-border text-white"
                />
                <span className="text-sm text-gray-400">de {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      <CustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        customer={null}
        onSuccess={() => {
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Edit Customer Dialog */}
      <CustomerDialog
        open={!!editCustomer}
        onOpenChange={(open: boolean) => !open && setEditCustomer(null)}
        customer={editCustomer}
        onSuccess={() => {
          setEditCustomer(null);
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Balance Dialog */}
      <BalanceSidePanel
        open={!!balanceCustomer}
        onOpenChange={(open: boolean) => !open && setBalanceCustomer(null)}
        customer={balanceCustomer}
        onSuccess={() => {
          setBalanceCustomer(null);
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Send Notification Modal */}
      <SendNotificationModal
        open={notificationModalOpen}
        onOpenChange={setNotificationModalOpen}
      />
    </DashboardLayout>
  );
}
