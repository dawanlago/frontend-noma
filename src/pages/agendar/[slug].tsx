import { FormEvent, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { HiOutlineCalendarDays, HiOutlineCheckCircle, HiOutlineClock, HiOutlineMapPin } from "react-icons/hi2";
import LogoMark from "@/components/ui/LogoMark";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import { accentFromHex, normalizeHex } from "@/theme/appearance";
import type { PublicSchedule } from "@/types";

const TZ = "America/Sao_Paulo";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const timeOf = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const longDay = (key: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`))
    .replace(/^./, (c) => c.toUpperCase());
const shortDay = (key: string) => {
  const date = new Date(`${key}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", ""),
    day: date.getUTCDate(),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", ""),
  };
};

/** Página pública (sem login): o lead escolhe dia e horário livres e confirma a reunião. */
export default function BookingPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";
  const [data, setData] = useState<PublicSchedule | null>(null);
  const [loadError, setLoadError] = useState("");
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; title: string; location: string } | null>(null);

  function load() {
    if (!slug) return;
    resources.publicSchedule
      .get(slug, undefined, 31)
      .then((result) => {
        setData(result);
        setDay((current) => current || (result.slots[0] ? dayKey(result.slots[0]) : ""));
      })
      .catch((err) => setLoadError(apiError(err, "Este link de agendamento não está disponível.")));
  }

  // Dados vindos do formulário (?nome=&email=&telefone=) já preenchem a confirmação.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    const pick = (key: string) => (typeof q[key] === "string" ? (q[key] as string) : "");
    setForm((current) => ({ ...current, name: pick("nome") || current.name, email: pick("email") || current.email, phone: pick("telefone") || current.phone }));
    load();
    // Carrega uma vez por link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, slug]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    (data?.slots || []).forEach((iso) => map.set(dayKey(iso), [...(map.get(dayKey(iso)) || []), iso]));
    return map;
  }, [data]);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      setDone(await resources.publicSchedule.book(slug, { start: slot, ...form }));
    } catch (err) {
      setError(apiError(err, "Não foi possível confirmar. Tente outro horário."));
      // Horário pego por outra pessoa: atualiza a lista.
      setSlot("");
      load();
    } finally {
      setBusy(false);
    }
  }

  const accent = normalizeHex(data?.brand.color || "");
  const style = accent ? ({ "--c-tan": accentFromHex(accent).light } as React.CSSProperties) : undefined;

  return (
    <>
      <Head>
        <title>{`${data?.title || "Agendar reunião"} | ${data?.brand.companyName || "Noma"}`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-beige px-4 py-10" style={style}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-8 flex justify-center">
            {data?.brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.brand.logo} alt={data.brand.companyName} className="max-h-14 w-auto max-w-[220px] object-contain" />
            ) : (
              <LogoMark size="md" withWordmark />
            )}
          </div>

          <div className="card overflow-hidden">
            {loadError ? (
              <div className="p-8">
                <h1 className="text-2xl font-semibold text-charcoal">Link indisponível</h1>
                <p className="mt-2 text-sm text-charcoal/60">{loadError}</p>
              </div>
            ) : !data ? (
              <p className="p-8 text-sm text-charcoal/50">Carregando horários...</p>
            ) : done ? (
              <div className="p-8 text-center">
                <HiOutlineCheckCircle className="mx-auto h-14 w-14 text-sage" />
                <h1 className="mt-3 text-2xl font-semibold text-charcoal">Reunião confirmada!</h1>
                <p className="mt-2 text-charcoal/70">
                  {done.title} · <strong>{longDay(dayKey(done.start))}</strong> às <strong>{timeOf(done.start)}</strong> (horário de Brasília)
                </p>
                {done.location ? <p className="mt-1 text-sm text-charcoal/55">Local: {done.location}</p> : null}
                <p className="mt-4 text-sm text-charcoal/55">{form.email ? `Enviamos a confirmação para ${form.email}.` : "Anote o horário: entraremos em contato."}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="border-b border-charcoal/[0.08] p-6 md:border-b-0 md:border-r">
                  {data.ownerName ? <p className="text-sm text-charcoal/55">{data.ownerName}</p> : null}
                  <h1 className="mt-1 text-xl font-semibold text-charcoal">{data.title}</h1>
                  <p className="mt-3 flex items-center gap-2 text-sm text-charcoal/65">
                    <HiOutlineClock className="h-4 w-4" /> {data.durationMinutes} minutos
                  </p>
                  {data.location ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-charcoal/65">
                      <HiOutlineMapPin className="h-4 w-4" /> {data.location}
                    </p>
                  ) : null}
                  {data.description ? <p className="mt-4 whitespace-pre-line text-sm leading-6 text-charcoal/70">{data.description}</p> : null}
                  <p className="mt-4 text-xs text-charcoal/45">Horários em Brasília.</p>
                </aside>

                <section className="p-6">
                  {!days.size ? (
                    <p className="text-sm text-charcoal/60">Nenhum horário livre nos próximos dias. Tente novamente mais tarde.</p>
                  ) : slot ? (
                    <form onSubmit={confirm} className="grid gap-4">
                      <button type="button" className="self-start text-sm font-semibold text-tan hover:underline" onClick={() => setSlot("")}>
                        ← Trocar horário
                      </button>
                      <p className="flex items-center gap-2 rounded-lg bg-tan/[0.08] px-3 py-2 text-sm text-charcoal">
                        <HiOutlineCalendarDays className="h-5 w-5 text-tan" />
                        <span>{longDay(dayKey(slot))}</span> às <strong>{timeOf(slot)}</strong>
                      </p>
                      <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
                        Seu nome *
                        <input className="input-search font-normal" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
                          E-mail
                          <input className="input-search font-normal" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </label>
                        <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
                          WhatsApp
                          <input className="input-search font-normal" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </label>
                      </div>
                      <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
                        Quer adiantar algo?
                        <textarea className="input-search min-h-[80px] font-normal" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      </label>
                      {error ? <p className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{error}</p> : null}
                      <button type="submit" className="btn-primary" disabled={busy || !form.name.trim() || (!form.email.trim() && !form.phone.trim())}>
                        {busy ? "Confirmando..." : "Confirmar reunião"}
                      </button>
                    </form>
                  ) : (
                    <>
                      {error ? <p className="mb-3 rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{error}</p> : null}
                      <p className="mb-3 text-sm font-semibold text-charcoal">Escolha o dia</p>
                      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                        {[...days.keys()].map((key) => {
                          const info = shortDay(key);
                          const active = key === day;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDay(key)}
                              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition ${
                                active ? "border-tan bg-tan text-white" : "border-charcoal/10 bg-surface text-charcoal hover:border-tan/50"
                              }`}
                            >
                              <span className="text-[11px] font-semibold uppercase opacity-80">{info.weekday}</span>
                              <span className="text-lg font-semibold">{info.day}</span>
                              <span className="text-[11px] opacity-80">{info.month}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mb-3 mt-5 text-sm font-semibold text-charcoal">{day ? longDay(day) : ""}</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {(days.get(day) || []).map((iso) => (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => setSlot(iso)}
                            className="rounded-lg border border-tan/40 py-2 text-sm font-semibold text-tan transition hover:bg-tan hover:text-white"
                          >
                            {timeOf(iso)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
