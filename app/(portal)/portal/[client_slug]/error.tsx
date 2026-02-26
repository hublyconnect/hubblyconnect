"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div className="portal-root flex flex-col flex-1 min-h-0 bg-black items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <AlertCircle className="size-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Algo deu errado</h2>
        <p className="text-sm text-zinc-500 mt-2">
          Não foi possível carregar o portal. Tente novamente em instantes.
        </p>
        <Button
          onClick={reset}
          className="mt-6 bg-amber-500 hover:bg-amber-400 text-zinc-950"
        >
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
