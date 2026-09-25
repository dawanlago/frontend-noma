import { useEffect, useState } from "react";
import Head from "next/head";
import { HiOutlineStar, HiOutlineTrash, HiStar } from "react-icons/hi2";
import LogoUpload from "@/components/contracts/LogoUpload";
import SettingsHeader from "@/components/settings/SettingsHeader";
import Field from "@/components/tools/Field";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { AppSettings } from "@/types";

export default function GeneralSettingsPage() {
  const { settings, setSettings } = useWorkspace();
  const [form, setForm] = useState<AppSettings | null>(settings);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) return <div className="skeleton h-96" />;

  const brand = form.brand;
  const setBrand = (changes: Partial<AppSettings["brand"]>) => setForm({ ...form, brand: { ...brand, ...changes } });

  function updateColor(index: number, changes: Partial<{ name: string; hex: string }>) {
    const colors = brand.colors.map((color, i) => (i === index ? { ...color, ...changes } : color));
    const wasDefault = brand.colors[index].hex === brand.defaultColor;
    setBrand({ colors, defaultColor: wasDefault && changes.hex ? changes.hex : brand.defaultColor });
  }

  function removeColor(index: number) {
    const colors = brand.colors.filter((_, i) => i !== index);
    const removedDefault = brand.colors[index].hex === brand.defaultColor;
    setBrand({ colors, defaultColor: removedDefault ? colors[0]?.hex || "#111111" : brand.defaultColor });
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setStatus("");
    try {
      const saved = await resources.settings.update(form);
      setSettings(saved);
      setForm(saved);
      setStatus("Configurações salvas.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Geral e identidade | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Geral e identidade visual"
        description="Como a produtora aparece no sistema, nas mensagens e nos documentos."
        actions={
          <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        }
      />
      {status ? <p className="mb-4 text-sm font-medium text-charcoal/70">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Produtora e frase de entrada</h2>
          <p className="mb-5 mt-1 text-sm text-charcoal/55">
            Use <code className="rounded bg-beige px-1">{"{nome}"}</code> para o primeiro nome de quem está logado.
          </p>
          <div className="grid gap-4">
            <Field label="Nome da produtora" hint="Aparece no topo do sistema e na apresentação das mensagens de prospecção.">
              <input className="input-search" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </Field>
            <Field label="Chamada acima do título (Início)">
              <input className="input-search" value={form.welcomeEyebrow} onChange={(e) => setForm({ ...form, welcomeEyebrow: e.target.value })} />
            </Field>
            <Field label="Frase de entrada">
              <textarea
                className="input-search min-h-[72px] resize-y"
                value={form.welcomeTitle}
                onChange={(e) => setForm({ ...form, welcomeTitle: e.target.value })}
              />
            </Field>
            <Field label="Texto de apoio">
              <textarea
                className="input-search min-h-[72px] resize-y"
                value={form.welcomeText}
                onChange={(e) => setForm({ ...form, welcomeText: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Identidade visual</h2>
          <p className="mb-5 mt-1 text-sm text-charcoal/55">
            Cores e logo usados no PDF do briefing. A cor marcada com estrela é a padrão dos documentos novos.
          </p>
          <LogoUpload value={brand.logo} onChange={(logo) => setBrand({ logo })} />
          <div className="space-y-2">
            {brand.colors.map((color, index) => {
              const isDefault = color.hex.toUpperCase() === brand.defaultColor.toUpperCase();
              return (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Cor"
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-charcoal/15 bg-white p-1"
                    value={color.hex}
                    onChange={(e) => updateColor(index, { hex: e.target.value.toUpperCase() })}
                  />
                  <input
                    className="input-search"
                    value={color.name}
                    placeholder="Nome da cor"
                    onChange={(e) => updateColor(index, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    className={`btn-ghost shrink-0 ${isDefault ? "text-gold" : ""}`}
                    title={isDefault ? "Cor padrão" : "Definir como padrão"}
                    aria-label="Definir como padrão"
                    onClick={() => setBrand({ defaultColor: color.hex })}
                  >
                    {isDefault ? <HiStar className="h-5 w-5" /> : <HiOutlineStar className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 hover:text-burgundy"
                    aria-label="Remover cor"
                    disabled={brand.colors.length <= 1}
                    onClick={() => removeColor(index)}
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => setBrand({ colors: [...brand.colors, { name: "Nova cor", hex: "#444444" }] })}
          >
            + Adicionar cor
          </button>
        </section>
      </div>
    </>
  );
}
