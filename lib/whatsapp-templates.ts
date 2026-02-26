/**
 * Templates e helper para notificações WhatsApp (Agenda Global).
 */

export type WhatsAppTemplate = "confirmation" | "reminder";

/** Template 1: Confirmação de reunião */
export function buildConfirmationMessage(
  clientName: string,
  meetingType: string,
  date: string,
  time: string
): string {
  return `Olá ${clientName}, confirmando nossa reunião de ${meetingType} para ${date} às ${time}. Para confirmar ou reagendar, responda aqui.`;
}

/** Template 2: Lembrete 30min antes */
export function buildReminderMessage(clientName: string, meetingUrl: string): string {
  return `Opa ${clientName}! Nossa call começa em 30min. Link: ${meetingUrl || "(link em breve)"}`;
}

/**
 * Gera o link wa.me com texto codificado.
 * @param phone - Número com DDI (ex: 5511999999999), sem + ou espaços
 * @param message - Texto da mensagem (será codificado)
 */
export function getWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${text}`;
}

/** Formata data e hora para uso nos templates (pt-BR) */
export function formatForTemplate(date: Date): { date: string; time: string } {
  return {
    date: date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}
