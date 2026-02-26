"use client";

import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  CalendarClock,
  CheckSquare,
  Users,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Shield,
  Link2,
  FileCheck,
  Zap,
  ChevronDown,
  AlertCircle,
  Check,
  Star,
} from "lucide-react";

function useMousePosition(ref: React.RefObject<HTMLElement | null>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((e.clientX - cx) / rect.width);
      y.set((e.clientY - cy) / rect.height);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [ref, x, y]);
  return { x, y };
}

function FloatingDashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = useMousePosition(ref);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);
  return (
    <motion.div
      ref={ref}
      className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px]"
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
    >
      {/* Brilho Neon atrás do mockup */}
      <div
        className="absolute inset-0 -z-10 rounded-3xl bg-[#3B82F6]/40 blur-[60px] scale-95"
        style={{ filter: "blur(50px)", transform: "translateZ(-10px) scale(1.05)" }}
      />
      <div
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-20px_rgba(59,130,246,0.35)]"
        style={{ transform: "translateZ(20px)", boxShadow: "0 0 80px -10px rgba(59,130,246,0.5)" }}
      >
        <div className="flex">
          {/* Sidebar simulada */}
          <div className="w-14 shrink-0 border-r border-slate-100 bg-slate-50 py-2.5">
            <div className="mx-1.5 mb-2 h-5 w-8 rounded bg-[#3B82F6]" />
            {["#64748b", "#94a3b8", "#3B82F6", "#64748b"].map((c, i) => (
              <div key={i} className="mx-1.5 mb-1.5 h-7 rounded-md" style={{ backgroundColor: c, opacity: i === 2 ? 0.9 : 0.5 }} />
            ))}
          </div>
          {/* Conteúdo: dashboard vivo */}
          <div className="min-w-0 flex-1 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9]" />
              <div className="h-2 flex-1 rounded-full bg-slate-200/80" />
            </div>
            <div className="mb-2 flex gap-1.5">
              <div className="h-6 flex-1 rounded-md bg-[#3B82F6]/30" />
              <div className="h-6 w-10 rounded-md bg-slate-200/60" />
            </div>
            {/* Barras de progresso */}
            <div className="space-y-2">
              {[70, 45, 90].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-8 rounded-full bg-slate-200/80" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9]" style={{ width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <div className="h-8 flex-1 rounded-lg border border-slate-100 bg-slate-50/80" />
              <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
                <CheckSquare className="size-3.5 text-[#3B82F6]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

function StaggerGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FAQ_ITEMS = [
  { q: "O Hubly substitui o WhatsApp?", a: "Sim, a bagunça dele. Centralizamos a aprovação para você nunca mais caçar áudios de clientes." },
  { q: "Suporta vídeos pesados?", a: "Sim, até 200MB. Enquanto os outros travam, o Hubly voa." },
];

export default function Home() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [contrastHover, setContrastHover] = useState(false);
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      {/* Gradient Mesh + Floating Parallax */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/2 h-full w-full animate-[pulse_12s_ease-in-out_infinite] opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59, 130, 246, 0.2), transparent 50%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(14, 165, 233, 0.12), transparent 45%), radial-gradient(ellipse 50% 30% at 20% 80%, rgba(59, 130, 246, 0.08), transparent 40%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white" />
        {/* Floating UI elements */}
        <motion.div className="absolute top-[20%] left-[10%] w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20" animate={{ y: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.div className="absolute top-[40%] right-[15%] w-8 h-8 rounded-full bg-[#0EA5E9]/20" animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }} />
        <motion.div className="absolute top-[60%] left-[20%] w-16 h-16 rounded-2xl bg-slate-100/80 border border-slate-200/60" animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} />
        <motion.div className="absolute top-[30%] right-[25%] w-10 h-10 rounded-lg bg-[#3B82F6]/15" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 0.2 }} />
        <motion.div className="absolute bottom-[25%] left-[15%] w-6 h-6 rounded-full bg-[#06B6D4]/20" animate={{ y: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 0.8 }} />
        <motion.div className="absolute bottom-[35%] right-[20%] w-14 h-14 rounded-xl bg-slate-200/50" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.3 }} />
      </div>

      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
            <Sparkles className="size-5 text-[#3B82F6]" />
            Hubly Connect
          </span>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild className="rounded-xl text-slate-600 transition-all duration-300 hover:text-slate-900 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="rounded-xl bg-[#3B82F6] text-white shadow-sm shadow-blue-500/25 transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_0_28px_rgba(59,130,246,0.45)]"
            >
              <Link href="/login?demo=1">Demonstração</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="mx-auto max-w-4xl text-center">
            <motion.h1
              className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-[#3B82F6] via-[#0EA5E9] to-[#06B6D4] bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              Pare de Gerenciar o Caos. Comece a Escalar sua Agência.
            </motion.h1>
            <motion.p
              className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            >
              Diga adeus ao caos do WhatsApp e planilhas perdidas. O Hubly Connect centraliza
              agendamentos, aprovações e gestão de clientes em uma única interface tecnológica
              desenhada para a alta performance.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            >
              <Button
                size="lg"
                asChild
                className="rounded-full bg-[#3B82F6] px-8 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)] hover:scale-[1.02]"
              >
                <Link href="/login?demo=1" className="gap-2">
                  Solicitar demonstração
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-full border-slate-200 text-slate-700 transition-all duration-300 hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:border-[#3B82F6]/50"
              >
                <Link href="/login">Fazer login</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div
            className="mt-16 sm:mt-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          >
            <FloatingDashboardPreview />
          </motion.div>
        </section>

        {/* Caos vs Hubly: visual desconstruído + herói */}
        <section
          id="problema"
          className="scroll-mt-20 border-y border-slate-200/60 bg-slate-50/50 px-4 py-16 sm:py-24 relative overflow-hidden"
          onMouseEnter={() => setContrastHover(true)}
          onMouseLeave={() => setContrastHover(false)}
        >
          <div className="mx-auto max-w-6xl relative z-10">
            <AnimatedReveal className="text-center mb-12">
              <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-white bg-clip-text text-transparent sm:text-3xl">
                Como sua agência trabalha hoje
              </h2>
              <p className="mt-2 text-slate-600">vs como será com Hubly Connect</p>
            </AnimatedReveal>
            <div className="grid gap-8 md:grid-cols-2 items-stretch min-h-[360px]">
              {/* Lado Caos: mini-cards distribuídos (caos organizado), scale-90, blur suave */}
              <AnimatedReveal delay={0.1}>
                <div className="relative min-h-[340px] flex items-center justify-center py-4">
                  <p className="absolute top-0 left-0 text-xs font-semibold uppercase tracking-wider text-slate-500 z-10">Hoje (caos)</p>
                  <div className="relative w-full max-w-[320px] h-[300px] grayscale-[90%] blur-[0.4px]">
                    {/* Mini-card WhatsApp - áudio pendente (espaçado: canto superior esquerdo) */}
                    <motion.div
                      className="absolute top-2 left-0 w-[140px] scale-90 origin-top-left rounded-xl bg-white/95 border border-slate-200/80 shadow-lg p-3 rotate-[-3deg] z-20"
                      animate={contrastHover ? { x: -12, y: -8, opacity: 0.4 } : { x: 0, y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#25D366]/20 text-[#166534]">
                          <MessageSquare className="size-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Cliente</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-100/80 px-2 py-2">
                        <div className="size-6 rounded-full bg-slate-300/80 flex items-center justify-center">
                          <span className="text-[10px] text-slate-500">▶</span>
                        </div>
                        <span className="text-[11px] text-slate-600">Áudio · 5:42</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Áudio de 5 minutos pendente</p>
                    </motion.div>
                    {/* Mini-card Notificação (centro-direita, desempilhado) */}
                    <motion.div
                      className="absolute top-24 right-0 w-[150px] scale-90 origin-top-right rounded-xl bg-amber-50/95 border border-amber-200/80 shadow-lg p-3 rotate-[2deg] z-30"
                      animate={contrastHover ? { x: 14, y: -6, opacity: 0.4 } : { x: 0, y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-amber-600" />
                        <span className="text-xs font-semibold text-slate-700">Notificação</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 leading-snug">Onde está o arquivo final?</p>
                    </motion.div>
                    {/* Mini-card Erro (inferior centro, espalhado) */}
                    <motion.div
                      className="absolute bottom-4 left-[calc(50%-72px)] w-[145px] scale-90 origin-bottom rounded-xl bg-red-50/95 border border-red-200/80 shadow-lg p-3 rotate-[3deg] z-10"
                      animate={contrastHover ? { x: -10, y: 10, opacity: 0.4 } : { x: 0, y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-red-200/80 text-red-600 font-bold text-sm">!</div>
                        <span className="text-xs font-semibold text-red-800">Erro</span>
                      </div>
                      <p className="mt-1 text-[11px] text-red-700/90">Formato não suportado</p>
                    </motion.div>
                  </div>
                </div>
              </AnimatedReveal>
              {/* Lado Hubly: herói com borda que respira + timeline (padding e espaço generosos) */}
              <AnimatedReveal delay={0.2}>
                <motion.div
                  className="h-full min-h-[340px] rounded-3xl p-[2px] bg-gradient-to-br from-[#3B82F6] via-[#0EA5E9] to-[#06B6D4] transition-shadow duration-300 animate-pulse"
                  style={{ animationDuration: "3s" }}
                  animate={contrastHover ? { boxShadow: "0 0 50px rgba(59,130,246,0.4), inset 0 0 30px rgba(59,130,246,0.08)" } : { boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`h-full rounded-[calc(1.5rem-2px)] bg-white/95 backdrop-blur-2xl border border-white/60 flex flex-col p-10 transition-shadow duration-300 ${contrastHover ? "shadow-[inset_0_0_60px_rgba(59,130,246,0.06)]" : ""}`}>
                    <p className="text-sm font-medium uppercase tracking-wider text-[#3B82F6] mb-8">Com Hubly Connect</p>
                    {/* Timeline: Check -> Post Agendado -> Sucesso (space-y-6 / gap-8) */}
                    <div className="space-y-6 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-200/80">
                          <Check className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Check</p>
                          <p className="text-sm text-slate-600">Aprovação registrada</p>
                        </div>
                      </div>
                      <div className="ml-5 h-8 w-px bg-gradient-to-b from-slate-200 to-slate-100" />
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-[#3B82F6] ring-2 ring-[#3B82F6]/20">
                          <CalendarClock className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Post Agendado</p>
                          <p className="text-sm text-slate-600">Publicação no horário certo</p>
                        </div>
                      </div>
                      <div className="ml-5 h-8 w-px bg-gradient-to-b from-slate-200 to-slate-100" />
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-200/80">
                          <Check className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Sucesso</p>
                          <p className="text-sm text-slate-600">Post publicado com sucesso</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-50/90 backdrop-blur-sm px-4 py-3 border border-emerald-200/60">
                      <Check className="size-5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-800">Post Publicado!</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatedReveal>
            </div>
          </div>
        </section>

        {/* Funcionalidades: Bento Grid */}
        <section className="px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <AnimatedReveal className="text-center mb-14">
              <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-white bg-clip-text text-transparent sm:text-3xl">
                Funcionalidades que fazem a diferença
              </h2>
              <p className="mt-3 max-w-xl mx-auto text-slate-600">
                Tecnologia de ponta para quem não aceita menos que a perfeição operacional.
              </p>
            </AnimatedReveal>
            <StaggerGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CalendarClock, title: "Agendamento Massivo", desc: "Vídeos de até 200MB processados em segundos com tecnologia nativa de transcodificação." },
                { icon: CheckSquare, title: "Aprovação em Tempo Real", desc: "O cliente aprova direto no portal. Feedback instantâneo e histórico de alterações." },
                { icon: Users, title: "CRM para Social Media", desc: "Dados dos clientes, arquivos e acessos em um só lugar." },
                { icon: Calendar, title: "Calendário Unificado", desc: "Uma visão macro de toda a sua operação semanal e mensal." },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
                  className="group h-full rounded-3xl bg-white p-[1px] shadow-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #0EA5E9, #06B6D4)" }}
                >
                  <div className="h-full rounded-3xl bg-white p-6">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-shadow duration-300 group-hover:shadow-[0_0_28px_rgba(59,130,246,0.4)]">
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </StaggerGrid>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="scroll-mt-20 border-y border-slate-200/60 bg-slate-50/30 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <AnimatedReveal className="text-center mb-12">
              <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-white bg-clip-text text-transparent sm:text-3xl">
                Escolha o seu nível de jogo
              </h2>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                Pare de perder tempo com processos manuais que custam caro.
              </p>
            </AnimatedReveal>
            <div className="grid gap-8 md:grid-cols-3">
              <AnimatedReveal delay={0.05}>
                <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                  <h3 className="font-heading text-xl font-bold text-slate-900">Starter</h3>
                  <p className="mt-2 text-sm text-slate-600">Para quem está começando</p>
                  <div className="mt-6 text-3xl font-bold text-slate-900">Sob consulta</div>
                  <Button asChild className="mt-6 w-full rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">
                    <Link href="/login?demo=1">Começar</Link>
                  </Button>
                </div>
              </AnimatedReveal>
              <AnimatedReveal delay={0.1}>
                <div className="relative rounded-3xl border-2 border-[#3B82F6]/50 bg-white p-8 shadow-[0_0_40px_rgba(59,130,246,0.12)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(59,130,246,0.18)] ring-2 ring-[#3B82F6]/20">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-[#3B82F6] px-3 py-1 text-xs font-bold text-white">
                    <Star className="size-3.5" />
                    Mais Vendido
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900">Pro</h3>
                  <p className="mt-2 text-sm text-slate-600">O favorito das agências</p>
                  <div className="mt-6 text-3xl font-bold text-[#3B82F6]">Sob consulta</div>
                  <Button asChild className="mt-6 w-full rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] hover:shadow-[0_0_28px_rgba(59,130,246,0.45)]">
                    <Link href="/login?demo=1">Assinar Pro</Link>
                  </Button>
                </div>
              </AnimatedReveal>
              <AnimatedReveal delay={0.15}>
                <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                  <h3 className="font-heading text-xl font-bold text-slate-900">Elite</h3>
                  <p className="mt-2 text-sm text-slate-600">Escala ilimitada</p>
                  <div className="mt-6 text-3xl font-bold text-slate-900">Sob consulta</div>
                  <Button asChild className="mt-6 w-full rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">
                    <Link href="/login?demo=1">Falar com vendas</Link>
                  </Button>
                </div>
              </AnimatedReveal>
            </div>
          </div>
        </section>

        {/* Como Funciona: Timeline */}
        <section className="border-t border-slate-200/60 bg-slate-50/30 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <AnimatedReveal className="text-center mb-14">
              <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-white bg-clip-text text-transparent sm:text-3xl">
                Como funciona
              </h2>
              <p className="mt-3 text-slate-600">Três passos para transformar sua operação.</p>
            </AnimatedReveal>
            <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
              {/* Linhas animadas entre passos (corrente elétrica) */}
              <svg className="absolute left-0 right-0 top-7 hidden h-14 w-full sm:block pointer-events-none" viewBox="0 0 400 56" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="electricGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#0EA5E9" stopOpacity="1" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <line x1="80" y1="28" x2="200" y2="28" stroke="url(#electricGrad)" strokeWidth="2" strokeDasharray="8 8" style={{ animation: "electricFlow 2s ease-in-out infinite" }} />
                <line x1="200" y1="28" x2="320" y2="28" stroke="url(#electricGrad)" strokeWidth="2" strokeDasharray="8 8" style={{ animation: "electricFlow 2s ease-in-out infinite 0.5s" }} />
              </svg>
              <AnimatedReveal delay={0.1} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30">
                  <Link2 className="size-7" />
                </div>
                <span className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  1. Conecte suas contas
                </span>
                <p className="mt-2 text-sm text-slate-600">
                  Integre Instagram e Facebook em poucos cliques.
                </p>
              </AnimatedReveal>
              <AnimatedReveal delay={0.2} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30">
                  <LayoutDashboard className="size-7" />
                </div>
                <span className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  2. Agende e Projete
                </span>
                <p className="mt-2 text-sm text-slate-600">
                  Monte a fila de posts e envie para aprovação.
                </p>
              </AnimatedReveal>
              <AnimatedReveal delay={0.3} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30">
                  <FileCheck className="size-7" />
                </div>
                <span className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  3. Aprove e Publique
                </span>
                <p className="mt-2 text-sm text-slate-600">
                  Cliente aprova no portal; publicação automática no horário.
                </p>
              </AnimatedReveal>
            </div>
            <AnimatedReveal className="mt-12 text-center">
              <Button
                size="lg"
                asChild
                className="rounded-full bg-[#3B82F6] px-8 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
              >
                <Link href="/login?demo=1" className="gap-2">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </AnimatedReveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <AnimatedReveal className="text-center mb-12">
              <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-white bg-clip-text text-transparent sm:text-3xl">
                Perguntas frequentes
              </h2>
            </AnimatedReveal>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <AnimatedReveal key={i} delay={i * 0.05}>
                  <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-900 hover:bg-slate-50/80 transition-colors"
                    >
                      {item.q}
                      <ChevronDown className={`size-5 text-slate-500 shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                    </button>
                    {faqOpen === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-4 text-sm text-slate-600 leading-relaxed"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </div>
                </AnimatedReveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer corporativo - Total Blue */}
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
                <li>
                  <Link href="/login?demo=1" className="transition-colors hover:text-white">
                    Demonstração
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-white">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="#problema" className="transition-colors hover:text-white">
                    Comparativo
                  </Link>
                </li>
                <li>
                  <Link href="#planos" className="transition-colors hover:text-white">
                    Planos
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="transition-colors hover:text-white">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm font-semibold text-white">Empresa</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Sobre nós
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Contato
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-sm font-semibold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Termos de uso
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-8 sm:flex-row">
            <p className="text-sm text-white/90">
              © {new Date().getFullYear()} Hubly Connect. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-white/80 transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-white/80 transition-colors hover:text-white"
                aria-label="Instagram"
              >
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.44-.645 1.44-1.44-.644-1.44-1.44-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
