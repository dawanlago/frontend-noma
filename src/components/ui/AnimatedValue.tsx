import { useEffect, useRef, useState } from "react";

/** Primeiro número em formato brasileiro dentro do texto ("R$ -1.234,56", "67%", "12"). */
const NUMBER = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/;

function parse(text: string) {
  const match = text.match(NUMBER);
  if (!match || match.index === undefined) return null;
  const raw = match[0];
  const decimals = raw.includes(",") ? raw.split(",")[1].length : 0;
  const value = Number(raw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return null;
  return { value, decimals, prefix: text.slice(0, match.index), suffix: text.slice(match.index + raw.length) };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Curva "sai rápido, pousa suave" equivalente ao --ease-out do CSS. */
function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Mostra o valor contando do número anterior (ou de zero) até o atual,
 * preservando prefixo, sufixo e casas decimais. Sem animação para quem
 * pede "reduzir movimento".
 */
export default function AnimatedValue({ value, duration = 800 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const current = useRef(0);

  useEffect(() => {
    const target = parse(value);
    if (!target || prefersReducedMotion()) {
      setDisplay(value);
      if (target) current.current = target.value;
      return;
    }
    const from = current.current;
    const format = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: target.decimals,
      maximumFractionDigits: target.decimals,
    });
    if (from === target.value) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const number = from + (target.value - from) * easeOutExpo(progress);
      current.current = number;
      setDisplay(progress >= 1 ? value : `${target.prefix}${format.format(number)}${target.suffix}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  // O leitor de tela lê só o valor final.
  return (
    <span aria-label={value}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
