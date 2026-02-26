"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileUp,
  Calendar,
  FolderOpen,
  CheckSquare,
  Users,
  UserCog,
  Settings,
  Home,
  ImageIcon,
  CalendarClock,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useRole } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function adminNavItems(agencySlug: string, userRole: string | null) {
  const base = `/dashboard/${agencySlug}`;
  const isDono = userRole === "admin";

  const operationalItems = [
    { href: base, label: "Painel", icon: LayoutDashboard },
    { href: `${base}/clientes`, label: "Meus Clientes", icon: Users },
    { href: `${base}/crm`, label: "WhatsApp CRM", icon: MessageSquare },
    { href: `${base}/revisao`, label: "Aprovação de Criativos", icon: CheckSquare },
    { href: `${base}/agendamento-posts`, label: "Agendamento de Posts", icon: CalendarClock },
    { href: `${base}/onboarding`, label: "Onboarding", icon: FileUp },
    { href: `${base}/calendario`, label: "Calendário", icon: Calendar },
    { href: `${base}/arquivos`, label: "Arquivos", icon: FolderOpen },
  ];

  const restrictedItems = [
    { href: `${base}/equipe`, label: "Equipe", icon: UserCog },
    { href: `${base}/configuracoes`, label: "Configurações da Agência", icon: Settings },
    // { href: `${base}/financeiro`, label: "Financeiro", icon: DollarSign }, // futuro
  ];

  return [...operationalItems, ...(isDono ? restrictedItems : [])];
}

function clientNavItems(agencySlug: string) {
  const base = `/dashboard/${agencySlug}`;
  return [
    { href: base, label: "Início", icon: Home },
    { href: `${base}/meu-projeto`, label: "Meus Criativos", icon: ImageIcon },
    { href: `${base}/configuracoes`, label: "Configurações", icon: Settings },
  ];
}

export function DashboardSidebar({ agencySlug }: { agencySlug: string }) {
  const pathname = usePathname();
  const { profile, isAdmin, isLoading } = useRole();
  const userRole = profile?.role ?? null;
  const items = isAdmin ? adminNavItems(agencySlug, userRole) : clientNavItems(agencySlug);
  const base = `/dashboard/${agencySlug}`;

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <Skeleton className="h-5 w-32" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
            <div className="space-y-1 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      variant="glass"
      className={cn(
        isAdmin &&
          "border-l-4 border-l-primary/30"
      )}
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        {isAdmin ? (
          <span className="font-semibold text-sidebar-foreground">
            Portal Agência
          </span>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                B9
              </div>
              <span className="font-semibold text-sidebar-foreground">
                Agência B9
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bem-vindo ao seu portal
            </p>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium">Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== base && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="transition-all duration-[400ms]"
                    >
                      <Link href={item.href} className="[&>svg]:text-sky-400/90 data-[active=true]:[&>svg]:text-sky-300">
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium">Perfil</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Sair">
                  <Link href="/login">
                    <span className="text-sidebar-foreground/70 text-xs">Sair</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
