import { Shield, Lock, Eye } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Hubly Connect",
  description: "Política de Privacidade da Hubly Connect. Respeitamos a LGPD e protegemos seus dados.",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-2 text-[#3B82F6]">
          <Shield className="size-6" />
          <span className="text-sm font-semibold uppercase tracking-wider">Política de Privacidade</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
          Política de Privacidade da Hubly Connect
        </h1>
        <p className="mt-3 text-slate-600">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <Lock className="size-5 text-[#3B82F6]" />
            Compromisso com a LGPD
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            A Hubly Connect está em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            Respeitamos seu direito à privacidade e tratamos todos os dados pessoais de forma transparente, segura e
            dentro dos limites legais aplicáveis.
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <Eye className="size-5 text-[#3B82F6]" />
            Dados Coletados via APIs
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Os dados obtidos através das APIs oficiais do <strong>WhatsApp</strong> e do <strong>Facebook (Meta)</strong> são
            utilizados <strong>exclusivamente</strong> para a gestão do CRM do usuário, incluindo:
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-slate-600">
            <li>Centralização de conversas e atendimento ao cliente</li>
            <li>Armazenamento seguro de mensagens e histórico de interações</li>
            <li>Rastreamento de campanhas e métricas de desempenho de anúncios</li>
            <li>Gestão de criativos, aprovações e onboarding de clientes</li>
          </ul>
          <p className="mt-4 leading-relaxed text-slate-600">
            Não utilizamos esses dados para fins de marketing externo, revenda ou qualquer finalidade que não seja
            a prestação do serviço contratado.
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <Shield className="size-5 text-[#3B82F6]" />
            Não Compartilhamos Dados com Terceiros
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            A Hubly Connect <strong>não compartilha</strong> seus dados pessoais ou os de seus clientes com terceiros
            para fins comerciais, publicitários ou de prospecção. As informações permanecem sob sua responsabilidade
            e controle, armazenadas em infraestrutura segura e acessíveis apenas aos usuários autorizados da sua conta.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Contato
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados, entre em contato
            conosco através dos canais disponíveis no site.
          </p>
        </section>
      </div>
    </div>
  );
}
