const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ja-dark":      "#1A2E1A",
        "ja-dark2":     "#152615",
        "ja-green":     "#7CB342",
        "ja-green2":    "#8BC34A",
        "ja-green-lt":  "#A5D6A7",
        "ja-green-dim": "#4A5A4A",
        "ja-green-bg":  "#f0f7eb",
        "ja-text":      "#1A2E1A",
        "ja-muted":     "#5A7560",
        "ja-dim":       "#8fa892",
        "ja-brd":       "#dde8da",
        "ja-bg":        "#f4f7f2",
        "ja-success":   "#2e7d32",
        "ja-success-lt":"#f0f7f0",
        "ja-danger":    "#e53935",
        "ja-danger-lt": "#fdf3f3",
        "ja-warn":      "#f57c00",
        "ja-warn-lt":   "#fff8f0",
        "ja-info":      "#1565c0",
        "ja-info-lt":   "#e8f0fe",
        brand: {
          50:  "#f0f7eb", 100: "#dbe9d4", 200: "#c4dab7", 300: "#A5D6A7",
          400: "#8BC34A", 500: "#7CB342", 600: "#5c8b30", 700: "#4a6e26",
          800: "#2d4a2d", 900: "#1A2E1A",
        },
        accent:  { 500: "#7CB342", 600: "#5c8b30" },
        danger:  { 500: "#e53935", 600: "#c62828" },
        warn:    { 500: "#f57c00", 600: "#ef6c00" },
      },
      fontFamily: {
        sans:    ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-rajdhani)", "Rajdhani", "system-ui", "sans-serif"],
      },
      borderRadius: {
        ja:    "10px",
        "ja-lg": "14px",
      },
      boxShadow: {
        ja:    "0 2px 12px rgba(26,46,26,.08)",
        "ja-lg": "0 4px 24px rgba(26,46,26,.12)",
      },
      keyframes: {
        "slide-up": {
          "0%":   { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in":  "fade-in 0.5s ease-out",
      },
    },
  },
  plugins: [
    plugin(function ({ addComponents }) {
      const baseBtn = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        borderRadius: "var(--r)",
        padding: "0.625rem 1.25rem",
        fontSize: "0.875rem",
        fontWeight: "600",
        fontFamily: "var(--f)",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        border: "none",
      };

      addComponents({
        ".btn": baseBtn,
        ".btn:disabled": { opacity: "0.5", cursor: "not-allowed" },

        ".btn-primary": {
          ...baseBtn,
          background: "linear-gradient(135deg, #7CB342 0%, #8BC34A 100%)",
          color: "#ffffff",
          boxShadow: "var(--shadow)",
        },
        ".btn-primary:hover:not(:disabled)": {
          filter: "brightness(1.06)",
          transform: "translateY(-1px)",
          boxShadow: "var(--shadow-lg)",
        },
        ".btn-primary:disabled": { opacity: "0.5", cursor: "not-allowed", transform: "none" },

        ".btn-secondary": {
          ...baseBtn,
          border: "1px solid #7CB342",
          backgroundColor: "#ffffff",
          color: "#7CB342",
        },
        ".btn-secondary:hover:not(:disabled)": {
          backgroundColor: "#f0f7eb",
        },
        ".btn-secondary:disabled": { opacity: "0.5", cursor: "not-allowed" },

        ".btn-ghost": {
          ...baseBtn,
          backgroundColor: "transparent",
          color: "#5A7560",
        },
        ".btn-ghost:hover:not(:disabled)": {
          backgroundColor: "#f0f7eb",
          color: "#1A2E1A",
        },

        ".btn-danger": {
          ...baseBtn,
          backgroundColor: "#e53935",
          color: "#ffffff",
          boxShadow: "var(--shadow)",
        },
        ".btn-danger:hover:not(:disabled)": {
          backgroundColor: "#c62828",
          transform: "translateY(-1px)",
        },

        ".input": {
          width: "100%",
          borderRadius: "var(--r)",
          border: "1px solid #dde8da",
          padding: "0.5rem 0.875rem",
          fontSize: "0.875rem",
          fontFamily: "var(--f)",
          color: "#1A2E1A",
          outline: "none",
          transition: "border-color 150ms, box-shadow 150ms",
          backgroundColor: "#ffffff",
        },
        ".input:focus": {
          borderColor: "#7CB342",
          boxShadow: "0 0 0 2px rgba(124, 179, 66, 0.25)",
        },
        ".input::placeholder": { color: "#8fa892" },

        ".label": {
          display: "block",
          fontSize: "0.8125rem",
          fontWeight: "600",
          color: "#1A2E1A",
          marginBottom: "0.375rem",
          fontFamily: "var(--f)",
        },

        ".card": {
          borderRadius: "var(--r-lg)",
          border: "1px solid #dde8da",
          backgroundColor: "#ffffff",
          padding: "1.25rem",
          boxShadow: "var(--shadow)",
        },

        ".badge": {
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "var(--r)",
          padding: "0.1875rem 0.625rem",
          fontSize: "0.75rem",
          fontWeight: "600",
          fontFamily: "var(--f)",
        },
        ".badge-success": { backgroundColor: "#f0f7f0", color: "#2e7d32" },
        ".badge-danger":  { backgroundColor: "#fdf3f3", color: "#e53935" },
        ".badge-warn":    { backgroundColor: "#fff8f0", color: "#f57c00" },
        ".badge-info":    { backgroundColor: "#e8f0fe", color: "#1565c0" },
        ".badge-neutral": { backgroundColor: "#f0f7eb", color: "#1A2E1A" },

        ".kpi-card": {
          position: "relative",
          borderRadius: "var(--r-lg)",
          border: "1px solid #dde8da",
          backgroundColor: "#ffffff",
          padding: "1.25rem",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        },
        ".kpi-number": {
          fontFamily: "var(--f2)",
          fontSize: "32px",
          fontWeight: "700",
          lineHeight: "1",
          color: "#1A2E1A",
        },
      });
    }),
  ],
};
