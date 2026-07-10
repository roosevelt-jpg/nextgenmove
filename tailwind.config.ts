import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-accent": "var(--border-accent)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "fill-primary": "var(--fill-primary)",
        "on-primary": "var(--on-primary)",
        "fill-accent": "var(--fill-accent)",
        "fill-accent-strong": "var(--fill-accent-strong)",
        "on-accent": "var(--on-accent)",
        "bg-purple": "var(--bg-purple)",
        "text-label": "var(--text-label)",
        "bg-accent": "var(--bg-accent)",
        "text-accent": "var(--text-accent)",
        "bg-success": "var(--bg-success)",
        "text-success": "var(--text-success)",
        "bg-warning": "var(--bg-warning)",
        "text-warning": "var(--text-warning)",
        "bg-tag": "var(--bg-tag)",
        "text-tag": "var(--text-tag)",
        "brand-indigo-1": "var(--brand-indigo-1)",
        "brand-indigo-2": "var(--brand-indigo-2)",
        "brand-amber-1": "var(--brand-amber-1)",
        "brand-amber-2": "var(--brand-amber-2)",
        "brand-lavender": "var(--brand-lavender)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        "radius-sm": "var(--radius-sm)",
        radius: "var(--radius)",
        "radius-lg": "var(--radius-lg)",
      },
      backgroundImage: {
        "grad-horizon": "var(--grad-horizon)",
        "grad-dusk": "var(--grad-dusk)",
        "grad-route": "var(--grad-route)",
      },
      maxWidth: {
        page: "var(--page-max)",
      },
    },
  },
};

export default config;
