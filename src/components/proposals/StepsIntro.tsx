import { useRef, useState } from "react";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import Field from "@/components/tools/Field";
import {
  IMAGE_QUALITY,
  LOGO_MAX_WIDTH,
  MAX_STRUCTURE_IMAGES,
  STRUCTURE_MAX_WIDTH,
} from "@/lib/proposals/model";
import { uploadImage } from "@/lib/upload";
import {
  AddButton,
  Callout,
  MoveControls,
  SmallIconButton,
  StringListEditor,
  TextArea,
  TextInput,
  Toggle,
  move,
  patchSection,
  type StepProps,
} from "./ui";

export function ClientStep({ data, setData }: StepProps) {
  const client = data.client;
  const set = (patch: Partial<typeof client>) => patchSection(setData, "client", patch);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome do cliente" hint="Pessoa que vai receber a proposta.">
        <TextInput value={client.name} onChange={(name) => set({ name })} placeholder="Ex.: Mariana Souza" />
      </Field>
      <Field label="Empresa do cliente" hint="Aparece na capa e dá nome à proposta salva.">
        <TextInput value={client.company} onChange={(company) => set({ company })} placeholder="Ex.: Clínica Aurora" />
      </Field>
      <Field label="Título da proposta" full>
        <TextInput value={client.title} onChange={(title) => set({ title })} placeholder="Proposta Comercial" />
      </Field>
      <Field label="Data">
        <input type="date" className="input-search" value={client.date} onChange={(event) => set({ date: event.target.value })} />
      </Field>
      <Field label="Validade da proposta">
        <TextInput value={client.validity} onChange={(validity) => set({ validity })} placeholder="7 dias" />
      </Field>
    </div>
  );
}

