module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#181A20",
        card: "#23252B",
        primary: "#1ED760",
        secondary: "#A0A4AB",
        accent: "#FF6B6B",
        error: "#FF4D4F",
        success: "#1ED760",
        text: {
          DEFAULT: "#FFFFFF",
          secondary: "#A0A4AB",
          tertiary: "#6B6F76",
          inverse: "#181A20",
        },
      },
      borderRadius: {
        card: "20px",
        button: "16px",
        input: "12px",
        modal: "24px",
        avatar: "50%",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.18)",
        button: "0 4px 16px rgba(30,215,96,0.18)",
        modal: "0 8px 32px rgba(0,0,0,0.32)",
      },
      gradientColorStops: {
        "cover-start": "#FF6B6B",
        "cover-end": "#4ECDC4",
        "category-1": "#1ED760",
        "category-2": "#FFD93D",
        "category-3": "#4ECDC4",
        "category-4": "#556270",
      },
    },
  },
  plugins: [],
};
