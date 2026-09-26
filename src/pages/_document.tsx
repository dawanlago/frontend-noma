import { Html, Head, Main, NextScript } from "next/document";
import { APPEARANCE_BOOT_SCRIPT } from "@/theme/appearance";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" type="image/png" sizes="64x64" href="/brand/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#731817" />
        {/* Aplica tema e cor salvos antes da primeira pintura. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
