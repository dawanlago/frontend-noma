import { useEffect } from "react";
import CheckRounded from "@mui/icons-material/CheckRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import Field from "@/components/tools/Field";
import Select from "@/components/ui/Select";
import {
  BODY_FONTS,
  TEMPLATE_NAMES,
  TEMPLATE_OPTIONS,
  TITLE_FONTS,
  bodyFontsFor,
  type ProposalTemplate,
} from "@/lib/proposals/model";
import { PAGE_LABELS, validVideos, type ProposalPage } from "@/lib/proposals/pages";
import { Callout, TextInput, patchSection, type StepProps } from "./ui";

const COLOR_PRESETS = ["#F43700", "#E11D48", "#F59E0B", "#16A34A", "#0EA5E9", "#2563EB", "#7C3AED", "#111111"];

const ALL_FONTS_HREF = `https://fonts.googleapis.com/css2?${[...Object.keys(TITLE_FONTS), ...Object.keys(BODY_FONTS)]
  .map((name) => `family=${name.replace(/ /g, "+")}`)
  .join("&")}&display=swap`;

/** Carrega as fontes do Google uma vez para a amostra do editor. */
function useFontPreview() {
  useEffect(() => {
    if (document.getElementById("proposal-font-preview")) return;
    const link = document.createElement("link");
    link.id = "proposal-font-preview";
    link.rel = "stylesheet";
    link.href = ALL_FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

export function ClosingStep({ data, setData }: StepProps) {
  const closing = data.closing;
  const set = (patch: Partial<typeof closing>) => patchSection(setData, "closing", patch);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Chamada final" full>
        <textarea
          className="input-search resize-y leading-6"
          rows={2}
          value={closing.call}
          onChange={(event) => set({ call: event.target.value })}
        />
      </Field>
      <Field label="Empresa" hint={data.company.name ? `Em branco usa "${data.company.name}".` : undefined}>
        <TextInput value={closing.company} onChange={(company) => set({ company })} placeholder={data.company.name || "Nome da empresa"} />
      </Field>
      <Field label="Site" hint={data.company.site ? `Em branco usa "${data.company.site}".` : undefined}>
        <TextInput value={closing.site} onChange={(site) => set({ site })} placeholder={data.company.site || "www.seusite.com.br"} />
      </Field>
      <Field
        label="Contato"
        hint={data.company.whatsapp ? `Em branco usa o WhatsApp "${data.company.whatsapp}".` : "Telefone, e-mail ou WhatsApp."}
        full
      >
        <TextInput
          value={closing.contact}
          onChange={(contact) => set({ contact })}
          placeholder={data.company.whatsapp || "(11) 99999-9999 · contato@empresa.com"}
        />
      </Field>
    </div>
  );
}

/** Miniatura esquemática de cada layout, já com a cor escolhida. */
function TemplateSketch({ template, color }: { template: ProposalTemplate; color: string }) {
  switch (template) {
    case "dark":
      return (
        <div className="relative h-full w-full overflow-hidden bg-[#0A0A0B] p-3">
          <div className="absolute -bottom-10 -right-6 h-24 w-24 rounded-full opacity-80 blur-lg" style={{ background: color }} />
          <div className="h-1.5 w-8 rounded bg-white/40" />
          <div className="mt-5 h-3 w-3/4 rounded-sm bg-white" />
          <div className="mt-1.5 h-3 w-1/2 rounded-sm bg-white" />
          <div className="absolute inset-x-3 bottom-3 flex gap-2 border-t border-white/15 pt-2">
            <div className="h-1.5 w-8 rounded bg-white/40" />
            <div className="h-1.5 w-6 rounded bg-white/25" />
          </div>
        </div>
      );
    case "light":
      return (
        <div className="relative h-full w-full bg-[#FBFAF8] p-3">
          <div className="flex justify-between">
            <div className="h-1.5 w-8 rounded bg-black/25" />
            <div className="h-1.5 w-5 rounded bg-black/15" />
          </div>
          <div className="absolute bottom-3 left-3">
            <div className="mb-2 h-[2px] w-5" style={{ background: color }} />
            <div className="h-2.5 w-24 rounded-sm bg-black/80" />
            <div className="mt-1 h-2.5 w-14 rounded-sm bg-black/80" />
          </div>
        </div>
      );
    case "editorial":
      return (
        <div className="flex h-full w-full bg-[#F1EBE0]">
          <div className="flex flex-1 flex-col justify-end p-3">
            <div className="h-4 w-full rounded-sm bg-[#1D1B17]" />
            <div className="mt-1 h-4 w-2/3 rounded-sm bg-[#1D1B17]" />
            <div className="mt-2 h-px w-full bg-[#1D1B17]" />
          </div>
          <div className="w-[34%] p-2" style={{ background: color }}>
            <div className="h-1.5 w-8 rounded bg-white/70" />
          </div>
        </div>
      );
    case "studio":
      return (
        <div
          className="h-full w-full bg-[#ECEDEF] p-2"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.06) 1px,transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        >
          <div className="flex h-full flex-col border border-[#0F1012]">
            <div className="flex h-3 border-b border-[#0F1012]">
              <div className="w-1/4 border-r border-[#0F1012] bg-white" />
            </div>
            <div className="flex flex-1 items-center px-2">
              <div className="h-3 w-3/4 rounded-sm bg-[#0F1012]" />
            </div>
            <div className="flex h-5 border-t border-[#0F1012]">
              <div className="w-1/2" style={{ background: color }} />
              <div className="flex-1 border-l border-[#0F1012] bg-white" />
            </div>
          </div>
        </div>
      );
    case "bold":
      return (
        <div className="relative flex h-full w-full flex-col justify-between" style={{ background: color }}>
          <div className="p-3">
            <div className="h-4 w-4/5 bg-[#0E0E0E]" />
            <div className="mt-1 h-4 w-1/2 bg-[#0E0E0E]" />
          </div>
          <div className="h-5 bg-[#0E0E0E]" />
        </div>
      );
  }
}

export function IdentityStep({ data, setData }: StepProps) {
  const identity = data.identity;
  const set = (patch: Partial<typeof identity>) => patchSection(setData, "identity", patch);
  const bodyOptions = bodyFontsFor(identity.titleFont);
  useFontPreview();

  function setTitleFont(titleFont: string) {
    const allowed = bodyFontsFor(titleFont);
    set({ titleFont, bodyFont: allowed.includes(identity.bodyFont) ? identity.bodyFont : allowed[0] });
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block text-[13px] font-semibold text-charcoal">Layout</span>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_OPTIONS.map((option) => {
            const selected = option.value === identity.template;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => set({ template: option.value })}
                className={`group overflow-hidden rounded-xl border text-left transition ${
                  selected ? "border-tan ring-2 ring-tan/20" : "border-charcoal/10 hover:border-charcoal/25"
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden border-b border-charcoal/10">
                  <TemplateSketch template={option.value} color={identity.color} />
                  {selected ? (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-tan text-white shadow">
                      <CheckRounded sx={{ fontSize: 16 }} />
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                    {option.title}
                    {option.badge ? <span className="chip bg-gold/10 !py-0.5 text-gold">{option.badge}</span> : null}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-charcoal/55">{option.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[13px] font-semibold text-charcoal">Cor principal</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-charcoal/15 bg-surface pl-1.5 pr-3">
            <input
              type="color"
              value={identity.color}
              onChange={(event) => set({ color: event.target.value.toUpperCase() })}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Escolher cor"
            />
            <span className="font-mono text-sm uppercase text-charcoal/70">{identity.color}</span>
          </label>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Usar a cor ${color}`}
              onClick={() => set({ color })}
              className={`h-8 w-8 rounded-full border-2 transition ${
                identity.color.toUpperCase() === color ? "border-charcoal scale-110" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.12)]"
              }`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fonte dos títulos">
          <Select
            value={identity.titleFont}
            onChange={setTitleFont}
            options={Object.keys(TITLE_FONTS).map((font) => ({ value: font, label: font }))}
          />
        </Field>
        <Field label="Fonte dos textos" hint="Só aparecem combinações que ficam legíveis com o título escolhido.">
          <Select
            value={identity.bodyFont}
            onChange={(bodyFont) => set({ bodyFont })}
            options={bodyOptions.map((font) => ({ value: font, label: font }))}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-charcoal/10 bg-beige/50 p-5">
        <span className="eyebrow">Amostra</span>
        <p className="mt-2 text-3xl leading-tight text-charcoal" style={{ fontFamily: `'${identity.titleFont}', serif`, fontWeight: 700 }}>
          Conteúdo que faz a marca ser lembrada<span style={{ color: identity.color }}>.</span>
        </p>
        <p className="mt-2 text-[15px] leading-6 text-charcoal/65" style={{ fontFamily: `'${identity.bodyFont}', sans-serif` }}>
          Planejamento, captação e edição com um processo claro, para que cada vídeo tenha propósito e chegue no prazo.
        </p>
      </div>
    </div>
  );
}

interface PreviewStepProps extends StepProps {
  pages: ProposalPage[];
  onGoToSlide: (index: number) => void;
  onDownload: () => void;
  onOpenFull: () => void;
}

export function PreviewStep({ data, pages, onGoToSlide, onDownload, onOpenFull }: PreviewStepProps) {
  const videos = validVideos(data).length;
  const packages = data.investment.mode === "packages" ? data.investment.packages.length : 0;
  const missing: string[] = [];
  if (!data.client.company.trim() && !data.client.name.trim()) missing.push("nome ou empresa do cliente (etapa 01)");
  if (!data.company.name.trim() && !data.company.logo) missing.push("nome ou logo da sua empresa (etapa 02)");
  if (!videos) missing.push("vídeos do portfólio (etapa 06)");
  const zeroValue =
    data.investment.mode === "single"
      ? /^R\$\s*0,00$/.test(data.investment.single.value.trim())
      : data.investment.packages.some((pkg) => /^R\$\s*0,00$/.test(pkg.value.trim()));
  if (zeroValue) missing.push("valor do investimento (etapa 07)");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold text-charcoal">
          Sua proposta possui {pages.length} {pages.length === 1 ? "página" : "páginas"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="chip bg-tan/10 text-tan">Layout {TEMPLATE_NAMES[data.identity.template]}</span>
          <span className="chip bg-charcoal/[0.06] text-charcoal/70">{pages.length} páginas</span>
          <span className="chip bg-sage/10 text-sage">
            {videos} {videos === 1 ? "trabalho" : "trabalhos"}
          </span>
          {packages ? (
            <span className="chip bg-gold/10 text-gold">
              {packages} {packages === 1 ? "pacote" : "pacotes"}
            </span>
          ) : null}
        </div>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {pages.map((page, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => onGoToSlide(index)}
              className="flex w-full items-center gap-3 rounded-lg border border-charcoal/10 bg-surface px-3 py-2 text-left text-sm transition hover:border-tan/40 hover:bg-tan/[0.04]"
            >
              <span className="font-mono text-xs text-charcoal/40">{String(index + 1).padStart(2, "0")}</span>
              <span className="font-medium text-charcoal">{PAGE_LABELS[page.kind]}</span>
              {page.kind === "portfolio" && page.parts > 1 ? (
                <span className="text-xs text-charcoal/45">
                  {page.part}/{page.parts}
                </span>
              ) : null}
              {page.kind === "package" ? <span className="truncate text-xs text-charcoal/45">{page.pkg.name}</span> : null}
            </button>
          </li>
        ))}
      </ol>

      {missing.length ? (
        <Callout tone="warning">
          <strong>Antes de enviar, confira:</strong> {missing.join("; ")}.
        </Callout>
      ) : null}

      <div className="rounded-2xl border border-sage/25 bg-gradient-to-br from-sage/10 to-transparent p-5">
        <p className="text-base font-semibold text-charcoal">Pronto para enviar</p>
        <p className="mt-1 text-sm leading-6 text-charcoal/60">
          O arquivo HTML abre em qualquer navegador, no computador ou no celular. Envie por WhatsApp ou e-mail — o cliente
          navega pelas páginas com as setas e assiste aos vídeos direto na proposta. Para PDF, abra o arquivo e use
          Imprimir → Salvar como PDF.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={onDownload}>
            <DownloadRounded sx={{ fontSize: 18 }} />
            BAIXAR PROPOSTA HTML
          </button>
          <button type="button" className="btn-secondary" onClick={onOpenFull}>
            <OpenInNewRounded sx={{ fontSize: 18 }} />
            Abrir em tela cheia
          </button>
        </div>
      </div>
    </div>
  );
}
