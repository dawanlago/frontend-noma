import { FormEvent, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { APP_NAME } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import LogoMark from "@/components/ui/LogoMark";
import Hero from "@/components/ui/Hero";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      await router.replace("/");
    } catch (submitError) {
      const message =
        (submitError as { response?: { data?: { error?: string } } }).response?.data
          ?.error || "Não foi possível entrar. Tente novamente.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Entrar | Noma CRM</title>
      </Head>

      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" },
        }}
      >
        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            px: 8,
            py: 8,
          }}
        >
          <LogoMark size="md" withWordmark />
          <Hero
            compact
            eyebrow="Studio de marketing"
            title={
              <>
                Campanhas, funil e caixa{" "}
                <Box component="span" sx={{ color: "primary.main" }}>
                  no mesmo ritmo.
                </Box>
              </>
            }
            description={`O ${APP_NAME} entrega o painel comercial da operação: leads, dossiê, compromissos e ROI em uma interface feita para agência.`}
          />
          <Box
            sx={{
              mt: 2,
              width: "100%",
              maxWidth: 640,
              height: 280,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              outline: "6px solid hsla(220, 25%, 80%, 0.2)",
              boxShadow: "0 0 12px 8px hsla(220, 25%, 80%, 0.2)",
              backgroundImage:
                "linear-gradient(180deg, hsl(210, 100%, 97%), hsl(220, 30%, 96%)), radial-gradient(circle at 20% 20%, hsl(210, 100%, 90%), transparent 40%)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box sx={{ position: "absolute", inset: 24, display: "grid", gridTemplateColumns: "72px 1fr", gap: 2 }}>
              <Box sx={{ bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
              <Stack spacing={1.5}>
                <Box sx={{ height: 18, width: "40%", bgcolor: "primary.light", borderRadius: 1 }} />
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
                  {[0, 1, 2].map((item) => (
                    <Box key={item} sx={{ height: 72, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
                  ))}
                </Box>
                <Box sx={{ height: 110, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
              </Stack>
            </Box>
          </Box>
        </Box>

        <Stack sx={{ alignItems: "center", justifyContent: "center", px: 2, py: 8 }}>
          <Box sx={{ width: "100%", maxWidth: 450 }}>
            <Box sx={{ mb: 3, display: { lg: "none" } }}>
              <LogoMark size="md" withWordmark />
            </Box>
            <Card
              variant="outlined"
              sx={{
                boxShadow:
                  "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  Entrar
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Continue a operação comercial de onde parou.
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <FormLabel sx={{ mb: 0.75, fontWeight: 600, color: "text.primary" }}>E-mail</FormLabel>
                    <TextField
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="seu@e-mail.com"
                      autoComplete="email"
                      required
                      fullWidth
                    />
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <FormLabel sx={{ mb: 0.75, fontWeight: 600, color: "text.primary" }}>Senha</FormLabel>
                    <TextField
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      fullWidth
                    />
                  </FormControl>
                  {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
                  <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? "Entrando..." : "Entrar no painel"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
