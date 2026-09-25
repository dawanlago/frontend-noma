import { useState } from "react";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import Field from "@/components/tools/Field";
import { driveThumbnail, extractDriveId, parseDriveLinks } from "@/lib/proposals/drive";
import { uid } from "@/lib/proposals/model";
import { VIDEOS_PER_PAGE } from "@/lib/proposals/pages";
import { Callout, MoveControls, TextArea, TextInput, move, patchSection, type StepProps } from "./ui";

function Thumb({ id }: { id: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex aspect-video w-full flex-none items-center justify-center overflow-hidden rounded-lg bg-charcoal/90 sm:w-40">
      {id && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={driveThumbnail(id)}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-charcoal">
        <PlayArrowRounded sx={{ fontSize: 20 }} />
      </span>
      {!id ? (
        <span className="absolute inset-x-0 bottom-0 bg-burgundy/90 py-0.5 text-center text-[10px] font-semibold text-white">
          Link inválido
        </span>
      ) : null}
    </div>
  );
}

export default function PortfolioStep({ data, setData }: StepProps) {
  const intro = data.portfolioIntro;
  const setIntro = (patch: Partial<typeof intro>) => patchSection(setData, "portfolioIntro", patch);
  const [links, setLinks] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [added, setAdded] = useState(0);
  const items = data.portfolio;
  const setItems = (updater: (list: typeof items) => typeof items) =>
    setData((current) => ({ ...current, portfolio: updater(current.portfolio) }));

  function handleAdd() {
    const { valid, invalid: bad } = parseDriveLinks(links);
    setInvalid(bad);
    setAdded(valid.length);
    if (valid.length) {
      setItems((list) => {
        const existing = new Set(list.map((item) => extractDriveId(item.url)));
        const fresh = valid
          .filter((link) => !existing.has(link.id))
          .map((link, index) => ({
            id: uid(),
            url: link.url,
            title: `Trabalho ${String(list.length + index + 1).padStart(2, "0")}`,
            description: "",
          }));
        return [...list, ...fresh];
      });
    }
    setLinks(bad.join("\n"));
  }

  const validCount = items.filter((item) => extractDriveId(item.url)).length;
  const pages = Math.ceil(validCount / VIDEOS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Texto pequeno (acima do título)">
          <TextInput value={intro.eyebrow} onChange={(eyebrow) => setIntro({ eyebrow })} />
        </Field>
        <Field label="Título da abertura">
          <TextInput value={intro.title} onChange={(title) => setIntro({ title })} />
        </Field>
        <Field label="Texto de apresentação" full>
          <TextArea value={intro.text} onChange={(text) => setIntro({ text })} rows={2} />
        </Field>
      </div>

      <div className="rounded-xl border border-charcoal/10 bg-beige/50 p-4">
        <Field label="Links do Google Drive" hint="Cole um ou mais links, um por linha.">
          <TextArea
            value={links}
            onChange={setLinks}
            rows={3}
            placeholder={"https://drive.google.com/file/d/…/view\nhttps://drive.google.com/open?id=…"}
          />
        </Field>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={!links.trim()} onClick={handleAdd}>
            Adicionar vídeo(s)
          </button>
          {added ? <span className="chip bg-sage/10 text-sage">{added} link(s) reconhecido(s)</span> : null}
        </div>
        {invalid.length ? (
          <div className="mt-3 rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-3 py-2 text-[13px] text-burgundy">
            <p className="font-semibold">Não reconhecemos {invalid.length === 1 ? "este link" : "estes links"}:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {invalid.map((line, index) => (
                <li key={index} className="break-all">
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-charcoal/60">Use o link de compartilhamento de um arquivo (…/file/d/ID/… ou …?id=ID).</p>
          </div>
        ) : null}
        <div className="mt-3">
          <Callout>
            No Google Drive, deixe o arquivo como <strong>&quot;Qualquer pessoa com o link&quot; → Leitor</strong>. Sem isso o
            cliente não consegue assistir nem ver a miniatura.
          </Callout>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-charcoal">Vídeos ({items.length})</span>
          {validCount ? (
            <span className="text-xs text-charcoal/50">
              {pages} {pages === 1 ? "página" : "páginas"} de portfólio · até {VIDEOS_PER_PAGE} vídeos por página
            </span>
          ) : null}
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item, index) => {
              const id = extractDriveId(item.url);
              const update = (patch: Partial<typeof item>) =>
                setItems((list) => list.map((current) => (current.id === item.id ? { ...current, ...patch } : current)));
              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-charcoal/10 bg-white p-3 sm:flex-row">
                  <Thumb key={id || "invalid"} id={id} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <TextInput value={item.title} onChange={(title) => update({ title })} placeholder="Título do trabalho" />
                    <TextInput
                      value={item.description}
                      onChange={(description) => update({ description })}
                      placeholder="Descrição curta (opcional)"
                    />
                    <input
                      className={`input-search !py-1.5 text-xs ${id ? "text-charcoal/50" : "!border-burgundy/40 text-burgundy"}`}
                      value={item.url}
                      onChange={(event) => update({ url: event.target.value })}
                      aria-label="Link do Google Drive"
                    />
                  </div>
                  <div className="flex sm:flex-col">
                    <MoveControls
                      index={index}
                      length={items.length}
                      onMove={(to) => setItems((list) => move(list, index, to))}
                      onRemove={() => setItems((list) => list.filter((current) => current.id !== item.id))}
                      removeLabel="Remover vídeo"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-charcoal/15 px-4 py-6 text-center text-sm text-charcoal/50">
            Nenhum vídeo ainda. Cole os links acima para montar o portfólio.
          </p>
        )}
      </div>
    </div>
  );
}
