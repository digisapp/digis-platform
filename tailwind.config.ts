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
        // Digis brand colors - Vibrant and youthful
        'digis-cyan': '#00D9FF',
        'digis-pink': '#FF2E97',
        'digis-purple': '#A855F7',
        'digis-blue': '#3B82F6',
        'digis-yellow': '#FBBF24',
        'digis-green': '#10B981',
        'digis-orange': '#F97316',
        'digis-indigo': '#6366F1',
        // Background colors - lighter and more colorful
        'digis-bg-light': '#F0F4FF',
        'digis-bg-card': '#FFFFFF',
        'digis-bg-purple': '#FAF5FF',
        'digis-bg-blue': '#EFF6FF',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(255, 46, 151, 0.1) 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00D9FF 0%, #FF2E97 100%)',
        'fun-gradient': 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #10B981 100%)',
        'sunset-gradient': 'linear-gradient(135deg, #F97316 0%, #FF2E97 50%, #A855F7 100%)',
        'ocean-gradient': 'linear-gradient(135deg, #3B82F6 0%, #00D9FF 100%)',
        'candy-gradient': 'linear-gradient(135deg, #FF2E97 0%, #FBBF24 100%)',
        'pastel-gradient': 'linear-gradient(135deg, #FAF5FF 0%, #EFF6FF 50%, #F0F9FF 100%)',
      },
      backdropBlur: {
        'glass': '10px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 217, 255, 0.15)',
        'glow-cyan': '0 0 30px rgba(0, 217, 255, 0.5)',
        'glow-pink': '0 0 30px rgba(255, 46, 151, 0.5)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.5)',
        'fun': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
