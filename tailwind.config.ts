import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Cores em variáveis (globals.css): o tema escuro e a cor de destaque trocam só as variáveis.
      colors: {
        beige: "hsl(var(--c-beige) / <alpha-value>)",
        tan: "hsl(var(--c-tan) / <alpha-value>)",
        burgundy: "hsl(var(--c-burgundy) / <alpha-value>)",
        charcoal: "hsl(var(--c-ink) / <alpha-value>)",
        ink: "hsl(var(--c-ink) / <alpha-value>)",
        gold: "hsl(var(--c-gold) / <alpha-value>)",
        sage: "hsl(var(--c-sage) / <alpha-value>)",
        surface: "hsl(var(--c-surface) / <alpha-value>)",
        canvas: "hsl(var(--c-canvas) / <alpha-value>)",
        background: "hsl(var(--c-canvas) / <alpha-value>)",
        foreground: "hsl(var(--c-ink) / <alpha-value>)",
        mist: "hsl(var(--c-mist) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
        card: "none",
        lift: "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
        glow: "0 0 0 3px hsl(var(--c-tan) / 0.16)",
        nav: "none",
        inset: "none",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "0.75rem",
        "3xl": "0.75rem",
      },
      letterSpacing: {
        label: "0.12em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
