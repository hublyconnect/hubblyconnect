"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AccessCredentialProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Se true, usa tipo password com toggle de visibilidade e botão copiar */
  secret?: boolean;
  /** Campo multilinha (textarea) */
  multiline?: boolean;
  rows?: number;
  className?: string;
  disabled?: boolean;
  /** Máscara de exibição quando secret (ex: 000-000-0000) */
  maskFormat?: (v: string) => string;
}

export function AccessCredential({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
  multiline = false,
  rows = 3,
  className,
  disabled,
  maskFormat,
}: AccessCredentialProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const showSecret = secret ? visible : true;
  const displayValue = maskFormat ? maskFormat(value) : value;

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const inputProps = {
    value: maskFormat ? displayValue : value,
    onChange: onChange ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) : undefined,
    placeholder,
    disabled,
    className: "rounded-lg pr-20 font-mono text-sm",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="relative">
        {multiline ? (
          <Textarea
            {...inputProps}
            rows={rows}
            className={cn(
              "rounded-lg pr-20 min-h-[80px] resize-y",
              "font-mono text-sm"
            )}
            style={secret && !showSecret ? { WebkitTextSecurity: "disc" } as React.CSSProperties : undefined}
          />
        ) : (
          <Input
            type={secret && !showSecret ? "password" : "text"}
            {...inputProps}
          />
        )}
        <div className={cn(
          "absolute flex items-center gap-0.5",
          multiline ? "right-2 top-2" : "right-2 top-1/2 -translate-y-1/2"
        )}>
          {secret && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar" : "Mostrar"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            disabled={!value}
            aria-label="Copiar"
          >
            {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
