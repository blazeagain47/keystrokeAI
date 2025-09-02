import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
    "./src/**/*.{md,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { transform: "translateY(12px)" }, to: { transform: "translateY(0)" } },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #ffa726, 0 0 10px #ffa726, 0 0 15px #ffa726" },
          "100%": { boxShadow: "0 0 10px #ffa726, 0 0 20px #ffa726, 0 0 30px #ffa726" },
        },
        'bk-glow': {
          '0%': { filter: 'drop-shadow(0 0 0 rgba(255,170,0,.0))' },
          '100%': { filter: 'drop-shadow(0 0 12px rgba(255,170,0,.35))' }
        },
        'bg-pan': {
          '0%': { backgroundPosition: '0% 0%, 0% 0%, 100% 100%' },
          '50%': { backgroundPosition: '100% 50%, 50% 0%, 0% 100%' },
          '100%': { backgroundPosition: '0% 0%, 0% 0%, 100% 100%' },
        },
      },
      animation: {
        "fade-in": "fade-in .4s ease-out both",
        "slide-up": "slide-up .4s ease-out both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        'bk-glow-slow': 'bk-glow 2.8s ease-in-out infinite alternate',
        'bg-pan': 'bg-pan 18s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config