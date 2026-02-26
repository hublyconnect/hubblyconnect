"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { useActiveClient } from "@/contexts/active-client-context";

export function ClientSelector({ agencySlug }: { agencySlug: string }) {
  const [open, setOpen] = useState(false);
  const { clientId, setClientId } = useActiveClient();
  const { data: agency } = useAgencyBySlug(agencySlug);
  const { data: clients = [], isLoading } = useClients(agency?.id ?? null);
  const selected = clients.find((c) => c.id === clientId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[260px] justify-between rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#3B82F6]"
          )}
        >
          {isLoading ? (
            <span className="text-white/80">Carregando…</span>
          ) : selected ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="size-6 shrink-0 ring-1 ring-white/20">
                  <AvatarImage src={selected.instagram_avatar_url ?? undefined} alt={selected.name} />
                  <AvatarFallback className="bg-white/20 text-xs text-white">
                    {selected.name.trim().slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selected.name}</span>
              </div>
            </>
          ) : (
            <>
              <User className="mr-2 size-4 shrink-0 text-white/80" />
              <span className="text-white/90">Selecione o cliente</span>
            </>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-white/70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-900/10 rounded-2xl overflow-hidden"
        align="end"
      >
        <Command className="rounded-2xl">
          <CommandInput placeholder="Buscar cliente..." className="rounded-t-2xl border-0 border-b border-slate-100" />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup className="p-1">
              {clients.map((client) => {
                const isSelected = clientId === client.id;
                return (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => {
                      setClientId(client.id === clientId ? null : client.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-xl gap-3 py-2.5",
                      isSelected && "bg-[#3B82F6]/10 ring-2 ring-[#3B82F6]/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    )}
                  >
                    <Avatar className={cn("size-9 shrink-0", isSelected && "ring-2 ring-[#3B82F6]")}>
                      <AvatarImage src={client.instagram_avatar_url ?? undefined} alt={client.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
                        {client.name.trim().slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={cn("font-medium truncate", isSelected && "text-[#3B82F6]")}>{client.name}</span>
                      {client.niche && (
                        <span className="text-xs text-muted-foreground truncate">{client.niche}</span>
                      )}
                    </div>
                    <Check className={cn("size-4 shrink-0", isSelected ? "opacity-100 text-[#3B82F6]" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <p className="text-[10px] text-slate-400 px-3 py-2 border-t border-slate-100">
          Atalho: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">⌘K</kbd>
        </p>
      </PopoverContent>
    </Popover>
  );
}
