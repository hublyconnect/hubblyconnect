"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useRole } from "@/hooks/use-profile";
import { ClientSelector } from "@/components/client-selector";
import { cn } from "@/lib/utils";

export function DashboardHeader({ agencySlug }: { agencySlug: string }) {
  const pathname = usePathname();
  const { isAdmin, isLoading } = useRole();
  const isCalendario = pathname?.includes("/calendario");

  if (isLoading) {
    return (
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#3B82F6] px-4">
        <SidebarTrigger className="-ml-1 text-white hover:bg-white/10" />
        <Separator orientation="vertical" className="mr-2 h-6 bg-white/20" />
        <span className="text-sm text-white/80">Carregando…</span>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b px-4",
        "bg-gradient-to-r from-[#3B82F6] via-[#3B82F6] to-[#2563EB]",
        "border-white/20"
      )}
    >
      <SidebarTrigger className="-ml-1 text-white hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10" />
      <Separator orientation="vertical" className="mr-2 h-6 bg-white/20" />
      {isAdmin ? (
        <>
          {isCalendario ? (
            <span className="text-sm font-semibold text-white">Agenda Global</span>
          ) : (
            <>
              <span className="text-sm font-semibold text-white">
                Painel Administrativo — Agência B9
              </span>
              <div className="ml-auto">
                <ClientSelector agencySlug={agencySlug} />
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold text-white">
            B9
          </div>
          <span className="text-sm font-semibold text-white/95">
            Bem-vindo ao seu portal
          </span>
        </div>
      )}
    </header>
  );
}
