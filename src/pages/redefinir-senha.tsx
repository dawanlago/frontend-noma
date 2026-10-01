import { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import AuthCard from "@/components/auth/AuthCard";
import { api } from "@/lib/api";
import { apiError } from "@/lib/errors";
import { MIN_PASSWORD, newPasswordError } from "@/lib/password";

/** Página aberta pelo link do e-mail: cria a senha nova. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = newPasswordError(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a senha. Tente novamente."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Nova senha | Noma</title>
      </Head>
      <AuthCard title={done ? "Senha alterada" : "Criar nova senha"} description={done ? undefined : `Escolha uma senha com pelo menos ${MIN_PASSWORD} caracteres.`}>
        {done ? (
          <div>
            <p className="text-sm text-charcoal/70">Pronto! Já pode entrar com a senha nova.</p>
            <Link href="/login" className="btn-primary mt-5 w-full">
              Ir para o login
            </Link>
          </div>
        ) : router.isReady && !token ? (
          <p className="text-sm text-charcoal/70">
            Link inválido. Peça um novo em{" "}
            <Link href="/esqueci-senha" className="font-semibold text-tan hover:underline">
              Esqueci a senha
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Nova senha
              <input
                className="input-search font-normal"
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Repita a nova senha
              <input
                className="input-search font-normal"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
            {error ? <p className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{error}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
