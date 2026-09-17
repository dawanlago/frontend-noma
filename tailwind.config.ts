import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: "hsl(220, 35%, 97%)",
        tan: "hsl(210, 98%, 48%)",
        burgundy: "hsl(0, 90%, 40%)",
        charcoal: "hsl(220, 30%, 6%)",
        ink: "hsl(220, 30%, 6%)",
        gold: "hsl(45, 90%, 40%)",
        sage: "hsl(120, 44%, 53%)",
        surface: "#ffffff",
        canvas: "hsl(0, 0%, 99%)",
        background: "hsl(0, 0%, 99%)",
        foreground: "hsl(220, 30%, 6%)",
        mist: "hsl(220, 20%, 88%)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
        card: "none",
        lift: "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
        glow: "0 0 0 3px hsla(210, 98%, 48%, 0.16)",
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
    },
  },
  plugins: [],
};

export default config;
