"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  DollarSign,
  MessageCircle,
  MousePointer,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import {
  getFacebookAdsReportAction,
  type DateRangePreset,
  type FacebookAdsReport,
} from "./actions";

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
];

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Parse YYYY-MM-DD without timezone shift (API returns dates in account timezone) */
function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Format date range from API (YYYY-MM-DD) without timezone shift */
function formatDateRange(start: string, end: string): string {
  if (!start || !end) return "";
  const fmt = (s: string) => {
    const parts = s.split("-");
    const [y, m, d] = [parts[0], parts[1], parts[2]];
    if (!y || !m || !d) return s;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  };
  return `${fmt(start)} a ${fmt(end)}`;
}

export default function RelatoriosPage({
  params,
}: {
  params: Promise<{ client_slug: string }>;
}) {
  const [clientSlug, setClientSlug] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangePreset>("7d");
  const [data, setData] = useState<FacebookAdsReport | null>(null);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setClientSlug(p.client_slug));
  }, [params]);

  useEffect(() => {
    if (!clientSlug) return;
    setLoading(true);
    setError(null);
    setData(null);
    getFacebookAdsReportAction(clientSlug, dateRange)
      .then((result) => {
        if (result.ok) {
          setData(result.data);
          setError(null);
        } else {
          setData(null);
          setError({ type: result.error, message: result.message });
        }
      })
      .catch((err) => {
        setData(null);
        setError({
          type: "unknown",
          message: err instanceof Error ? err.message : "Erro ao carregar dados.",
        });
      })
      .finally(() => setLoading(false));
  }, [clientSlug, dateRange]);

  const chartData =
    data?.trend.map((t) => ({
      ...t,
      dateLabel: formatDateShort(t.date),
    })) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-zinc-100">
              <Link href={clientSlug ? `/portal/${clientSlug}` : "#"}>
                <ArrowLeft className="size-5" />
                <span className="sr-only">Voltar ao portal</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">
                Desempenho de Campanhas
              </h1>
              <p className="text-sm text-zinc-500">
                {data?.dateRange?.start && data?.dateRange?.end
                  ? `Métricas de ${formatDateRange(data.dateRange.start, data.dateRange.end)}`
                  : "Métricas do Facebook Ads"}
              </p>
            </div>
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
            <SelectTrigger className="w-[180px] border-zinc-700 bg-zinc-900/50 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800/50" />
              ))}
            </div>
          ) : error?.type === "not_connected" ? (
            <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-500/10">
                  <BarChart3 className="size-8 text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  Conecte sua conta do Facebook Ads
                </h3>
                <p className="mb-6 max-w-sm text-sm text-zinc-500">
                  {error.message} Entre em contato com sua agência para conectar as credenciais e ver os relatórios de desempenho.
                </p>
                <Button variant="outline" asChild className="border-zinc-700">
                  <Link href={clientSlug ? `/portal/${clientSlug}` : "#"}>
                    <ArrowLeft className="mr-2 size-4" />
                    Voltar ao portal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : data ? (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <DollarSign className="size-4" />
                      CPM
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatBRL(data.summary.cpm ?? 0)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Custo por mil impressões
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <DollarSign className="size-4" />
                      Valor Gasto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatBRL(data.summary.spend)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <TrendingUp className="size-4" />
                      Impressões
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatNumber(data.summary.impressions)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <MousePointer className="size-4" />
                      Cliques no Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatNumber(data.summary.linkClicks)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      Custo por Clique (CPC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatBRL(data.summary.cpc)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <MessageCircle className="size-4" />
                      Conversas Iniciadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatNumber(data.summary.whatsappConversations ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      Custo por Conversa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatBRL(data.summary.costPerConversation ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <MousePointerClick className="size-4" />
                      CTR (Taxa de Clique)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatPercent(data.summary.ctr ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                      <Activity className="size-4" />
                      Taxa de Conversão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatPercent(data.summary.conversionRate ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Chart */}
              <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-zinc-100">
                    Cliques e Valor Gasto
                  </CardTitle>
                  <p className="text-sm text-zinc-500">
                    Evolução no período selecionado
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: "#71717a", fontSize: 12 }}
                          axisLine={{ stroke: "#27272a" }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "#71717a", fontSize: 12 }}
                          axisLine={false}
                          tickFormatter={(v) => formatNumber(v)}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "#71717a", fontSize: 12 }}
                          axisLine={false}
                          tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "#a1a1aa" }}
                          formatter={(value, name) => {
                            const num = typeof value === "number" ? value : Number(value) || 0;
                            return [name === "Cliques" ? formatNumber(num) : formatBRL(num), name];
                          }}
                          labelFormatter={(label) => label}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="clicks"
                          name="Cliques"
                          stroke="#f59e0b"
                          fill="url(#clicksGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="spend"
                          name="Valor Gasto"
                          stroke="#3b82f6"
                          fill="url(#spendGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Campanhas Table */}
              <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <CardTitle className="text-zinc-100">Top Campanhas</CardTitle>
                  <p className="text-sm text-zinc-500">
                    Campanhas com melhor desempenho no período
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/80">
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Nome da Campanha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Valor Gasto
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Conversas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                            CTR
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Taxa de Conversão
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {data.campaigns.map((camp) => (
                          <tr
                            key={camp.id}
                            className="bg-zinc-900/30 transition-colors hover:bg-zinc-800/30"
                          >
                            <td className="px-4 py-3 font-medium text-zinc-100">
                              {camp.name}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  camp.status === "active"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-zinc-600/30 text-zinc-400"
                                }`}
                              >
                                {camp.status === "active" ? "Ativo" : "Pausado"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-100">
                              {formatBRL(camp.spend)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-100">
                              {formatNumber(camp.conversations ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-100">
                              {formatPercent(camp.ctr ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-zinc-100">
                              {formatPercent(camp.conversionRate ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="rounded-xl border-zinc-800 bg-zinc-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="mb-3 size-12 text-zinc-500 opacity-50" />
                <p className="text-zinc-500">
                  {error?.message ?? "Não foi possível carregar os dados."}
                </p>
                <Button variant="outline" asChild className="mt-4 border-zinc-700">
                  <Link href={clientSlug ? `/portal/${clientSlug}` : "#"}>
                    Voltar ao portal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
