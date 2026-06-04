import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        "border-active": "var(--border-active)",
        primary: "var(--primary)",
        "primary-glow": "var(--primary-glow)",
        "primary-dark": "var(--primary-dark)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        // session types
        push: "#6495ED",
        pull: "#34D399",
        legs: "#F59E0B",
        cardio: "#F87171",
        // cornflower alias
        cf: {
          50: "#eef3fd", 100: "#dde7fb", 200: "#c3d5f8",
          300: "#9bb9f3", 400: "#6495ED", 500: "#4a7de8",
          600: "#3364e0", 700: "#2b51ce", 800: "#2843a7", 900: "#263c84",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(100,149,237,0.08)",
        "glow-sm": "0 0 20px rgba(100,149,237,0.12)",
      },
      backgroundImage: {
        "card-gradient": "linear-gradient(135deg, #1A1A2E 0%, #12121F 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
