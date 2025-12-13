import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";
import { CountryDialog } from "@/components/CountryDialog";
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

import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Search, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Countries() {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogCountry, setEditDialogCountry] = useState<any>(null);

  const { data: countries, isLoading } = trpc.countries.getAll.useQuery();

  const toggleActiveMutation = trpc.countries.toggleActive.useMutation({
    onSuccess: (data, variables) => {
      toast.success(data.active ? "País ativado" : "País desativado");
      utils.countries.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });



  const filteredCountries = countries
    ?.filter((country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Países ativos primeiro
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      // Alfabético dentro de cada grupo
      return a.name.localeCompare(b.name);
    });



  if (isLoading) {
    return (
      <DashboardLayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayoutWrapper>
    );
  }

  return (
    <DashboardLayoutWrapper>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Globe className="w-8 h-8 text-blue-500" />
              Países
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie países disponíveis para venda
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar País
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-400 text-sm">Total de Países</span>
              <Globe size={18} className="text-neutral-500" />
            </div>
            <div className="text-3xl font-light text-white mb-1">
              {countries?.length || 0}
            </div>
            <div className="text-xs text-neutral-500">
              Países cadastrados
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-400 text-sm">Países Ativos</span>
              <Globe size={18} className="text-green-500" />
            </div>
            <div className="text-3xl font-light text-green-500 mb-1">
              {countries?.filter((c) => c.active).length || 0}
            </div>
            <div className="text-xs text-neutral-500">
              Disponíveis para venda
            </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-400 text-sm">Países Inativos</span>
              <Globe size={18} className="text-neutral-500" />
            </div>
            <div className="text-3xl font-light text-neutral-500 mb-1">
              {countries?.filter((c) => !c.active).length || 0}
            </div>
            <div className="text-xs text-neutral-500">
              Não disponíveis
            </div>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Países</CardTitle>
            <CardDescription>
              Ative/desative países disponíveis para venda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCountries && filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell className="text-muted-foreground">{country.code}</TableCell>
                        <TableCell>
                          <Switch
                            checked={country.active}
                            onCheckedChange={() =>
                              toggleActiveMutation.mutate({ id: country.id })
                            }
                            disabled={toggleActiveMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "Nenhum país encontrado" : "Nenhum país cadastrado. Sincronize os dados primeiro."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Add/Edit Country Dialog */}
      <CountryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        country={null}
        onSuccess={() => utils.countries.getAll.invalidate()}
      />
    </DashboardLayoutWrapper>
  );
}
