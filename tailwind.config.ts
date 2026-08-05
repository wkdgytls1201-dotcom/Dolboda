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
          600: "#E07E2E",
          700: "#B15E13",
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
          // 50은 원래 없었다 — `bg-ivory`(DEFAULT)와 `bg-ivory-50`이 실제로 같은 자리
          // (고정 헤더 배경 등)에 섞여 쓰이고 있었던 걸 보면, 두 표기가 같은 색을
          // 가리키려던 것이었다. 그래서 새 값을 만들지 않고 DEFAULT와 같은 값으로 채운다.
          50: "#FFFBF3",
          DEFAULT: "#FFFBF3",
          100: "#FFF7E9",
          200: "#FFF1DA",
        },
        ink: {
          900: "#1B1730",
          // 800·600·400·200 — 전부 원래 없었다. `text-ink-800`처럼 100자리 사이를 채우는
          // 값들이 여러 파일에 이미 쓰이고 있었는데, 정의가 없어 Tailwind가 CSS를 안
          // 만들어서 전부 조용히 부모 색을 그대로 상속하고 있었다(글자는 진한 ink-900으로
          // 뭉개져 보이고, 배경(`bg-ink-200`)은 아예 투명해서 안 보였다 — 실측으로 확인).
          // 기본 Tailwind 회색 팔레트엔 100단위 사이 값이 다 있어서 습관적으로 썼다가
          // 이 프로젝트의 커스텀 ink 팔레트(원래 900/700/500/300/100만 있었음)엔
          // 없다는 걸 아무도 눈치 못 챈 것으로 보인다. 양옆 정의된 값의 중간으로 채워
          // 기존 코드가 한 번에 의도한 색을 받게 한다.
          800: "#2B2641",
          700: "#3A3452",
          600: "#534C69",
          500: "#6B647F",
          400: "#8A839E",
          300: "#A9A3BC",
          200: "#C8C4D6",
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
