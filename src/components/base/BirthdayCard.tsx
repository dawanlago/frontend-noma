import Link from "next/link";
import { HiOutlineCake } from "react-icons/hi2";
import type { Birthday } from "@/types";
import { whatsappLink } from "@/utils/format";

function when(days: number) {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
}

function dayMonth(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

/** Contatos que fazem aniversário nos próximos dias, com atalho para mandar os parabéns. */
export default function BirthdayCard({ birthdays }: { birthdays: Birthday[] }) {
  if (!birthdays.length) return null;
  return (
    <section className="card mb-8 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <HiOutlineCake className="h-5 w-5 text-tan" />
        <h2 className="text-base font-semibold text-charcoal">Aniversariantes</h2>
        <span className="text-sm text-charcoal/50">próximos 15 dias</span>
      </div>
      <ul className="divide-y divide-charcoal/5">
        {birthdays.map((person) => {
          const firstName = person.name.split(" ")[0];
          const message = encodeURIComponent(`Oi, ${firstName}! Feliz aniversário! 🎉 Muita saúde e sucesso.`);
          return (
            <li key={person._id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span
                className={`w-20 shrink-0 text-xs font-semibold ${person.daysUntil === 0 ? "text-sage" : "text-charcoal/50"}`}
              >
                {when(person.daysUntil)}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/contatos/${person._id}`} className="text-sm font-medium text-charcoal hover:underline">
                  {person.name}
                </Link>
                <p className="text-xs text-charcoal/50">
                  {dayMonth(person.date)} · faz {person.age} anos
                </p>
              </div>
              {person.phone ? (
                <a
                  href={`${whatsappLink(person.phone)}?text=${message}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-1 text-xs"
                >
                  Mandar parabéns
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
