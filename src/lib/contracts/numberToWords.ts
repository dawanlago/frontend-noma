const UNITS = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const unit = rest % 10;
      parts.push(unit ? `${TENS[Math.floor(rest / 10)]} e ${UNITS[unit]}` : TENS[Math.floor(rest / 10)]);
    }
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  const groups: { words: string; value: number }[] = [];
  if (billions) groups.push({ words: billions === 1 ? "um bilhão" : `${below1000(billions)} bilhões`, value: billions });
  if (millions) groups.push({ words: millions === 1 ? "um milhão" : `${below1000(millions)} milhões`, value: millions });
  if (thousands) groups.push({ words: thousands === 1 ? "mil" : `${below1000(thousands)} mil`, value: thousands });
  if (rest) groups.push({ words: below1000(rest), value: rest });

  return groups.reduce((text, group, index) => {
    if (index === 0) return group.words;
    const isLast = index === groups.length - 1;
    const useAnd = isLast && (group.value < 100 || group.value % 100 === 0);
    return `${text}${useAnd ? " e " : " "}${group.words}`;
  }, "");
}

/** Valor em reais por extenso: 1234.5 → "mil duzentos e trinta e quatro reais e cinquenta centavos". */
export function currencyToWords(value: number): string {
  const totalCents = Math.round(Math.abs(value) * 100);
  const integer = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  const parts: string[] = [];
  if (integer > 0) {
    const words = integerToWords(integer);
    const exactMillions = integer >= 1e6 && integer % 1e6 === 0;
    parts.push(`${words}${exactMillions ? " de" : ""} ${integer === 1 ? "real" : "reais"}`);
  }
  if (cents > 0) parts.push(`${below1000(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return parts.length ? parts.join(" e ") : "zero real";
}
