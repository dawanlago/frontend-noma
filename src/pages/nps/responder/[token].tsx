import { FormEvent, useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import LogoMark from "@/components/ui/LogoMark";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";

type PublicNps = Awaited<ReturnType<typeof resources.publicNps.get>>;

function scoreTone(value: number) {
  if (value <= 6) return "border-burgundy/20 bg-burgundy/10 text-burgundy hover:border-burgundy";
  if (value <= 8) return "border-gold/20 bg-gold/10 text-gold hover:border-gold";
  return "border-sage/20 bg-sage/10 text-sage hover:border-sage";
}

/** Página pública (sem login) onde o cliente responde o NPS. */
export default function NpsRespondPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [data, setData] = useState<PublicNps | null>(null);
  const [loadError, setLoadError] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) return;
    resources.publicNps
      .get(token)
      .then(setData)
      .catch((err) => setLoadError(apiError(err, "Este link de pesquisa é inválido.")));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === null) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await resources.publicNps.respond(token, rating, comment);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(apiError(err, "Não foi possível enviar a resposta."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const answered = data?.status === "answered" || submitted;

  return (
    <>
      <Head>
        <title>{`${data?.survey.name || "Pesquisa"} | Noma`}</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-beige px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex justify-center">
            <LogoMark size="md" withWordmark />
          </div>
          <div className="card p-7 sm:p-8">
            {!data && !loadError ? (
              <p className="text-sm text-charcoal/50">Carregando pesquisa...</p>
            ) : loadError || !data ? (
              <div>
                <h1 className="text-2xl font-semibold text-charcoal">Link inválido</h1>
                <p className="mt-2 text-sm text-charcoal/55">{loadError}</p>
              </div>
            ) : answered ? (
              <div className="text-center">
                <p className="eyebrow">Obrigado</p>
                <h1 className="mt-2 text-2xl font-semibold text-charcoal">{data.survey.thankYouMessage}</h1>
                <p className="mt-3 text-sm text-charcoal/50">Sua resposta foi registrada.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="eyebrow">{data.survey.name}</p>
                {data.contactFirstName ? <p className="mt-2 text-sm text-charcoal/55">Olá, {data.contactFirstName}!</p> : null}
                <h1 className="mt-2 text-2xl font-semibold leading-snug text-charcoal">{data.survey.question}</h1>
                <div className="mt-6 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`h-10 rounded-xl border text-sm font-semibold transition ${
                        rating === value ? "border-tan bg-tan text-white shadow-soft" : scoreTone(value)
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-charcoal/40">
                  <span>Pouco provável</span>
                  <span>Muito provável</span>
                </div>
                {data.survey.commentPrompt ? (
                  <label className="mt-6 block">
                    <span className="mb-1.5 block text-sm font-medium text-charcoal">{data.survey.commentPrompt}</span>
                    <textarea
                      className="input-search min-h-[110px]"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Opcional"
                    />
                  </label>
                ) : null}
                {submitError ? <p className="mt-4 rounded-xl bg-burgundy/10 px-3 py-2 text-sm text-burgundy">{submitError}</p> : null}
                <button type="submit" className="btn-primary mt-6 w-full" disabled={rating === null || isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar resposta"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
