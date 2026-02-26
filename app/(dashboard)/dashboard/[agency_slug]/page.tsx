"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  MousePointerClick,
  Target,
  TrendingUp,
  Users,
  ImageIcon,
  Percent,
  BarChart3,
  Zap,
  UserPlus,
} from "lucide-react";
import { useClientMetrics } from "@/hooks/use-client-metrics";
import { useActiveClient } from "@/contexts/active-client-context";
import { useRole } from "@/hooks/use-profile";
import { useAgencyBySlug } from "@/hooks/use-clients";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

export default function AgencyDashboardPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = React.useState<string | null>(null);
  React.useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  const { data: agency } = useAgencyBySlug(slug);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(agency?.id ?? null);

  const { clientId, setClientId } = useActiveClient();
  const { profile, isAdmin } = useRole();
  const effectiveClientId = isAdmin ? clientId : profile?.client_id ?? null;
  React.useEffect(() => {
    if (!isAdmin && profile?.client_id) setClientId(profile.client_id);
  }, [isAdmin, profile?.client_id, setClientId]);
  const { data: metrics, isLoading: metricsLoading } = useClientMetrics(effectiveClientId, 30);

  const summary = metrics
    ? {
        ctr: metrics.ctr != null ? `${(metrics.ctr * 100).toFixed(2)}%` : "—",
        cpc: metrics.cpc != null ? `R$ ${metrics.cpc.toFixed(2)}` : "—",
        leads: metrics.leads.toLocaleString("pt-BR"),
        spend: `R$ ${metrics.spend.toLocaleString("pt-BR")}`,
      }
    : null;

  const commandCards = [
    {
      title: "Total de Clientes",
      value: stats?.totalClients ?? 0,
      description: "Clientes ativos na agência",
      icon: Users,
    },
    {
      title: "Criativos Pendentes",
      value: stats?.pendingCreatives ?? 0,
      description: "Ajuste solicitado (agência precisa enviar nova versão)",
      icon: ImageIcon,
    },
    {
      title: "Taxa de Aprovação",
      value: stats?.approvalRate != null ? `${stats.approvalRate}%` : "—",
      description: "Criativos aprovados no total",
      icon: Percent,
    },
  ];

  const kpiCards = [
    { title: "CTR", value: summary?.ctr ?? "—", description: "Últimos 30 dias", icon: TrendingUp },
    { title: "CPC", value: summary?.cpc ?? "—", description: "Custo por clique", icon: MousePointerClick },
    { title: "Leads", value: summary?.leads ?? "0", description: "Total no período", icon: Target },
    { title: "Gasto Total", value: summary?.spend ?? "R$ 0", description: "Últimos 30 dias", icon: DollarSign },
  ];

  const metricCards = [
    { title: "ROI", value: "—", description: "Integração UTMFY em breve", icon: BarChart3 },
    { title: "ROAS", value: "—", description: "Integração UTMFY em breve", icon: Zap },
    { title: "Custo por Lead", value: "—", description: "Integração UTMFY em breve", icon: UserPlus },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">
          Centro de comando · Métricas em tempo real
        </p>
      </div>

      {/* Command Center: resumo geral */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {commandCards.map((c) => (
          <Card key={c.title} className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas avançadas (preparado para integração UTMFY) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {metricCards.map((c) => (
          <Card key={c.title} className="rounded-2xl border-dashed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{c.value}</div>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!effectiveClientId ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">
              {isAdmin
                ? "Selecione um cliente no cabeçalho para ver as métricas."
                : "Nenhum projeto atribuído ao seu usuário. Entre em contato com a agência."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((m) => (
              <Card key={m.title} className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
                  <m.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{m.value}</div>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Desempenho (últimos 30 dias)</CardTitle>
              <CardDescription>
                Cliques, gasto e leads por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] min-h-[320px] w-full">
                {metricsLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : metrics?.series && metrics.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                    <LineChart
                      data={metrics.series.map((s) => ({
                        ...s,
                        dia: new Date(s.date).toLocaleDateString("pt-BR", { weekday: "short" }),
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dia" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="clicks" name="Cliques" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="spend" name="Gasto (R$)" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum dado de métricas no período.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
