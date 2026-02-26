"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/file-upload";
import { useRole } from "@/hooks/use-profile";
import { useOnboardingChecklist } from "@/hooks/use-onboarding-checklist";
import { useOnboardingProgressForClients } from "@/hooks/use-onboarding-progress-bulk";
import { useActiveClient } from "@/contexts/active-client-context";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { ensureOnboardingItemsAction, addOnboardingItemAction, deleteOnboardingItemAction } from "./actions";
import { createOnboardingCalendarEventAction } from "@/app/(dashboard)/dashboard/[agency_slug]/calendario/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CheckCircle2, Plus, Trash2, Loader2, Search, CalendarClock } from "lucide-react";
import { toast } from "sonner";

const SCHEDULE_KEYWORDS = /Reunião|Kick-off|Call/i;

const ONBOARDING_TEMPLATES = [
  "Acesso ao Meta Business Suite",
  "Configuração de Pixel",
  "Envio de Logotipo em Vetor",
  "Reunião de Kick-off",
  "Preenchimento de Briefing",
  "Acesso ao Google Analytics",
  "Enviar logo e identidade visual",
  "Assinar contrato e enviar comprovante",
  "Criação de conta no Google Ads",
  "Configuração de tag manager",
  "Acesso às redes sociais (login/senha)",
  "Envio de materiais de marca (manual, cores)",
  "Definição de KPIs e metas",
  "Alinhamento de calendário editorial",
  "Configuração de e-mail profissional",
  "Entrega de relatório de benchmark",
  "Cadastro no CRM da agência",
  "Aprovação do plano de mídia",
  "Envio de lista de concorrentes",
  "Reunião de apresentação da equipe",
];

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = React.useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [scheduleModal, setScheduleModal] = useState<{ taskTitle: string } | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useRole();
  const { clientId: activeClientId, setClientId } = useActiveClient();
  const { data: agency } = useAgencyBySlug(slug);
  const { data: clients = [] } = useClients(agency?.id ?? null);
  const clientId = isAdmin ? activeClientId : profile?.client_id ?? null;
  const clientName = clients.find((c) => c.id === clientId)?.name ?? null;
  const { data: items = [], isLoading, isError, error, toggle } = useOnboardingChecklist(slug, clientId);
  const clientIds = clients.map((c) => c.id);
  const { data: progressList = [], isLoading: progressLoading } =
    useOnboardingProgressForClients(slug, isAdmin ? clientIds : []);

  const invalidateOnboarding = () => {
    if (clientId) queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", clientId] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress-bulk"] });
  };

  const addItem = useMutation({
    mutationFn: async (label: string) => {
      if (!slug || !clientId) throw new Error("Cliente não selecionado.");
      const r = await addOnboardingItemAction(slug, clientId, label);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      invalidateOnboarding();
      setNewItemLabel("");
      setShowAddInput(false);
      toast.success("Item adicionado.");
    },
    onError: (e) => toast.error(e.message),
  });

  const existingLabelsLower = new Set(items.map((i) => i.title.trim().toLowerCase()));
  const wantsSchedule = (title: string) => SCHEDULE_KEYWORDS.test(title.trim());

  const addFromTemplate = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (existingLabelsLower.has(trimmed.toLowerCase())) {
      toast.error("Este item já está no checklist.");
      return;
    }
    if (!clientId) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }
    if (wantsSchedule(trimmed)) {
      setScheduleDateTime("");
      setScheduleModal({ taskTitle: trimmed });
      return;
    }
    addItem.mutate(trimmed);
  };

  const handleScheduleOnlyAdd = () => {
    if (!scheduleModal) return;
    addItem.mutate(scheduleModal.taskTitle);
    setScheduleModal(null);
  };

  const handleScheduleAndAdd = async () => {
    if (!scheduleModal || !slug || !clientId || !clientName) return;
    if (!scheduleDateTime.trim()) {
      toast.error("Escolha data e hora para agendar.");
      return;
    }
    setScheduling(true);
    try {
      await addItem.mutateAsync(scheduleModal.taskTitle);
      const r = await createOnboardingCalendarEventAction(
        slug,
        clientId,
        clientName,
        scheduleModal.taskTitle,
        new Date(scheduleDateTime).toISOString()
      );
      if (r.ok) {
        toast.success("Item e evento adicionados ao calendário.");
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      } else toast.error(r.error);
      setScheduleModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar.");
    } finally {
      setScheduling(false);
    }
  };

  const templateSearchLower = templateSearch.trim().toLowerCase();
  const filteredTemplates =
    templateSearchLower === ""
      ? ONBOARDING_TEMPLATES
      : ONBOARDING_TEMPLATES.filter((t) =>
          t.toLowerCase().includes(templateSearchLower)
        );

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!slug) throw new Error("Agency slug não disponível.");
      const r = await deleteOnboardingItemAction(slug, itemId);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      invalidateOnboarding();
      toast.success("Item removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (isAdmin && clients.length > 0 && !activeClientId) setClientId(clients[0].id);
  }, [isAdmin, clients, activeClientId, setClientId]);

  useEffect(() => {
    if (!slug || !clientId) return;
    ensureOnboardingItemsAction(slug, clientId).catch(() => {});
  }, [slug, clientId]);

  useEffect(() => {
    setShowAddInput(false);
    setNewItemLabel("");
  }, [clientId]);

  // Progresso derivado do array de itens retornado pela query (garante 0/3 ou valor correto)
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  const clientSearchLower = clientSearch.trim().toLowerCase();
  const filteredClients =
    clientSearchLower === ""
      ? clients
      : clients.filter((c) => c.name.toLowerCase().includes(clientSearchLower));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gerenciador de Onboarding de Clientes</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Acompanhe o progresso de onboarding de cada cliente cadastrado."
            : "Acompanhe os passos do seu onboarding."}
        </p>
      </div>

      {isAdmin && clients.length > 0 && (
        <Card className="sticky top-4 z-10 rounded-2xl border-slate-200/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Progresso por cliente</CardTitle>
            <CardDescription>
              Clique em um cliente para ver e gerenciar o checklist dele. A seleção é sincronizada com o seletor do cabeçalho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome do cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar cliente"
              />
            </div>
            {progressLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum cliente encontrado para &quot;{clientSearch.trim()}&quot;.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((c) => {
                  const prog = progressList.find((p) => p.client_id === c.id);
                  const pct = prog?.pct ?? 0;
                  const isComplete = prog && prog.total > 0 && prog.completed === prog.total;
                  const isSelected = activeClientId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClientId(c.id)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:bg-muted/50",
                        isSelected &&
                          "ring-2 ring-primary border-primary bg-primary/10 shadow-sm",
                        !isSelected && "border-slate-200/80",
                        isComplete && !isSelected && "border-primary/20 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.name}</span>
                        {isComplete && (
                          <CheckCircle2 className="size-5 shrink-0 text-primary" />
                        )}
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {prog ? `${prog.completed}/${prog.total} itens` : "0 itens"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Materiais do projeto</CardTitle>
            <CardDescription>
              Espaço para materiais do projeto disponíveis para a agência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload bucket="portal-files" folder="onboarding" />
          </CardContent>
        </Card>
      )}

      <div className={cn("grid gap-6", isAdmin && "lg:grid-cols-2")}>
        <Card className={cn("rounded-2xl", allDone && "border-primary/30 bg-primary/5")}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {isAdmin && clientName ? `Progresso: ${clientName}` : "Checklist"}
              </CardTitle>
              {allDone && (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Onboarding Concluído
                </span>
              )}
            </div>
            <CardDescription>
              {isAdmin
                ? "Itens necessários para este cliente. Marque conforme for concluindo."
                : "Marque os itens conforme for concluindo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progresso</span>
                <span>{completed}/{total} itens</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {!clientId ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Selecione um cliente acima." : "Nenhum cliente vinculado ao seu perfil."}
              </p>
            ) : isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive font-medium">Não foi possível carregar o checklist.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Erro de conexão."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.location.href = "/login"}
                >
                  Fazer login novamente
                </Button>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                      item.completed && "border-primary/20 bg-primary/5"
                    )}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() =>
                          toggle.mutate({ itemId: item.id, completed: !item.completed })
                        }
                        disabled={toggle.isPending}
                        className="size-4 rounded border-input accent-primary"
                      />
                      <span className={item.completed ? "text-muted-foreground line-through" : ""}>
                        {idx + 1}. {item.title}
                      </span>
                    </label>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        aria-label="Excluir item"
                      >
                        {removingItemId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <div className="pt-1">
                    {showAddInput ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Título da tarefa"
                          value={newItemLabel}
                          onChange={(e) => setNewItemLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = newItemLabel.trim();
                              if (v) addItem.mutate(v);
                            }
                            if (e.key === "Escape") setShowAddInput(false);
                          }}
                          className="flex-1"
                          autoFocus
                          disabled={addItem.isPending}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const v = newItemLabel.trim();
                            if (v) addFromTemplate(v);
                          }}
                          disabled={!newItemLabel.trim() || addItem.isPending}
                        >
                          {addItem.isPending ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setShowAddInput(false); setNewItemLabel(""); }}
                          disabled={addItem.isPending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowAddInput(true)}
                      >
                        <Plus className="size-4" />
                        Adicionar Item
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Sugestões de Tarefas</CardTitle>
              <CardDescription>
                Clique em uma tarefa para adicioná-la ao checklist do cliente selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar sugestões..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Buscar sugestões de tarefas"
                />
              </div>
              {!clientId ? (
                <p className="text-sm text-muted-foreground">
                  Selecione um cliente acima para adicionar tarefas.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma sugestão para &quot;{templateSearch.trim()}&quot;.
                    </p>
                  ) : (
                    filteredTemplates.map((template) => {
                      const alreadyAdded = existingLabelsLower.has(template.trim().toLowerCase());
                      return (
                        <button
                          key={template}
                          type="button"
                          onClick={() => addFromTemplate(template)}
                          disabled={alreadyAdded || addItem.isPending}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                            "border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50/80",
                            !alreadyAdded && "hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {alreadyAdded ? `${template} ✓` : template}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!scheduleModal} onOpenChange={(open) => !open && setScheduleModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              Agendar no calendário
            </DialogTitle>
            <DialogDescription>
              Esta tarefa parece ser uma reunião ou call. Opcionalmente, defina data e hora para criar um evento no calendário.
            </DialogDescription>
          </DialogHeader>
          {scheduleModal && (
            <>
              <p className="text-sm font-medium text-slate-700">{scheduleModal.taskTitle}</p>
              <div className="space-y-2">
                <Label htmlFor="schedule-datetime">Data e hora (opcional)</Label>
                <Input
                  id="schedule-datetime"
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  disabled={scheduling}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleScheduleOnlyAdd} disabled={scheduling || addItem.isPending}>
                  Só adicionar
                </Button>
                <Button
                  type="button"
                  onClick={handleScheduleAndAdd}
                  disabled={scheduling || addItem.isPending || !scheduleDateTime.trim()}
                >
                  {scheduling ? <Loader2 className="size-4 animate-spin" /> : null}
                  Adicionar e agendar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
