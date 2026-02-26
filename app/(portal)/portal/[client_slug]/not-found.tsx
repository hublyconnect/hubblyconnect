import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PortalNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-200 text-slate-500 mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Página não encontrada</h1>
        <p className="text-slate-600 mt-2 text-sm">
          Este link do portal pode estar incorreto ou o cliente não existe.
        </p>
        <Button asChild className="mt-6 rounded-full" variant="outline">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
