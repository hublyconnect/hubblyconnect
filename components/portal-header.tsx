"use client";

import type { Client } from "@/lib/types/database";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PortalHeader({ client }: { client: Client }) {
  const displayImage = client.instagram_avatar_url ?? null;
  const initials = getInitials(client.name);

  return (
    <header
      className="w-full bg-zinc-950 text-white py-12 px-6"
      style={{ backgroundColor: "#09090b" }}
    >
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between max-w-md mx-auto md:max-w-4xl">
        <div
          className="h-20 w-20 rounded-2xl border-4 border-white/10 shadow-xl overflow-hidden flex items-center justify-center shrink-0 bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={client.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white/90">
              {initials}
            </span>
          )}
        </div>
        <div className="text-center md:text-right">
          <p className="text-white/80 text-sm font-medium">Olá, equipe</p>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
            {client.name}
          </h1>
        </div>
      </div>
    </header>
  );
}
