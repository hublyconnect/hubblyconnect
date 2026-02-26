"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageCircle,
  Clock,
  User,
  Trash2,
  Plus,
  ListTodo,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { createCalendarEventAction, updateCalendarEventAction, deleteCalendarEventAction } from "./actions";
import { useAgencyBySlug, useClients } from "@/hooks/use-clients";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/use-calendar-events";
import {
  buildConfirmationMessage,
  getWhatsAppLink,
  formatForTemplate,
} from "@/lib/whatsapp-templates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function eventStartsOnDay(startsAt: string, day: Date): boolean {
  const s = new Date(startsAt);
  return s.getDate() === day.getDate() && s.getMonth() === day.getMonth() && s.getFullYear() === day.getFullYear();
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MEETING_TYPES = [
  { value: "onboarding", label: "Onboarding", color: "#3B82F6" },
  { value: "daily", label: "Kick-off", color: "#8B5CF6" },
  { value: "recording", label: "Gravação", color: "#EF4444" },
  { value: "review", label: "Acompanhamento", color: "#22C55E" },
] as const;

const DEFAULT_EVENT_COLOR = "#3B82F6";

export default function CalendarioPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  const queryClient = useQueryClient();
  const { data: agency } = useAgencyBySlug(slug);
  const agencyId = agency?.id ?? null;
  const { data: clients = [] } = useClients(agencyId);
  const { data: allEvents = [], isLoading: eventsLoading } = useCalendarEvents(agencyId);
  const [current, setCurrent] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("agenda");
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("onboarding");
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_EVENT_COLOR);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const openSheet = (day: Date) => {
    setSelected(day);
    setSheetOpen(true);
    setActiveTab("agenda");
    setEditingEvent(null);
  };

  const { days, startOffset } = useMemo(() => {
    const y = current.getFullYear();
    const m = current.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startOffset = first.getDay();
    const total = last.getDate();
    const days = Array.from({ length: total }, (_, i) => new Date(y, m, i + 1));
    return { days, startOffset };
  }, [current]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of days) {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, allEvents.filter((e) => eventStartsOnDay(e.starts_at, d)));
    }
    return map;
  }, [days, allEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selected) return [];
    const key = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`;
    return (eventsByDay.get(key) ?? []).slice().sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [selected, eventsByDay]);

  const prevMonth = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const handleSubmitEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slug) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("event_type", selectedType);
    formData.set("event_color", selectedColor);
    if (!formData.get("starts_at")) {
      const d = selected ?? new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      formData.set("starts_at", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`);
    }
    if (editingEvent) {
      startTransition(async () => {
        const result = await updateCalendarEventAction(slug, editingEvent.id, formData);
        if (result.ok) {
          toast.success("Evento atualizado.");
          form.reset();
          setEditingEvent(null);
          setSelectedType("onboarding");
          setSelectedColor(DEFAULT_EVENT_COLOR);
          queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
          setActiveTab("agenda");
        } else toast.error(result.error);
      });
    } else {
      startTransition(async () => {
        const result = await createCalendarEventAction(slug, formData);
        if (result.ok) {
          toast.success("Evento adicionado.");
          form.reset();
          setSelectedType("onboarding");
          setSelectedColor(DEFAULT_EVENT_COLOR);
          queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
          setActiveTab("agenda");
        } else toast.error(result.error);
      });
    }
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setSelectedType("onboarding");
    setSelectedColor(DEFAULT_EVENT_COLOR);
    setActiveTab("agenda");
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!slug) return;
    setDeletingId(eventId);
    deleteCalendarEventAction(slug, eventId).then((r) => {
      setDeletingId(null);
      if (r.ok) {
        toast.success("Evento excluído.");
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      } else toast.error(r.error);
    });
  };

  const defaultStartsAt = useMemo(() => {
    const d = selected ?? new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
  }, [selected]);

  const sheetTitle = selected
    ? selected.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda Global</h1>
        <p className="text-muted-foreground">
          Clique em um dia para abrir a agenda e criar ou excluir eventos.
        </p>
      </div>

      <Card className="rounded-2xl bg-card shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="size-5" />
              {MONTHS[current.getMonth()]} {current.getFullYear()}
            </CardTitle>
            <CardDescription>Clique em um dia para ver a agenda</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="rounded-lg" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setCurrent(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="rounded-lg" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((w) => (
                <div key={w} className="border-r border-border/50 py-2 last:border-r-0">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startOffset }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[76px] border-b border-r border-border/50 p-1 last:border-r-0" />
              ))}
              {days.map((d) => {
                const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                const dayEvents = eventsByDay.get(dayKey) ?? [];
                const hasEvents = dayEvents.length > 0;
                const isSelected =
                  selected &&
                  `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}` === dayKey;
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => openSheet(d)}
                    className={cn(
                      "min-h-[76px] border-b border-r border-border/50 p-1 text-left text-sm last:border-r-0 flex flex-col transition-colors",
                      "hover:bg-primary/5",
                      isToday(d) && "bg-primary/10 font-medium text-primary",
                      isSelected && "ring-2 ring-primary/50 ring-inset bg-primary/5"
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {hasEvents && (
                      <div className="mt-1 flex flex-wrap gap-0.5 items-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-block h-2 w-2 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-sm"
                            style={{ backgroundColor: ev.event_color || DEFAULT_EVENT_COLOR }}
                            title={ev.title}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
            <SheetTitle className="text-left capitalize">{sheetTitle}</SheetTitle>
            <SheetDescription className="text-left">
              Agenda e novo evento para este dia
            </SheetDescription>
          </SheetHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 w-fit grid grid-cols-2">
              <TabsTrigger value="agenda" className="gap-1.5">
                <ListTodo className="size-4" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5">
                <Plus className="size-4" />
                {editingEvent ? "Editar Evento" : "Novo"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="agenda" className="flex-1 overflow-auto mt-0 px-4 pb-4 data-[state=inactive]:hidden">
              {eventsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
              ) : selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 py-10 text-center text-muted-foreground">
                  <CalendarIcon className="size-10 mb-3 opacity-50" />
                  <p className="text-sm">Nenhum evento neste dia.</p>
                  <p className="mt-1 text-xs">Use a aba &quot;Novo&quot; para agendar.</p>
                </div>
              ) : (
                <ul className="space-y-2 pt-2">
                  {selectedDayEvents.map((e) => {
                    const client = e.client_id ? clients.find((c) => c.id === e.client_id) : null;
                    const { date, time } = formatForTemplate(new Date(e.starts_at));
                    const meetingLabel = MEETING_TYPES.find((t) => t.value === e.event_type)?.label ?? e.event_type;
                    const msg = buildConfirmationMessage(client?.name ?? "Cliente", meetingLabel, date, time);
                    const whatsappUrl = client?.whatsapp ? getWhatsAppLink(client.whatsapp, msg) : null;
                    const color = e.event_color || DEFAULT_EVENT_COLOR;
                    return (
                      <li
                        key={e.id}
                        className="rounded-lg border border-border/50 bg-muted/30 p-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="size-9 shrink-0 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                          >
                            <Clock className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">
                                {new Date(e.starts_at).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {e.duration_minutes && ` · ${e.duration_minutes} min`}
                              </span>
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: color }}
                              >
                                {MEETING_TYPES.find((t) => t.value === e.event_type)?.label ?? e.event_type}
                              </span>
                            </div>
                            {client && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                <User className="size-3.5 shrink-0" />
                                <span>{client.name}</span>
                              </div>
                            )}
                            <p className="font-medium text-foreground truncate mt-0.5">{e.title}</p>
                            {e.meeting_url && (
                              <a
                                href={e.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                              >
                                <ExternalLink className="size-3" />
                                Link da reunião
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Editar evento"
                              onClick={() => {
                                setEditingEvent(e);
                                setSelectedType(e.event_type || "onboarding");
                                setSelectedColor(e.event_color || DEFAULT_EVENT_COLOR);
                                setActiveTab("new");
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-400"
                              title="Notificar via WhatsApp"
                              disabled={!whatsappUrl}
                              onClick={() => whatsappUrl && window.open(whatsappUrl, "_blank")}
                            >
                              <MessageCircle className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Excluir evento"
                              disabled={!!deletingId}
                              onClick={() => handleDeleteEvent(e.id)}
                            >
                              {deletingId === e.id ? (
                                <span className="text-xs">…</span>
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="new" className="flex-1 overflow-auto mt-0 px-4 pb-4 data-[state=inactive]:hidden">
              <div className="pt-2">
                <form
                  key={editingEvent?.id ?? "new"}
                  onSubmit={handleSubmitEvent}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="ev-title">Título</Label>
                    <Input
                      id="ev-title"
                      name="title"
                      placeholder="Ex.: Reunião de alinhamento"
                      required
                      disabled={pending}
                      className="rounded-lg bg-background"
                      defaultValue={editingEvent?.title ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-client">Cliente (opcional)</Label>
                    <select
                      id="ev-client"
                      name="client_id"
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      defaultValue={editingEvent?.client_id ?? ""}
                    >
                      <option value="">Nenhum</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de reunião</Label>
                    <div className="flex flex-wrap gap-2">
                      {MEETING_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setSelectedType(t.value);
                            setSelectedColor(t.color);
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                            selectedType === t.value
                              ? "text-white ring-2 ring-offset-2"
                              : "bg-muted/80 text-muted-foreground hover:bg-muted"
                          )}
                          style={
                            selectedType === t.value
                              ? { backgroundColor: t.color, ["--tw-ring-color" as string]: t.color }
                              : undefined
                          }
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ev-datetime">Data e hora</Label>
                      <Input
                        id="ev-datetime"
                        name="starts_at"
                        type="datetime-local"
                        required
                        disabled={pending}
                        defaultValue={
                          editingEvent
                            ? new Date(editingEvent.starts_at).toISOString().slice(0, 16)
                            : defaultStartsAt
                        }
                        className="rounded-lg bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ev-duration">Duração (min)</Label>
                      <Input
                        id="ev-duration"
                        name="duration_minutes"
                        type="number"
                        min={15}
                        step={15}
                        defaultValue={editingEvent?.duration_minutes ?? 60}
                        disabled={pending}
                        className="rounded-lg bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-meeting">Link da reunião (opcional)</Label>
                    <Input
                      id="ev-meeting"
                      name="meeting_url"
                      type="url"
                      placeholder="https://meet.google.com/..."
                      disabled={pending}
                      className="rounded-lg bg-background"
                      defaultValue={editingEvent?.meeting_url ?? ""}
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingEvent && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        className="rounded-lg flex-1"
                        onClick={cancelEdit}
                      >
                        Cancelar Edição
                      </Button>
                    )}
                    <Button type="submit" disabled={pending} className="rounded-lg flex-1">
                      {pending
                        ? "Salvando…"
                        : editingEvent
                          ? "Salvar Alterações"
                          : "Criar evento"}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
