import Head from "next/head";
import Link from "next/link";
import ListWorkspace from "@/components/ui/ListWorkspace";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { formatCurrencyBRL } from "@/utils/format";

export default function SettingsSpecificDealsPage() {
  const { data: deals, isLoading, error } = useAsyncData(() => resources.deals.list());

  return (
    <>
      <Head><title>Negociações específicas | Configurações | Noma CRM</title></Head>
      <ListWorkspace
        title="Negociações específicas"
        countLabel={`Existem ${deals?.length || 0} negociações na sua base`}
        columns={["Negociação", "Funil", "Valor"]}
        emptyMessage="Não existem negociações específicas salvas na sua base."
        isLoading={isLoading}
        error={error}
      >
        {(deals || []).map((deal) => (
          <tr key={deal._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">
              <Link href={`/funis/${deal.funnelId}/negociacao/${deal._id}`} className="text-tan hover:underline">
                {deal.title}
              </Link>
            </td>
            <td className="px-4 py-3">{deal.funnelId}</td>
            <td className="px-4 py-3">{formatCurrencyBRL(deal.value)}</td>
          </tr>
        ))}
      </ListWorkspace>
    </>
  );
}
