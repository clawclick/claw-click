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
        // Mint/Teal Brand Colors
        mint: {
          light: '#7DE2D1',
          DEFAULT: '#45C7B8',
          dark: '#1FAFA3',
        },
        glow: '#2EE6D6',
        // Backgrounds
        'bg-soft': '#E9F7F4',
        'bg-contrast': '#DFF3EF',
        // Text
        'text-primary': '#0F2F2C',
        'text-secondary': '#4A6B67',
        // Network
        'network-line': 'rgba(31, 175, 163, 0.3)',
        'network-dot': '#45C7B8',
        // Glass
        'glass-bg': 'rgba(255, 255, 255, 0.55)',
        'glass-border': 'rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'brand': '18px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(46, 230, 214, 0.35)',
        'glow-lg': '0 0 30px rgba(46, 230, 214, 0.6)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
};
export default config;
