"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Can } from "@/components/can";
import { useAgencyBySlug } from "@/hooks/use-clients";
import { UserPlus, Crown, User } from "lucide-react";
import { getTeamMembersAction } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  admin: "Dono",
  member: "Membro",
  viewer: "Visualizador",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  member:
    "Pode subir criativos, responder o chat do cliente e gerenciar o onboarding. Não pode excluir clientes, ver o financeiro ou alterar configurações da agência.",
  viewer:
    "Acesso apenas de leitura. Pode ver as pastas, ler conversas e checar o status do onboarding, mas não pode fazer uploads nem alterar status.",
};

export default function EquipePage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<string>("member");

  React.useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);

  const { data: agency } = useAgencyBySlug(slug);
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["team-members", agency?.id],
    queryFn: async () => {
      if (!slug) return { ok: false as const, error: "Slug ausente" };
      return getTeamMembersAction(slug);
    },
    enabled: !!slug,
  });

  const members = membersData?.ok ? membersData.members : [];

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
  };

  return (
    <Can role="admin" fallback={<p className="text-muted-foreground">Acesso negado.</p>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground">
              Gerencie os membros da equipe da agência
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Convidar Membro
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              Nome, e-mail e função de cada membro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="size-12 mb-3 opacity-50" />
                <p className="text-sm">Nenhum membro na equipe.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        E-mail
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Função
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {m.full_name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {m.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              m.role === "admin"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : m.role === "member"
                                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {m.role === "admin" ? (
                              <Crown className="size-3" />
                            ) : (
                              <User className="size-3" />
                            )}
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Membro</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail. A integração com o banco de dados será feita em breve.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="membro@agencia.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Função</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                    <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                  </SelectContent>
                </Select>
                {ROLE_DESCRIPTIONS[inviteRole] && (
                  <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    {ROLE_DESCRIPTIONS[inviteRole]}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Enviar Convite</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Can>
  );
}
