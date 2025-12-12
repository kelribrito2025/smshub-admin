import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, Edit, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MenuItem {
  id: number;
  label: string;
  path: string;
  icon: string | null;
  position: number;
  active: boolean;
}

interface MenuManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuManagementDialog({
  open,
  onOpenChange,
}: MenuManagementDialogProps) {
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    path: "",
    icon: "",
  });

  const { data: menus, isLoading } = trpc.adminMenus.getAll.useQuery(
    undefined,
    {
      enabled: open,
    }
  );

  const createMutation = trpc.adminMenus.create.useMutation({
    onSuccess: () => {
      toast.success("Menu criado com sucesso!");
      utils.adminMenus.getAll.invalidate();
      setShowAddForm(false);
      setFormData({ label: "", path: "", icon: "" });
    },
    onError: (error) => {
      toast.error(`Erro ao criar menu: ${error.message}`);
    },
  });

  const updateMutation = trpc.adminMenus.update.useMutation({
    onSuccess: () => {
      toast.success("Menu atualizado com sucesso!");
      utils.adminMenus.getAll.invalidate();
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar menu: ${error.message}`);
    },
  });

  const deleteMutation = trpc.adminMenus.delete.useMutation({
    onSuccess: () => {
      toast.success("Menu eliminado com sucesso!");
      utils.adminMenus.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar menu: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.label || !formData.path) {
      toast.error("Label e Path são obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (id: number, data: Partial<MenuItem>) => {
    const cleanData: any = { id };
    if (data.label !== undefined) cleanData.label = data.label;
    if (data.path !== undefined) cleanData.path = data.path;
    if (data.icon !== undefined) cleanData.icon = data.icon || undefined;
    if (data.active !== undefined) cleanData.active = data.active;
    updateMutation.mutate(cleanData);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar este menu?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestão de Menus</DialogTitle>
          <DialogDescription>
            Adicione, edite ou elimine itens do menu de navegação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Add Form */}
          {showAddForm ? (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-4">Adicionar Novo Menu</h3>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="Ex: Dashboard"
                  />
                </div>
                <div>
                  <Label htmlFor="path">Path *</Label>
                  <Input
                    id="path"
                    value={formData.path}
                    onChange={(e) =>
                      setFormData({ ...formData, path: e.target.value })
                    }
                    placeholder="Ex: /dashboard"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Ícone (opcional)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="Ex: LayoutDashboard"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Menu"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ label: "", path: "", icon: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              className="mb-4"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Menu
            </Button>
          )}

          {/* Menus Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : !menus || menus.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhum menu encontrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell>{menu.position}</TableCell>
                    <TableCell>
                      {editingId === menu.id ? (
                        <Input
                          defaultValue={menu.label}
                          onBlur={(e) =>
                            handleUpdate(menu.id, { label: e.target.value })
                          }
                          className="max-w-[200px]"
                        />
                      ) : (
                        menu.label
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === menu.id ? (
                        <Input
                          defaultValue={menu.path}
                          onBlur={(e) =>
                            handleUpdate(menu.id, { path: e.target.value })
                          }
                          className="max-w-[200px]"
                        />
                      ) : (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {menu.path}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === menu.id ? (
                        <Input
                          defaultValue={menu.icon || ""}
                          onBlur={(e) =>
                            handleUpdate(menu.id, { icon: e.target.value })
                          }
                          className="max-w-[150px]"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {menu.icon || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditingId(
                              editingId === menu.id ? null : menu.id
                            )
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(menu.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