export function CompanyStep({ data, setData }: StepProps) {
  const company = data.company;
  const set = (patch: Partial<typeof company>) => patchSection(setData, "company", patch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      set({ logo: await uploadImage(file, "propostas", LOGO_MAX_WIDTH, IMAGE_QUALITY) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a imagem.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const metrics = company.metrics;
  const setMetrics = (next: typeof metrics) => set({ metrics: next });

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Logo</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-full max-w-[280px] overflow-hidden rounded-xl border border-charcoal/10">
            <div className="flex flex-1 items-center justify-center bg-[#0B0B0C] p-3">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-white/40">Sem logo</span>
              )}
            </div>
            <div className="flex flex-1 items-center justify-center bg-[#F4F2EE] p-3">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-charcoal/35">Sem logo</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleLogo(event.target.files?.[0])}
            />
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              <CloudUploadOutlined sx={{ fontSize: 18 }} />
              {busy ? "Processando…" : company.logo ? "Trocar logo" : "Enviar logo"}
            </button>
            {company.logo ? (
              <button type="button" className="text-left text-sm text-burgundy" onClick={() => set({ logo: "" })}>
                Remover logo
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-charcoal/50">
          Prefira PNG com fundo transparente — a transparência é mantida. A prévia mostra como fica em fundo escuro e claro.
        </p>
        {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da empresa">
          <TextInput value={company.name} onChange={(name) => set({ name })} placeholder="Ex.: Studio Norte" />
        </Field>
        <Field label="Site">
          <TextInput value={company.site} onChange={(site) => set({ site })} placeholder="www.seusite.com.br" />
        </Field>
        <Field label="Instagram">
          <TextInput value={company.instagram} onChange={(instagram) => set({ instagram })} placeholder="@suaempresa" />
        </Field>
        <Field label="WhatsApp">
          <TextInput value={company.whatsapp} onChange={(whatsapp) => set({ whatsapp })} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Frase de apresentação" full>
          <TextArea value={company.tagline} onChange={(tagline) => set({ tagline })} rows={2} />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Indicadores</span>
        <p className="mb-3 text-xs text-charcoal/50">Números que passam confiança: tempo de mercado, projetos entregues, clientes atendidos…</p>
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="w-full sm:w-36">
                <TextInput
                  value={metric.value}
                  placeholder="+120"
                  onChange={(value) => setMetrics(metrics.map((m, i) => (i === index ? { ...m, value } : m)))}
                />
              </div>
              <div className="min-w-0 flex-1">
                <TextInput
                  value={metric.label}
                  placeholder="projetos entregues"
                  onChange={(label) => setMetrics(metrics.map((m, i) => (i === index ? { ...m, label } : m)))}
                />
              </div>
              <MoveControls
                index={index}
                length={metrics.length}
                onMove={(to) => setMetrics(move(metrics, index, to))}
                onRemove={() => setMetrics(metrics.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <AddButton onClick={() => setMetrics([...metrics, { value: "", label: "" }])} disabled={metrics.length >= 6}>
            Adicionar indicador
          </AddButton>
        </div>
      </div>
    </div>
  );
}

export function StructureStep({ data, setData }: StepProps) {
  const structure = data.structure;
  const set = (patch: Partial<typeof structure>) => patchSection(setData, "structure", patch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const remaining = MAX_STRUCTURE_IMAGES - structure.images.length;

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const files = Array.from(list).filter((file) => file.type.startsWith("image/"));
    const accepted = files.slice(0, Math.max(0, remaining));
    if (files.length > accepted.length) setError(`Limite de ${MAX_STRUCTURE_IMAGES} imagens. Algumas não foram adicionadas.`);
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of accepted) urls.push(await uploadImage(file, "propostas", STRUCTURE_MAX_WIDTH, IMAGE_QUALITY));
      setData((current) => ({
        ...current,
        structure: { ...current.structure, images: [...current.structure.images, ...urls].slice(0, MAX_STRUCTURE_IMAGES) },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as imagens.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <Toggle
        checked={structure.enabled}
        onChange={(enabled) => set({ enabled })}
        label="Mostrar página de estrutura"
        description="Fotos do escritório, estúdio ou equipamentos."
      />
      <div className={structure.enabled ? "space-y-5" : "pointer-events-none space-y-5 opacity-40"}>
        <Field label="Título da página">
          <TextInput value={structure.title} onChange={(title) => set({ title })} placeholder="Nosso escritório" />
        </Field>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-charcoal">
              Imagens <span className="font-normal text-charcoal/45">({structure.images.length}/{MAX_STRUCTURE_IMAGES})</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <button
              type="button"
              className="btn-secondary !py-2"
              disabled={busy || remaining <= 0}
              onClick={() => fileRef.current?.click()}
            >
              <CloudUploadOutlined sx={{ fontSize: 18 }} />
              {busy ? "Processando…" : "Enviar imagens"}
            </button>
          </div>
          {structure.images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {structure.images.map((src, index) => (
                <div key={index} className="group relative overflow-hidden rounded-xl border border-charcoal/10 bg-beige">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Imagem ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {index === 0 ? "Destaque" : String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                    <div className="flex gap-1">
                      <SmallIconButton
                        label="Mover para a esquerda"
                        disabled={index === 0}
                        onClick={() => set({ images: move(structure.images, index, index - 1) })}
                      >
                        <ArrowBackRounded sx={{ fontSize: 16 }} />
                      </SmallIconButton>
                      <SmallIconButton
                        label="Mover para a direita"
                        disabled={index === structure.images.length - 1}
                        onClick={() => set({ images: move(structure.images, index, index + 1) })}
                      >
                        <ArrowForwardRounded sx={{ fontSize: 16 }} />
                      </SmallIconButton>
                    </div>
                    <SmallIconButton
                      label="Remover imagem"
                      tone="danger"
                      onClick={() => set({ images: structure.images.filter((_, i) => i !== index) })}
                    >
                      <CloseRounded sx={{ fontSize: 16 }} />
                    </SmallIconButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal/20 bg-beige/50 px-4 py-10 text-sm text-charcoal/55 transition hover:border-tan/40 hover:text-tan"
            >
              <CloudUploadOutlined />
              Clique para enviar até {MAX_STRUCTURE_IMAGES} fotos
            </button>
          )}
          <p className="mt-2 text-xs text-charcoal/50">
            A primeira imagem ganha destaque no layout. As fotos são reduzidas automaticamente para não pesar o arquivo.
          </p>
          {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ExperienceStep({ data, setData }: StepProps) {
  const experience = data.experience;
  const set = (patch: Partial<typeof experience>) => patchSection(setData, "experience", patch);
  return (
    <div className="space-y-5">
      <Toggle
        checked={experience.enabled}
        onChange={(enabled) => set({ enabled })}
        label="Mostrar página de experiência"
        description="Um número forte que resume sua trajetória com clientes."
      />
      <div className={`grid gap-4 sm:grid-cols-2 ${experience.enabled ? "" : "pointer-events-none opacity-40"}`}>
        <Field label="Número em destaque">
          <TextInput value={experience.number} onChange={(number) => set({ number })} placeholder="+30" maxLength={10} />
        </Field>
        <Field label="Complemento do número">
          <TextInput value={experience.description} onChange={(description) => set({ description })} placeholder="parceiros ativos." />
        </Field>
        <Field label="Título" full>
          <TextInput value={experience.title} onChange={(title) => set({ title })} />
        </Field>
        <Field label="Texto de apoio" hint="Opcional. Cite segmentos atendidos ou marcas conhecidas." full>
          <TextArea value={experience.text} onChange={(text) => set({ text })} rows={3} />
        </Field>
      </div>
    </div>
  );
}

export function ObjectivesStep({ data, setData }: StepProps) {
  const objectives = data.objectives;
  const set = (patch: Partial<typeof objectives>) => patchSection(setData, "objectives", patch);
  return (
    <div className="space-y-5">
      <Field label="Título da página">
        <TextArea value={objectives.title} onChange={(title) => set({ title })} rows={2} />
      </Field>
      <div>
        <span className="mb-2 block text-[13px] font-semibold text-charcoal">Objetivos</span>
        <StringListEditor
          items={objectives.items}
          onChange={(items) => set({ items })}
          placeholder="Ex.: Gerar autoridade."
          addLabel="Adicionar objetivo"
          max={12}
        />
      </div>
      <Callout>Dica: frases curtas funcionam melhor. Entre 4 e 8 itens o layout fica mais equilibrado.</Callout>
    </div>
  );
}
