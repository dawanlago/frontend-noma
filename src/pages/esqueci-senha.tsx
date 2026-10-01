import { FormEvent, useState } from "react";
import Head from "next/head";
import AuthCard from "@/components/auth/AuthCard";
import { api } from "@/lib/api";
import { apiError } from "@/lib/errors";

/** "Esqueci a senha": pede o e-mail e manda o link de redefinição. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiError(err, "Não foi possível enviar o e-mail. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Esqueci a senha | Noma</title>
      </Head>
      <AuthCard
        title={sent ? "Confira o seu e-mail" : "Esqueci a senha"}
        description={sent ? undefined : "Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova."}
      >
        {sent ? (
          <p className="text-sm leading-6 text-charcoal/70">
            Se existir uma conta com <strong className="text-charcoal">{email}</strong>, o link para criar uma senha nova chega em instantes. Ele vale por 1
            hora. Não achou? Olhe a caixa de spam.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              E-mail
              <input
                className="input-search font-normal"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="seu@e-mail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {error ? <p className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{error}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
