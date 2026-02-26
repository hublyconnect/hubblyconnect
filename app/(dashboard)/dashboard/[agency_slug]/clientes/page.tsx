"use client";

import React, { useMemo } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can } from "@/components/can";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { useClientProgress } from "@/hooks/use-client-progress";
import { useOnboardingProgressForClients } from "@/hooks/use-onboarding-progress-bulk";
import { useActiveClient } from "@/contexts/active-client-context";
import {
  Loader2,
  UserPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  createClientAction,
  updateClientAction,
  updateClientStatusAction,
  deleteClientAction,
} from "./actions";
import { toast } from "sonner";
import type { Client } from "@/lib/types/database";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.slice(0, 2) || "?").toUpperCase();
}

type StatusFilter = "all" | "onboarding" | "aguardando";

export default function AllClientsPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [open, setOpen] = React.useState(false);
  const [editClient, setEditClient] = React.useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = React.useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setClientId } = useActiveClient();

  React.useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);

  const { data: agency } = useAgencyBySlug(slug);
  const { data: clients = [], isLoading } = useClients(agency?.id ?? null);
  const { data: progressMap = {} } = useClientProgress(agency?.id ?? null);
  const clientIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const { data: onboardingProgress = [] } = useOnboardingProgressForClients(slug, clientIds);

  const onboardingMap = useMemo(() => {
    const m = new Map<string, { total: number; completed: number; pct: number }>();
    for (const p of onboardingProgress) {
      m.set(p.client_id, { total: p.total, completed: p.completed, pct: p.pct });
    }
    return m;
  }, [onboardingProgress]);

  const filteredClients = useMemo(() => {
    let list = clients;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.slug?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter === "onboarding") {
      list = list.filter((c) => {
        const ob = onboardingMap.get(c.id);
        return ob && ob.pct < 100;
      });
    } else if (statusFilter === "aguardando") {
      list = list.filter((c) => {
        const prog = progressMap[c.id];
        return prog && prog.revisionRequested > 0;
      });
    }

    return list;
  }, [clients, search, statusFilter, progressMap, onboardingMap]);

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slug) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createClientAction(slug, formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slug || !editClient) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("clientId", editClient.id);
    startTransition(async () => {
      const result = await updateClientAction(slug, editClient.id, formData);
      if (result.ok) {
        toast.success("Cliente atualizado.");
        setEditClient(null);
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else toast.error(result.error);
    });
  };

  const handleStatus = (client: Client, newStatus: "active" | "inactive" | "churned") => {
    if (!slug) return;
    startTransition(async () => {
      const result = await updateClientStatusAction(slug, client.id, newStatus);
      if (result.ok) {
        const msg = { active: "Cliente ativado.", inactive: "Cliente inativado.", churned: "Status atualizado para Desistiu." };
        toast.success(msg[newStatus]);
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else toast.error(result.error);
    });
  };

  const statusLabel: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    onboarding: "Onboarding",
    churned: "Desistiu",
  };

  const handleDelete = () => {
    if (!slug || !deleteClientId) return;
    startTransition(async () => {
      const result = await deleteClientAction(slug, deleteClientId);
      if (result.ok) {
        toast.success("Cliente excluído.");
        setDeleteClientId(null);
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else toast.error(result.error);
    });
  };

  const handleAcessarPainel = (client: Client) => {
    if (!slug) return;
    setClientId(client.id);
    if (client.slug) {
      router.push(`/portal/${client.slug}`);
    } else {
      router.push(`/dashboard/${slug}`);
    }
  };

  return (
    <Can role="admin" fallback={<p className="text-muted-foreground">Acesso negado.</p>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meus Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie todos os clientes da agência
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="size-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
                <DialogDescription>
                  Cadastre um novo cliente. Um usuário de acesso ao portal será criado com o e-mail informado e senha padrão.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cliente</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex.: João Silva"
                    required
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="cliente@exemplo.com"
                    required
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    placeholder="Ex.: 5511999999999"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche-create">Nicho</Label>
                  <Input
                    id="niche-create"
                    name="niche"
                    placeholder="Ex.: Imobiliária, E-commerce"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Link do Instagram</Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    type="url"
                    placeholder="https://instagram.com/conta"
                    disabled={pending}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Cadastrando…
                      </>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="bg-muted">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding Pendente</TabsTrigger>
              <TabsTrigger value="aguardando">Aguardando Agência</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <Skeleton className="size-14 rounded-xl" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-6 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-4 h-2 w-full rounded-full" />
                  <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhum cliente cadastrado nesta agência.</p>
            </CardContent>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhum cliente encontrado com os filtros aplicados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredClients.map((client) => {
              const prog = progressMap[client.id];
              const ob = onboardingMap.get(client.id);
              const obPct = ob?.pct ?? 0;
              const revisionCount = prog?.revisionRequested ?? 0;
              const isReactivation = client.status === "inactive" || client.status === "churned";

              return (
                <Card
                  key={client.id}
                  className={`overflow-hidden rounded-2xl transition-shadow hover:shadow-lg ${isReactivation ? "opacity-75" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                          {client.instagram_avatar_url ? (
                            <img
                              src={client.instagram_avatar_url}
                              alt=""
                              className="size-14 rounded-xl object-cover"
                            />
                          ) : (
                            getInitials(client.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {client.name}
                          </h3>
                          {client.niche && (
                            <p className="text-xs text-muted-foreground truncate">{client.niche}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-lg">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setEditClient(client)}>
                            <Pencil className="size-4" />
                            Editar Cliente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Alterar Status
                          </DropdownMenuLabel>
                          {(["active", "inactive", "churned"] as const).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handleStatus(client, s)}
                              className={client.status === s ? "bg-accent" : ""}
                            >
                              {statusLabel[s]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteClientId(client.id)}
                          >
                            <Trash2 className="size-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Onboarding
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ob ? `${ob.completed}/${ob.total}` : "—"}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${obPct}%` }}
                        />
                      </div>

                      {revisionCount > 0 && (
                        <div className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          {revisionCount} criativo{revisionCount !== 1 ? "s" : ""} aguardando agência
                        </div>
                      )}
                    </div>

                    <Button
                      className="mt-4 w-full"
                      onClick={() => handleAcessarPainel(client)}
                    >
                      <ExternalLink className="size-4" />
                      Acessar Painel
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Editar Cliente */}
        <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>Campos de contato e perfil do cliente.</DialogDescription>
            </DialogHeader>
            {editClient && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editClient.name}
                    required
                    disabled={pending}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact_email">E-mail</Label>
                  <Input
                    id="edit-contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={editClient.contact_email ?? ""}
                    disabled={pending}
                    placeholder="contato@cliente.com"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-niche">Nicho</Label>
                  <Input
                    id="edit-niche"
                    name="niche"
                    defaultValue={editClient.niche ?? ""}
                    disabled={pending}
                    placeholder="Ex.: Imobiliária"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-instagram_url">Link Instagram</Label>
                  <Input
                    id="edit-instagram_url"
                    name="instagram_url"
                    type="url"
                    defaultValue={editClient.instagram_url ?? ""}
                    disabled={pending}
                    placeholder="https://instagram.com/conta"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-whatsapp">WhatsApp / Telefone</Label>
                  <Input
                    id="edit-whatsapp"
                    name="whatsapp"
                    type="tel"
                    defaultValue={editClient.whatsapp ?? ""}
                    disabled={pending}
                    placeholder="5511999999999"
                    className="rounded-lg"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditClient(null)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={pending} className="rounded-lg">
                    {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmar Exclusão */}
        <Dialog open={!!deleteClientId} onOpenChange={(o) => !o && setDeleteClientId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir cliente</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. O cliente e vínculos serão removidos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteClientId(null)} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Can>
  );
}
