import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FFF3F1",
          100: "#FFE2DD",
          200: "#FFC7BC",
          300: "#FF9F8C",
          400: "#FF7A61",
          500: "#FF6250",
          600: "#EB4632",
          700: "#C93524",
          800: "#9E2A1D",
          900: "#7A2116",
        },
        mint: {
          50: "#ECFDF9",
          100: "#D2FBF1",
          200: "#A8F5E4",
          300: "#71E9D3",
          400: "#3FD9BE",
          500: "#2DD4BF",
          600: "#1CA997",
          700: "#178578",
          800: "#146A61",
          900: "#0F4F49",
        },
        peach: {
          50: "#FFF8F0",
          100: "#FFF0E0",
          200: "#FFE3CC",
          300: "#FFD1AD",
          400: "#FFBB85",
          500: "#FFA35C",
        },
        accent: {
          50: "#FFFBEB",
          100: "#FFF3C4",
          200: "#FFE68A",
          300: "#FFD84D",
          400: "#FFCC29",
          500: "#F5B800",
          600: "#CC9900",
        },
        royal: {
          50: "#F5EEFB",
          100: "#E9D9F6",
          200: "#D3B4ED",
          300: "#B885E0",
          400: "#9C60D0",
          500: "#7C42BD",
          600: "#6931A3",
          700: "#552686",
          800: "#421D68",
          900: "#2E144A",
        },
        ivory: {
          DEFAULT: "#FFFBF3",
          100: "#FFF7E9",
          200: "#FFF1DA",
        },
        ink: {
          900: "#1B1730",
          700: "#3A3452",
          500: "#6B647F",
          300: "#A9A3BC",
          100: "#E7E4F0",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 8px 24px -8px rgba(255, 98, 80, 0.22)",
        card: "0 2px 12px rgba(27, 23, 48, 0.06)",
        "card-hover": "0 12px 32px -8px rgba(255, 98, 80, 0.28)",
        royal: "0 8px 24px -8px rgba(124, 66, 189, 0.32)",
        "royal-hover": "0 12px 32px -8px rgba(124, 66, 189, 0.4)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #FFF6F2 0%, #FFE4D8 50%, #FFF3E4 100%)",
        "brand-gradient": "linear-gradient(135deg, #FF6250 0%, #FF9F8C 55%, #FFBB85 100%)",
        "royal-gradient": "linear-gradient(135deg, #552686 0%, #7C42BD 55%, #FF9F8C 100%)",
      },
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
