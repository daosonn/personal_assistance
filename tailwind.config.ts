import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#faf9f5",
        ink: "#1a1c1a",
        muted: "#5b6159",
        sage: {
          50: "#edf4ec",
          100: "#dfeadd",
          200: "#ccebc7",
          300: "#b0cfad",
          500: "#8ba888",
          700: "#4a6549",
          900: "#243d24"
        },
        lavender: {
          50: "#f1edff",
          100: "#e7deff",
          300: "#cbc1ec",
          500: "#9f94bf",
          700: "#61597f"
        },
        skysoft: {
          50: "#eef8ff",
          100: "#d9eefb",
          300: "#aacbe1",
          500: "#84a5ba",
          700: "#426276"
        },
        peach: {
          50: "#fff4ed",
          100: "#f7dfcf",
          300: "#f0c1a6",
          700: "#956044"
        }
      },
      boxShadow: {
        ambient: "0 18px 50px rgba(45, 45, 45, 0.06)"
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
