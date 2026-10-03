import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { apiError } from "@/lib/errors";
import { eventAvailability, formatDateKey, isValidEmail, isValidPhone, todayKey } from "@/lib/forms";
import { isInviteCode, resources } from "@/lib/resources";
import type { FormAvailability, FormField, PublicFormData } from "@/types";

type Answer = string | string[] | boolean;
/** -1 = boas-vindas; 0..n-1 = perguntas; n = enviado. */
type Step = number;

const NOMA_RED = "#731817";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Cor de destaque: a cor padrão da marca, se for escura o bastante; senão o vermelho da Noma. */
function accentColor(color?: string) {
  const hex = (color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return NOMA_RED;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.75 ? NOMA_RED : `#${hex}`;
}

function isEmpty(field: FormField, value: Answer | undefined) {
  if (field.type === "checkbox") return value !== true && value !== false;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value !== "string" || !value.trim();
}

function validate(field: FormField, value: Answer | undefined): string {
  if (isEmpty(field, value)) return field.required ? "Por favor, responda esta pergunta." : "";
  if (field.type === "email" && typeof value === "string" && !isValidEmail(value)) {
    return "Hmm, esse e-mail não parece válido.";
  }
  if (field.type === "phone" && typeof value === "string" && !isValidPhone(value)) {
    return "Informe um telefone válido com DDD, ex.: (11) 98888-7777.";
  }
  if (field.type === "checkbox" && field.required && value !== true) return "É preciso marcar “Sim” para continuar.";
  return "";
}

/** Sessão do preenchimento guardada no navegador: recarregar a página continua de onde parou. */
function sessionKey(publicId: string) {
  return `noma-form:${publicId}`;
}

function newSessionId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readSession(publicId: string, create: boolean) {
  try {
    const saved = window.localStorage.getItem(sessionKey(publicId)) || "";
    if (saved || !create) return saved;
    const id = newSessionId();
    window.localStorage.setItem(sessionKey(publicId), id);
    return id;
  } catch {
    // Navegador sem armazenamento (aba anônima, bloqueio): segue sem retomar depois.
    return create ? newSessionId() : "";
  }
}

function clearSession(publicId: string) {
  try {
    window.localStorage.removeItem(sessionKey(publicId));
  } catch {
    /* sem armazenamento */
  }
}

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Link do agendamento já com nome, e-mail e telefone respondidos no formulário. */
function schedulingHref(slug: string, fields: FormField[], answers: Record<string, unknown>) {
  const valueOf = (target: string) => {
    const field = fields.find((item) => item.target === target);
    const value = field ? answers[field.key] : "";
    return typeof value === "string" ? value : "";
  };
  const params = new URLSearchParams();
  if (valueOf("name")) params.set("nome", valueOf("name"));
  if (valueOf("email")) params.set("email", valueOf("email"));
  if (valueOf("phone")) params.set("telefone", valueOf("phone"));
  const query = params.toString();
  return `/agendar/${slug}${query ? `?${query}` : ""}`;
}

function Logo({ form }: { form: PublicFormData | null }) {
  return form?.brand?.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={form.brand.logo} alt={form.brand.companyName || "Noma"} className="max-h-10 max-w-[160px] object-contain" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/noma-vermelho.png" alt={form?.brand?.companyName || "Noma"} className="h-7 w-auto" />
  );
}

function EnterHint({ label = "Enter ↵" }: { label?: string }) {
  return (
    <span className="hidden text-xs text-charcoal/50 sm:inline">
      pressione <strong className="font-semibold text-charcoal/70">{label}</strong>
    </span>
  );
}

