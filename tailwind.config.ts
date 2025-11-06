import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Digis brand colors - Tokyo-inspired neon
        'digis-cyan': '#00BFFF',
        'digis-pink': '#FF69B4',
        'digis-purple': '#9D4EDD',
        'digis-blue': '#4361EE',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(0, 191, 255, 0.1) 0%, rgba(255, 105, 180, 0.1) 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00BFFF 0%, #FF69B4 100%)',
      },
      backdropBlur: {
        'glass': '10px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 191, 255, 0.1)',
        'glow-cyan': '0 0 20px rgba(0, 191, 255, 0.5)',
        'glow-pink': '0 0 20px rgba(255, 105, 180, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
