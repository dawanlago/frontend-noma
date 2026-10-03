import { useEffect, useState } from "react";
import Head from "next/head";
import { HiXMark } from "react-icons/hi2";
import SettingsHeader from "@/components/settings/SettingsHeader";
import Field from "@/components/tools/Field";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { WeeklyReportSettings } from "@/types";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Relatório semanal por e-mail da empresa ativa: dia, hora e destinatários. */
export default function WeeklyReportSettingsPage() {
  const { settings, setSettings } = useWorkspace();
  const [form, setForm] = useState<WeeklyReportSettings>({ enabled: false, recipients: [], weekday: 1, hour: 8 });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings?.weeklyReport) setForm(settings.weeklyReport);
  }, [settings]);

  function addEmail() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setStatus("E-mail inválido.");
    if (!form.recipients.includes(value)) setForm({ ...form, recipients: [...form.recipients, value] });
    setEmail("");
    setStatus("");
  }

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      setSettings(await resources.settings.update({ weeklyReport: { ...form } }));
      setStatus("Salvo.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  async function test(toMe: boolean) {
    setBusy(true);
    setStatus("");
    try {
      await resources.weeklyReport.test(toMe);
      setStatus(toMe ? "Relatório de teste enviado para o seu e-mail." : "Relatório enviado para os destinatários.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível enviar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Relatório semanal | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Relatório semanal"
        description="Toda semana, no dia e hora escolhidos, chega por e-mail: negociações criadas, em andamento (e valor), vendas realizadas, valor vendido e perdidas nos últimos 7 dias."
      />
      <section className="card grid max-w-2xl gap-5 p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          Enviar o relatório semanal desta empresa
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dia">
            <Select value={String(form.weekday)} onChange={(value) => setForm({ ...form, weekday: Number(value) })} options={WEEKDAYS.map((label, value) => ({ value: String(value), label }))} />
          </Field>
          <Field label="Horário (Brasília)" hint="Sai na primeira verificação a partir desse horário.">
            <Select
              value={String(form.hour)}
              onChange={(value) => setForm({ ...form, hour: Number(value) })}
              options={Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: `${String(hour).padStart(2, "0")}:00` }))}
            />
          </Field>
        </div>
        <Field label="Destinatários" hint="Sem destinatários, vai para os administradores da empresa.">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.recipients.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-tan/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-tan">
                  {item}
                  <button type="button" aria-label={`Remover ${item}`} className="rounded-full p-0.5 hover:bg-tan/20" onClick={() => setForm({ ...form, recipients: form.recipients.filter((value) => value !== item) })}>
                    <HiXMark className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-search"
                type="email"
                value={email}
                placeholder="nome@empresa.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={addEmail}>
                Adicionar
              </button>
            </div>
          </div>
        </Field>
        {form.lastSentAt ? <p className="text-xs text-charcoal/50">Último envio: {new Date(form.lastSentAt).toLocaleString("pt-BR")}</p> : null}
        {status ? <p className={`text-sm ${status === "Salvo." || status.startsWith("Relatório") ? "text-sage" : "text-burgundy"}`}>{status}</p> : null}
        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void test(true)}>
            Enviar um teste para mim
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>
    </>
  );
}
