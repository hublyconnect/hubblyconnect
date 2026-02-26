import Link from "next/link";
import { Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900 hover:opacity-90"
          >
            <Sparkles className="size-5 text-[#3B82F6]" />
            Hubly Connect
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild className="rounded-xl text-slate-600 hover:text-slate-900">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]">
              <Link href="/login?demo=1">Demonstração</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/20 bg-[#3B82F6] py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 font-heading text-lg font-bold text-white">
                <Sparkles className="size-5 text-white" />
                Hubly Connect
              </div>
              <p className="mt-2 text-sm text-white/90">
                Central de inteligência para agências de alta performance.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white">
                <Shield className="size-3.5" />
                Plataforma Segura
              </div>
            </div>
            <div>
              <h4 className="font-heading text-sm font-semibold text-white">Produto</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li><Link href="/login?demo=1" className="hover:text-white">Demonstração</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
                <li><Link href="/#problema" className="hover:text-white">Comparativo</Link></li>
                <li><Link href="/#planos" className="hover:text-white">Planos</Link></li>
                <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm font-semibold text-white">Empresa</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li><Link href="#" className="hover:text-white">Sobre nós</Link></li>
                <li><Link href="#" className="hover:text-white">Contato</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm font-semibold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li>
                <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/20 pt-8">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/80">
              <Link href="/privacidade" className="transition-colors hover:text-white">Privacidade</Link>
              <span aria-hidden>·</span>
              <Link href="/termos" className="transition-colors hover:text-white">Termos de Uso</Link>
            </div>
            <p className="text-sm text-white/90">
              © {new Date().getFullYear()} Hubly Connect. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
