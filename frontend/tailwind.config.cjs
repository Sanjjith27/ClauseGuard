/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#020e21",
        elevated: "#041329",
        card: "#0a1a2e",
        "border-subtle": "#1e293b",
        primary: "#35d7e8",
        "primary-dark": "#0d94a1",
        riskHigh: "#f43f5e",
        riskMedium: "#f59e0b",
        riskLow: "#10b981",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
