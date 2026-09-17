import Head from "next/head";
import Link from "next/link";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Hero from "@/components/ui/Hero";
import MetricCard from "@/components/ui/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { formatCurrencyBRL } from "@/utils/format";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, error } = useAsyncData(() => resources.dashboard());
  const { data: funnels } = useAsyncData(() => resources.funnels.list());
  const greeting = greetingForHour(new Date().getHours());
  const firstName = (user?.name || "Lai").split(" ")[0];
  const firstFunnelHref =
    funnels?.length === 1 && funnels[0]?._id ? `/funis/${funnels[0]._id}` : "/funis";
  const canViewFinance = isAdmin && Boolean(data?.canViewFinance);
  const income = data?.monthlyIncome ?? 0;
  const expense = data?.monthlyExpense ?? 0;
  const cashflow = income + expense || 1;

  return (
    <>
      <Head><title>Dashboard | Noma CRM</title></Head>

      <Hero
        compact
        eyebrow="Central comercial"
        title={
          <>
            {greeting}, {firstName}.
          </>
        }
        description={
          data
            ? `Há ${data.openDeals} oportunidades abertas e ${formatCurrencyBRL(data.pipelineValue)} no funil agora.`
            : "Atualizando o ritmo comercial do dia..."
        }
        actions={
          <>
            {error ? (
              <Alert severity="error">Erro ao carregar métricas</Alert>
            ) : (
              <Chip
                color={isLoading ? "default" : "success"}
                variant="outlined"
                label={isLoading ? "Sincronizando" : "Ao vivo"}
              />
            )}
            <Button component={Link} href={firstFunnelHref} variant="contained">
              {funnels && funnels.length > 1 ? "Escolher funil" : "Abrir pipeline"}
            </Button>
          </>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(4, 1fr)" },
        }}
      >
        <MetricCard label="Negociações abertas" value={String(data?.openDeals ?? 0)} hint="Pipeline atual" icon={<ViewKanbanOutlined />} />
        <MetricCard label="Valor em funil" value={formatCurrencyBRL(data?.pipelineValue ?? 0)} hint="Soma das oportunidades" tone="gold" icon={<PaymentsOutlined />} />
        <MetricCard label="Empresas ativas" value={String(data?.activeCompanies ?? 0)} hint="Clientes com fechamento" icon={<BusinessOutlined />} />
        <MetricCard label="NPS médio" value={data?.averageNps != null ? data.averageNps.toFixed(1) : "—"} hint="Últimos 90 dias" tone="sage" icon={<StarOutlined />} />
      </Box>

      <Box
        sx={{
          mt: 3,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", xl: canViewFinance ? "1.2fr 0.8fr" : "1fr" },
        }}
      >
        {canViewFinance ? (
          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 3, justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>Caixa do mês</Typography>
                  <Typography variant="h6">Financeiro em movimento</Typography>
                </Box>
                <Button component={Link} href="/financeiro" size="small">Ver extrato</Button>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (income / cashflow) * 100)}
                sx={{ height: 8, borderRadius: 99, mb: 2.5 }}
              />
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Entradas</Typography>
                  <Typography variant="h6" color="success.main">{formatCurrencyBRL(income)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Saídas</Typography>
                  <Typography variant="h6" color="error.main">{formatCurrencyBRL(expense)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Saldo</Typography>
                  <Typography variant="h6">{formatCurrencyBRL(data?.monthlyBalance ?? 0)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : null}

        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>Pipeline</Typography>
                <Typography variant="h6">Funis ativos</Typography>
              </Box>
              <Chip label={funnels?.length || 0} size="small" color="primary" variant="outlined" />
            </Stack>
            <Stack spacing={1}>
              {(funnels || []).length === 0 ? (
                <Typography color="text.secondary">Nenhum funil cadastrado ainda.</Typography>
              ) : (
                (funnels || []).slice(0, 4).map((funnel) => (
                  <Button
                    key={funnel._id}
                    component={Link}
                    href={`/funis/${funnel._id}`}
                    fullWidth
                    sx={{ justifyContent: "space-between", px: 1.5, py: 1.25, bgcolor: "grey.50", color: "text.primary" }}
                    endIcon={<ArrowForwardRounded color="primary" />}
                  >
                    <Box sx={{ textAlign: "left" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{funnel.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{funnel.stages.length} etapas</Typography>
                    </Box>
                  </Button>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>Atividade</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>Negociações recentes</Typography>
          {(data?.recentDeals || []).length === 0 ? (
            <Typography color="text.secondary">Nenhuma negociação registrada ainda.</Typography>
          ) : (
            data?.recentDeals.map((deal) => (
              <Box
                key={deal._id}
                component={Link}
                href={`/funis/${deal.funnelId}/negociacao/${deal._id}`}
                sx={{
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{deal.title}</Typography>
                  <Typography variant="caption" color="text.secondary">Oportunidade no funil</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{formatCurrencyBRL(deal.value)}</Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
