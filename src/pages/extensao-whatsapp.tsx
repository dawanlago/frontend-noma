import { useEffect, useState, type ReactNode } from "react";
import Head from "next/head";
import { HiOutlineArrowDownTray, HiOutlineCheck, HiOutlineClipboard } from "react-icons/hi2";
import ListHeader from "@/components/ui/ListHeader";

/** Versão do pacote em /public/downloads/noma-whatsapp.zip (manifest.json da extensão). */
const EXTENSION_VERSION = "0.1.4";

function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-charcoal/10 bg-beige px-2 py-1 font-mono text-[13px] text-charcoal transition hover:border-charcoal/25"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copiar"
    >
      {value}
      {copied ? <HiOutlineCheck className="h-4 w-4 text-sage" /> : <HiOutlineClipboard className="h-4 w-4 text-charcoal/40" />}
    </button>
  );
}

function Step({ number, title, children }: { number: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tan/10 text-sm font-bold text-tan">{number}</span>
      <div className="min-w-0 pb-1">
        <p className="font-semibold text-charcoal">{title}</p>
        {children ? <div className="mt-1 space-y-2 text-sm leading-relaxed text-charcoal/65">{children}</div> : null}
      </div>
    </li>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-charcoal">{title}</h2>
      {description ? <p className="mt-1 text-sm text-charcoal/55">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function WhatsAppExtensionPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <>
      <Head>
        <title>Extensão do WhatsApp | Noma</title>
      </Head>
      <ListHeader
        title="Extensão do WhatsApp"
        description="Acompanhe a negociação de cada contato sem sair do WhatsApp Web."
        actions={
          <a href="/downloads/noma-whatsapp.zip" download className="btn-primary">
            <HiOutlineArrowDownTray className="h-4 w-4" /> Baixar extensão
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Section
            title="1. Instalar (uma vez em cada computador)"
            description="Funciona no Google Chrome (e em navegadores baseados nele, como Edge e Brave) no computador."
          >
            <ol className="space-y-5">
              <Step number={1} title="Baixe a extensão">
                <p>
                  Clique em <strong>Baixar extensão</strong> (acima) e descompacte o arquivo <strong>noma-whatsapp.zip</strong>. Vai aparecer a pasta{" "}
                  <strong>noma-whatsapp</strong>.
                </p>
                <p>
                  Guarde essa pasta num lugar fixo (por exemplo, em Documentos). <strong>Não apague a pasta depois de instalar</strong>: o Chrome usa
                  os arquivos dela.
                </p>
              </Step>
              <Step number={2} title="Abra a página de extensões do Chrome">
                <p>
                  Copie e cole na barra de endereço: <CopyText value="chrome://extensions" />
                </p>
              </Step>
              <Step number={3} title="Ligue o Modo do desenvolvedor">
                <p>É a chave no canto superior direito da página de extensões.</p>
              </Step>
              <Step number={4} title="Carregue a pasta">
                <p>
                  Clique em <strong>Carregar sem compactação</strong> e escolha a pasta <strong>noma-whatsapp</strong>. A extensão{" "}
                  <strong>Noma para WhatsApp</strong> aparece na lista.
                </p>
                <p>Dica: clique no ícone de quebra-cabeça da barra do Chrome e fixe a extensão para ela ficar sempre à mão.</p>
              </Step>
              <Step number={5} title="Abra o WhatsApp Web e entre">
                <p>
                  Abra (ou recarregue) <CopyText value="https://web.whatsapp.com" />. O painel do Noma aparece à direita. Entre com o{" "}
                  <strong>mesmo e-mail e senha do Noma</strong>.
                </p>
              </Step>
            </ol>
          </Section>

          <Section title="2. Usar no dia a dia" description="Abra uma conversa: o painel encontra o contato pelo número do WhatsApp.">
            <ul className="space-y-3 text-sm leading-relaxed text-charcoal/70">
              <li>
                <strong className="text-charcoal">Contato novo:</strong> se o número não estiver no Noma, cadastre ali mesmo ou vincule a um contato
                que já existe (o número fica salvo nele para as próximas vezes).
              </li>
              <li>
                <strong className="text-charcoal">Incluir em um funil:</strong> escolha o funil, a etapa e, se quiser, o valor.
              </li>
              <li>
                <strong className="text-charcoal">Atualizar a etapa:</strong> troque a etapa (ou o funil) na lista; a mudança já vai para o CRM.
              </li>
              <li>
                <strong className="text-charcoal">Temperatura:</strong> Frio, Morno ou Quente, com um clique.
              </li>
              <li>
                <strong className="text-charcoal">Parecer:</strong> registre o que foi conversado; fica no histórico da negociação com seu nome e a
                data.
              </li>
              <li>
                <strong className="text-charcoal">Tarefas:</strong> crie tarefas com data e hora e marque como feitas. Elas aparecem em Atividades e
                na Agenda.
              </li>
              <li>
                <strong className="text-charcoal">Mais de uma negociação:</strong> escolha qual acompanhar na lista do topo, ou abra uma nova para o
                mesmo contato.
              </li>
            </ul>
            <p className="mt-4 rounded-lg bg-beige px-4 py-3 text-sm text-charcoal/65">
              Para esconder o painel, clique no <strong>×</strong>. Para abrir de novo, clique na aba azul <strong>N</strong> na lateral direita.
              Conversas em grupo não são vinculadas.
            </p>
          </Section>

          <Section title="3. Atualizar para uma versão nova">
            <ol className="space-y-5">
              <Step number={1} title="Baixe de novo e substitua os arquivos">
                <p>Baixe a extensão nesta página e substitua o conteúdo da pasta noma-whatsapp pelos arquivos novos.</p>
              </Step>
              <Step number={2} title="Recarregue a extensão">
                <p>
                  Em <CopyText value="chrome://extensions" />, clique no botão de recarregar (seta circular) da extensão Noma para WhatsApp.
                </p>
              </Step>
              <Step number={3} title="Recarregue o WhatsApp Web" />
            </ol>
          </Section>
        </div>

        <aside className="space-y-6 self-start">
          <Section title="Configuração opcional">
            <p className="text-sm leading-relaxed text-charcoal/65">
              Para o link <strong>Abrir no Noma</strong> funcionar no painel: clique no ícone da extensão na barra do Chrome → <strong>Configurações</strong>{" "}
              → <strong>Endereço do sistema</strong> e cole:
            </p>
            {origin ? (
              <div className="mt-3">
                <CopyText value={origin} />
              </div>
            ) : null}
            <p className="mt-3 text-xs text-charcoal/45">O endereço da API já vem preenchido. Não altere se não souber.</p>
          </Section>

          <Section title="Problemas comuns">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-charcoal">O painel não aparece</dt>
                <dd className="mt-1 text-charcoal/65">Recarregue o WhatsApp Web. Confira em chrome://extensions se a extensão está ligada.</dd>
              </div>
              <div>
                <dt className="font-semibold text-charcoal">“Telefone não identificado”</dt>
                <dd className="mt-1 text-charcoal/65">
                  Algumas conversas não mostram o número. Use <strong>Vincular a um contato existente</strong> e busque pelo nome.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-charcoal">“A extensão foi atualizada. Recarregue…”</dt>
                <dd className="mt-1 text-charcoal/65">Recarregue a página do WhatsApp Web.</dd>
              </div>
              <div>
                <dt className="font-semibold text-charcoal">Aviso de “extensões do modo de desenvolvedor”</dt>
                <dd className="mt-1 text-charcoal/65">
                  O Chrome mostra esse aviso para extensões instaladas pela pasta. É esperado: mantenha a extensão ativada.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-charcoal">Sessão expirada</dt>
                <dd className="mt-1 text-charcoal/65">Entre de novo pelo painel com seu e-mail e senha do Noma.</dd>
              </div>
            </dl>
          </Section>
          <p className="text-xs text-charcoal/40">Versão da extensão: {EXTENSION_VERSION}</p>
        </aside>
      </div>
    </>
  );
}
