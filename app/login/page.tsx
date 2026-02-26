"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function FloatingLabelInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const floating = value.length > 0 || focused;
  return (
    <div className="relative">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="login-input h-12 rounded-xl border-slate-200 bg-slate-50/50 pt-4 focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:ring-offset-0"
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 transition-all duration-200 ease-out",
          floating
            ? "top-2 text-xs font-medium text-[#3B82F6]"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
        )}
      >
        {label}
      </label>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-") && name.includes("auth")) {
        document.cookie = `${name}=; path=/; max-age=0`;
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        if (
          authError.message.includes("Failed to fetch") ||
          authError.message.toLowerCase().includes("refresh")
        ) {
          setError("Sessão expirada. Tente novamente.");
        } else {
          setError(authError.message);
        }
        return;
      }
      window.location.href = callbackUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Dot matrix + Glow azul atrás do card */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.4) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-white/80" />
      <div
        className="absolute -z-10 hidden h-[500px] w-[400px] rounded-full bg-[#3B82F6]/20 blur-[100px] sm:block"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      <Card className="relative w-full max-w-md border-0 bg-white shadow-[0_25px_60px_-12px_rgba(59,130,246,0.2)] rounded-[2.5rem] overflow-hidden">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 rounded-2xl bg-[#3B82F6]/10 px-4 py-2.5">
              <Sparkles className="size-7 text-[#3B82F6]" />
              <span className="font-heading text-xl font-bold text-slate-900">Hubly Connect</span>
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl font-semibold text-slate-900">
              Entrar na sua conta
            </CardTitle>
            <CardDescription className="text-slate-600">
              Use seu e-mail e senha para acessar o painel
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <FloatingLabelInput
                id="email"
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1">
              <FloatingLabelInput
                id="password"
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white font-medium shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Ainda não tem acesso?{" "}
            <Link href="#" className="font-medium text-[#3B82F6] underline-offset-4 hover:underline">
              Fale com a agência
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Hubly Connect
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-white">
          <span className="text-slate-500">Carregando…</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
