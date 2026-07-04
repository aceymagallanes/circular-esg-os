/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // HP-inspired enterprise palette — credible, restrained, not eco-cliché
        ink: {
          DEFAULT: "#0B1E27", // deep teal-graphite, primary text
          soft: "#33505C",
          faint: "#6B8390",
        },
        canvas: {
          DEFAULT: "#F4F7F8", // app background
          panel: "#FFFFFF",
          sunken: "#EAF0F1",
        },
        line: {
          DEFAULT: "#DDE6E8",
          strong: "#C4D2D6",
        },
        hp: {
          DEFAULT: "#0096D6", // HP signature blue
          deep: "#0071A0",
        },
        teal: {
          DEFAULT: "#0E6C77",
          deep: "#0A4E56",
        },
        loop: "#2FA37A", // circularity green (muted)
        signal: "#E08A2B", // amber — attention
        alert: "#C24A44", // rose — risk
        violet: "#6C5CE0",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(11,30,39,0.04), 0 6px 24px -12px rgba(11,30,39,0.12)",
        pop: "0 12px 40px -12px rgba(11,30,39,0.28)",
      },
      borderRadius: {
        xl2: "1.15rem",
      },
    },
  },
  plugins: [],
};
