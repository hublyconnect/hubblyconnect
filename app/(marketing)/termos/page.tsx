import Link from "next/link";
import { Shield, FileText, MessageSquare, CheckCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | Hubly Connect",
  description: "Termos de Uso da plataforma Hubly Connect. Conheça as regras e responsabilidades do uso do serviço.",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-2 text-[#3B82F6]">
          <FileText className="size-6" />
          <span className="text-sm font-semibold uppercase tracking-wider">Termos de Uso</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
          Termos de Uso da Hubly Connect
        </h1>
        <p className="mt-3 text-slate-600">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <CheckCircle className="size-5 text-[#3B82F6]" />
            Aceitação dos Termos
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            O uso da plataforma Hubly Connect implica na <strong>aceitação integral</strong> destes Termos de Uso e
            das regras estabelecidas em nossa <strong>Política de Privacidade</strong>. Ao criar uma conta, fazer login
            ou utilizar qualquer funcionalidade do serviço, você concorda em cumprir todas as disposições aqui previstas.
          </p>
          <p className="mt-4 leading-relaxed text-slate-600">
            Recomendamos a leitura atenta da Política de Privacidade, disponível em{" "}
            <Link href="/privacidade" className="text-[#3B82F6] underline hover:text-[#2563EB]">/privacidade</Link>,
            antes de utilizar a plataforma.
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <MessageSquare className="size-5 text-[#3B82F6]" />
            Responsabilidade pelas Mensagens
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            O <strong>usuário é integralmente responsável</strong> por todas as mensagens, conteúdos e comunicações
            enviadas através da plataforma Hubly Connect, incluindo aquelas transmitidas via integração com WhatsApp,
            Facebook e Instagram.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-slate-600">
            <li>O usuário deve garantir que suas mensagens estejam em conformidade com as leis aplicáveis</li>
            <li>O usuário é responsável por obter o consentimento dos destinatários quando exigido</li>
            <li>A Hubly Connect atua como intermediária de tecnologia e não se responsabiliza pelo conteúdo gerado pelos usuários</li>
          </ul>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-slate-900">
            <Shield className="size-5 text-[#3B82F6]" />
            Conformidade com as Políticas da Meta
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            A Hubly Connect está em conformidade com as políticas e diretrizes da <strong>Meta (Facebook, Instagram, WhatsApp)</strong>.
            O uso das integrações disponíveis na plataforma está condicionado ao cumprimento das regras dessas plataformas
            por parte do usuário, incluindo:
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-slate-600">
            <li>Políticas de uso comercial do WhatsApp Business</li>
            <li>Termos de Serviço do Facebook e Instagram</li>
            <li>Políticas de anúncios e publicidade da Meta</li>
          </ul>
          <p className="mt-4 leading-relaxed text-slate-600">
            A violação das políticas da Meta por parte do usuário pode resultar na suspensão ou desativação das integrações,
            sem prejuízo de outras medidas cabíveis.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Uso Adequado da Plataforma
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            O usuário compromete-se a utilizar a Hubly Connect exclusivamente para fins legítimos de gestão de agências,
            clientes e campanhas. É vedado o uso para atividades ilícitas, spam, assédio ou qualquer conduta que viole
            direitos de terceiros ou as leis vigentes.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold text-slate-900">
            Alterações e Contato
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            A Hubly Connect reserva-se o direito de alterar estes Termos de Uso a qualquer momento. Alterações
            significativas serão comunicadas aos usuários. O uso continuado da plataforma após tais alterações
            constitui aceitação dos novos termos.
          </p>
          <p className="mt-4 leading-relaxed text-slate-600">
            Em caso de dúvidas sobre estes Termos de Uso, entre em contato através dos canais disponíveis no site.
          </p>
        </section>
      </div>
    </div>
  );
}
