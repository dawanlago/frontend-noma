import { useEffect, useState } from "react";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { apiError } from "@/lib/errors";
import { MIN_PASSWORD, newPasswordError } from "@/lib/password";

/** Usuário logado troca a própria senha (confirma a atual). */
export default function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setPassword("");
    setConfirm("");
    setError("");
    setDone(false);
  }, [open]);

  async function save() {
    const invalid = newPasswordError(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(apiError(err, "Não foi possível alterar a senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar senha"
      description={done ? undefined : `A senha nova precisa ter pelo menos ${MIN_PASSWORD} caracteres.`}
      footer={
        done ? (
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={busy || !current || !password} onClick={() => void save()}>
              {busy ? "Salvando..." : "Salvar senha"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm text-charcoal/70">Senha alterada. Nos próximos acessos, use a senha nova.</p>
      ) : (
        <form
          className="grid gap-4 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Field label="Senha atual">
            <input className="input-search" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nova senha">
            <input className="input-search" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Repita a nova senha">
            <input className="input-search" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-burgundy">{error}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      )}
    </Modal>
  );
}