/** Página pública do formulário (sem login), no estilo conversacional: uma pergunta por vez. */
export default function PublicFormPage() {
  const router = useRouter();
  const publicId = typeof router.query.publicId === "string" ? router.query.publicId : "";
  const [form, setForm] = useState<PublicFormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [website, setWebsite] = useState("");
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<Step>(-1);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [fieldError, setFieldError] = useState("");
  const [sendError, setSendError] = useState("");
  const [done, setDone] = useState("");
  const [isSending, setIsSending] = useState(false);
  /** Pergunta onde a pessoa tinha parado (progresso salvo); 0 = começo. */
  const [resumeStep, setResumeStep] = useState(0);
  const sessionId = useRef("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const autoAdvance = useRef<number>(0);

  useEffect(() => {
    if (!publicId) return;
    resources.publicForms
      .get(publicId)
      .then(async (data) => {
        // Formulário enviado pela negociação: já vem com o que sabemos do contato (e o que já foi respondido).
        if (data.prefill) setAnswers((current) => ({ ...data.prefill, ...current }));
        if (isInviteCode(publicId)) {
          setResumeStep(data.lastStep || 0);
        } else {
          sessionId.current = readSession(publicId, false);
          const saved = sessionId.current ? await resources.publicForms.progress(publicId, sessionId.current).catch(() => null) : null;
          if (saved?.status === "partial") {
            setAnswers((current) => ({ ...saved.answers, ...current }));
            setResumeStep(saved.lastStep || 0);
          } else if (saved?.status === "complete") {
            // Já enviado deste navegador: um novo preenchimento começa do zero.
            clearSession(publicId);
            sessionId.current = "";
          }
        }
        setForm(data);
      })
      .catch(() => setLoadError("Este formulário não está disponível."));
  }, [publicId]);

  /** Salva o que já foi respondido; `at` = pergunta em que a pessoa está agora. Falhas não atrapalham quem responde. */
  const persist = useCallback(
    (current: Record<string, Answer>, at: number) => {
      if (!publicId || website) return;
      const invite = isInviteCode(publicId);
      if (!invite && !sessionId.current) sessionId.current = readSession(publicId, true);
      void resources.publicForms.saveProgress(publicId, { sessionId: sessionId.current, answers: current, step: at }).catch(() => undefined);
    },
    [publicId, website],
  );

  const fields = useMemo(() => form?.fields || [], [form]);
  const total = fields.length;
  const field = step >= 0 && step < total ? fields[step] : null;
  const accent = accentColor(form?.brand?.color);
  const answered = fields.filter((item) => !isEmpty(item, answers[item.key])).length;
  const progress = done ? 100 : total ? Math.round((answered / total) * 100) : 0;

  // Foca o campo de texto a cada pergunta nova.
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    return () => window.clearTimeout(timer);
  }, [step]);

  const go = useCallback(
    (next: Step) => {
      window.clearTimeout(autoAdvance.current);
      setDirection(next > step ? "up" : "down");
      setFieldError("");
      setSendError("");
      setStep(next);
    },
    [step],
  );

  const submit = useCallback(async () => {
    setIsSending(true);
    setSendError("");
    try {
      const result = await resources.publicForms.submit(publicId, answers, website, sessionId.current);
      if (!isInviteCode(publicId)) clearSession(publicId);
      setDirection("up");
      setDone(result.message || form?.successMessage || "Recebemos suas respostas. Obrigado!");
      setStep(total);
    } catch (err) {
      setSendError(apiError(err, "Não foi possível enviar. Tente de novo."));
    } finally {
      setIsSending(false);
    }
  }, [answers, form?.successMessage, publicId, total, website]);

  const next = useCallback(() => {
    if (step === -1) return go(0);
    if (!field) return;
    const message = validate(field, answers[field.key]);
    if (message) {
      setFieldError(message);
      return;
    }
    if (step === total - 1) return void submit();
    persist(answers, step + 1);
    go(step + 1);
  }, [answers, field, go, persist, step, submit, total]);

  function setAnswer(value: Answer) {
    if (!field) return;
    setFieldError("");
    setAnswers((current) => ({ ...current, [field.key]: value }));
  }

  function choose(option: string) {
    if (!field) return;
    if (field.type === "multiselect") {
      const list = Array.isArray(answers[field.key]) ? (answers[field.key] as string[]) : [];
      setAnswer(list.includes(option) ? list.filter((item) => item !== option) : [...list, option]);
      return;
    }
    const value: Answer = field.type === "checkbox" ? option === "Sim" : option;
    setAnswer(value);
    const nextAnswers = { ...answers, [field.key]: value };
    // Escolha única: confirma e avança sozinho, como no Typeform.
    window.clearTimeout(autoAdvance.current);
    const current = step;
    autoAdvance.current = window.setTimeout(() => {
      const message = validate(field, value);
      if (message) return setFieldError(message);
      if (current === total - 1) return;
      persist(nextAnswers, current + 1);
      setDirection("up");
      setStep(current + 1);
    }, 450);
  }

  // Atalhos: Enter avança; letras escolhem opções.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!form || done || form.status === "submitted") return;
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (event.key === "Enter" && !event.shiftKey) {
        // Botões comuns (Começar, OK) já respondem ao Enter sozinhos; nas opções, Enter confirma e avança.
        const role = target.getAttribute("role");
        if (target.tagName === "BUTTON" && role !== "radio" && role !== "checkbox") return;
        event.preventDefault();
        next();
        return;
      }
      if (!typing && field && ["select", "multiselect", "checkbox"].includes(field.type) && event.key.length === 1) {
        const options = field.type === "checkbox" ? ["Sim", "Não"] : field.options;
        const index = LETTERS.indexOf(event.key.toUpperCase());
        if (index >= 0 && index < options.length) choose(options[index]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const style = { "--accent": accent } as CSSProperties;

  return (
    <>
      <Head>
        <title>{form ? `${form.name} | Noma` : "Formulário | Noma"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        @keyframes tf-in-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
        @keyframes tf-in-down { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: none; } }
        .tf-up { animation: tf-in-up .5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .tf-down { animation: tf-in-down .5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) { .tf-up, .tf-down { animation: none; } }
      `}</style>

      <main style={style} className="relative flex min-h-[100dvh] flex-col bg-[#fbf9f7] text-charcoal">
        {/* Progresso */}
        <div className="fixed inset-x-0 top-0 z-10 h-1 bg-charcoal/[0.06]">
          <div className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <header className="flex items-center justify-between px-5 pt-5 sm:px-10 sm:pt-7">
          <Logo form={form} />
          {field ? (
            <span className="text-xs font-medium text-charcoal/45">
              {step + 1} de {total}
            </span>
          ) : null}
        </header>

        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-2xl">
            {!form && !loadError ? <div className="mx-auto h-40 w-full max-w-md animate-pulse rounded-2xl bg-charcoal/[0.05]" /> : null}
            {loadError ? <p className="text-center text-lg text-charcoal/60">{loadError}</p> : null}

            {/* Já respondido (formulário enviado pela negociação) */}
            {form && form.status === "submitted" && !done ? (
              <div className="tf-up">
                <p className="text-sm font-semibold text-[var(--accent)]">Formulário já preenchido</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{form.name}</h1>
                <p className="mt-2 text-charcoal/60">
                  {form.contactFirstName ? `${form.contactFirstName}, suas` : "Suas"} respostas já foram registradas.
                </p>
                <dl className="mt-8 space-y-3">
                  {(form.answers || []).map((answer) => (
                    <div key={answer.label} className="rounded-xl bg-surface px-4 py-3 shadow-soft">
                      <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-charcoal">{answer.value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {/* Boas-vindas */}
            {form && form.status !== "submitted" && step === -1 ? (
              <div key="welcome" className={direction === "up" ? "tf-up" : "tf-down"}>
                {form.contactFirstName ? <p className="mb-3 text-lg text-charcoal/60">Olá, {form.contactFirstName}!</p> : null}
                <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{form.name}</h1>
                {form.description ? <p className="mt-4 max-w-xl whitespace-pre-line text-lg text-charcoal/60 sm:text-xl">{form.description}</p> : null}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {resumeStep > 0 && resumeStep < total ? (
                    <>
                      <button
                        type="button"
                        onClick={() => go(resumeStep)}
                        className="rounded-xl bg-[var(--accent)] px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110 active:scale-[0.98]"
                      >
                        Continuar de onde parei
                      </button>
                      <button type="button" onClick={next} className="text-base font-semibold text-charcoal/60 underline-offset-4 hover:underline">
                        Revisar do começo
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={next}
                        className="rounded-xl bg-[var(--accent)] px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110 active:scale-[0.98]"
                      >
                        Começar
                      </button>
                      <EnterHint />
                    </>
                  )}
                </div>
                {total ? (
                  <p className="mt-6 text-sm text-charcoal/45">
                    {total} {total === 1 ? "pergunta" : "perguntas"} · leva uns {Math.max(1, Math.round(total * 0.3))} min
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Pergunta */}
            {form && field && !done ? (
              <div key={field.key} className={direction === "up" ? "tf-up" : "tf-down"}>
                <p className="flex items-start gap-3 text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
                  <span className="mt-1 flex shrink-0 items-center gap-1 text-base font-semibold text-[var(--accent)] sm:text-lg">
                    {step + 1}
                    <span aria-hidden>→</span>
                  </span>
                  <span>
                    {field.label}
                    {field.required ? <span className="text-[var(--accent)]"> *</span> : null}
                  </span>
                </p>
                {field.type === "multiselect" ? <p className="ml-9 mt-2 text-sm text-charcoal/50">Escolha quantas quiser</p> : null}
                {field.placeholder && !["text", "textarea", "email", "phone", "number", "checkbox"].includes(field.type) ? (
                  <p className="ml-9 mt-2 text-sm text-charcoal/50">{field.placeholder}</p>
                ) : null}

                <div className="ml-0 mt-8 sm:ml-9">
                  <QuestionInput
                    field={field}
                    value={answers[field.key]}
                    inputRef={inputRef}
                    onChange={setAnswer}
                    onChoose={choose}
                    onEnter={next}
                  />
                  {field.type === "eventDate" ? <EventDateNotice value={answers[field.key]} availability={form.availability} /> : null}
                </div>

                <div className="ml-0 mt-8 flex flex-wrap items-center gap-4 sm:ml-9">
                  <button
                    type="button"
                    onClick={next}
                    disabled={isSending}
                    className="rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                  >
                    {step === total - 1 ? (isSending ? "Enviando…" : "Enviar") : "OK ✓"}
                  </button>
                  {step === total - 1 ? <EnterHint label="Enter ↵" /> : field.type === "textarea" ? <EnterHint label="Shift + Enter ↵ para quebrar linha" /> : <EnterHint />}
                </div>
                {fieldError || sendError ? (
                  <p role="alert" className="ml-0 mt-4 inline-flex items-center gap-2 rounded-lg bg-[#fdecec] px-3 py-2 text-sm font-medium text-[#b42318] sm:ml-9">
                    ⚠ {fieldError || sendError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Enviado */}
            {form && done ? (
              <div key="done" className="tf-up text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-3xl text-white">✓</div>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Enviado!</h1>
                <p className="mx-auto mt-3 max-w-lg whitespace-pre-line text-lg text-charcoal/60">{done}</p>
                {form.schedulingSlug ? (
                  <a
                    href={schedulingHref(form.schedulingSlug, form.fields, answers)}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110"
                  >
                    Agendar a reunião →
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* Navegação */}
        {form && field && !done ? (
          <nav className="fixed bottom-5 right-5 flex overflow-hidden rounded-lg shadow-lg shadow-black/10" aria-label="Navegar entre as perguntas">
            <button
              type="button"
              aria-label="Pergunta anterior"
              onClick={() => go(step - 1)}
              className="flex h-10 w-10 items-center justify-center bg-[var(--accent)] text-white transition hover:brightness-110"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Próxima pergunta"
              onClick={next}
              className="flex h-10 w-10 items-center justify-center border-l border-white/20 bg-[var(--accent)] text-white transition hover:brightness-110"
            >
              ↓
            </button>
          </nav>
        ) : null}

        {/* Campo invisível para barrar robôs. */}
        <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />
      </main>
    </>
  );
}

/** "Faltam X dias" e, se a data cai na regra de indisponibilidade, o aviso (dá para enviar mesmo assim). */
function EventDateNotice({ value, availability }: { value: Answer | undefined; availability?: FormAvailability }) {
  const date = typeof value === "string" ? value : "";
  const info = eventAvailability(date, availability);
  if (!info) return null;
  const when =
    info.days < 0 ? `Essa data já passou (${formatDateKey(date)}).` : info.days === 0 ? "O evento é hoje!" : info.days === 1 ? "Falta 1 dia para o evento." : `Faltam ${info.days} dias para o evento.`;
  return (
    <div className="mt-5 space-y-3">
      <p className="text-lg font-medium text-charcoal/70">{when}</p>
      {info.unavailable ? (
        <p role="status" className="max-w-xl whitespace-pre-line rounded-xl border border-[#f5c2a8] bg-[#fff4ed] px-4 py-3 text-base text-[#9a3412]">
          ⚠ {availability?.message || "Infelizmente não temos disponibilidade para essa data."}
        </p>
      ) : null}
    </div>
  );
}

function QuestionInput({
  field,
  value,
  inputRef,
  onChange,
  onChoose,
  onEnter,
}: {
  field: FormField;
  value: Answer | undefined;
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChange: (value: Answer) => void;
  onChoose: (option: string) => void;
  onEnter: () => void;
}) {
  const text = typeof value === "string" ? value : "";
  const lineInput =
    "w-full border-0 border-b-2 border-charcoal/15 bg-transparent pb-2 text-2xl text-charcoal outline-none transition placeholder:text-charcoal/25 focus:border-[var(--accent)] sm:text-3xl";

  if (field.type === "select" || field.type === "multiselect" || field.type === "checkbox") {
    const options = field.type === "checkbox" ? ["Sim", "Não"] : field.options;
    const selected = (option: string) =>
      field.type === "multiselect"
        ? Array.isArray(value) && value.includes(option)
        : field.type === "checkbox"
          ? (option === "Sim" && value === true) || (option === "Não" && value === false)
          : value === option;
    return (
      <div className="grid max-w-md gap-2.5" role={field.type === "multiselect" ? "group" : "radiogroup"}>
        {options.map((option, index) => {
          const active = selected(option);
          return (
            <button
              key={option}
              type="button"
              role={field.type === "multiselect" ? "checkbox" : "radio"}
              aria-checked={active}
              onClick={() => onChoose(option)}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-lg transition active:scale-[0.99] ${
                active ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)]" : "border-charcoal/10 bg-surface hover:border-charcoal/25"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                  active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-charcoal/20 text-charcoal/60"
                }`}
              >
                {LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
              {active ? <span className="text-[var(--accent)]">✓</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        ref={(el) => {
          inputRef.current = el;
        }}
        rows={3}
        className={`${lineInput} resize-none`}
        value={text}
        placeholder={field.placeholder || "Escreva sua resposta aqui…"}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            onEnter();
          }
        }}
      />
    );
  }

  const type =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "number"
          ? "number"
          : field.type === "date" || field.type === "eventDate"
            ? "date"
            : "text";
  const placeholder =
    field.placeholder ||
    (field.type === "email" ? "nome@exemplo.com" : field.type === "phone" ? "(00) 00000-0000" : field.type === "number" ? "0" : "Escreva sua resposta aqui…");
  return (
    <input
      ref={(el) => {
        inputRef.current = el;
      }}
      className={lineInput}
      type={type}
      inputMode={field.type === "phone" ? "tel" : field.type === "number" ? "decimal" : undefined}
      value={text}
      placeholder={placeholder}
      min={field.type === "eventDate" ? todayKey() : undefined}
      onChange={(event) => onChange(field.type === "phone" ? maskPhone(event.target.value) : event.target.value)}
    />
  );
}
