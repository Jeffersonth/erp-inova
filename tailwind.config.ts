import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // shadcn/ui semantic tokens (mapped to Inova Labs light theme)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },

        // Identidade solar — contraste de texto preservado nas superfícies claras.
        brand: { DEFAULT: "#C51E72", dark: "#A81760" },
        aqua: "#C2410C",
        ok: "#0E9F6E",
        danger: "#E5484D",
        warn: "#C77700",
        ia: "#B42369",
        navy: "#140D24",
        ink: "#20182D",
        mut: { DEFAULT: "#796A85", soft: "#8C7B98" },
        line: "#EBE5EF",
        soft: { DEFAULT: "#FAF8FC", 2: "#F3EEF7" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        blobA: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(50px,-35px) scale(1.12)" } },
        blobB: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(-45px,40px) scale(.9)" } },
        blobC: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(30px,45px) scale(1.08)" } },
        toastIn: { from: { opacity: "0", transform: "translate(-50%,8px)" }, to: { opacity: "1", transform: "translate(-50%,0)" } },
        cardUp: { from: { opacity: "0", transform: "translateY(22px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blob-a": "blobA 14s ease-in-out infinite",
        "blob-b": "blobB 17s ease-in-out infinite",
        "blob-c": "blobC 19s ease-in-out infinite",
        "toast-in": "toastIn .25s ease",
        "card-up": "cardUp .6s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
