/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAFAFA',
          'bg-warm': '#F4F4F5',
          card: '#FFFFFF',
          'card-warm': '#FFFFFF',
          // Modern Retail Vibrant Orange
          orange: {
            DEFAULT: '#FF5500',
            hover: '#E04B00',
            light: '#FFF7ED',
            lighter: '#FFEDD5',
            dark: '#C2410C',
          },
          // Stark Modern Black & Charcoal
          black: {
            DEFAULT: '#09090B',
            pure: '#000000',
            dark: '#18181B',
            charcoal: '#27272A',
          },
          // Minimal Precision Borders
          border: {
            DEFAULT: '#E4E4E7',
            subtle: '#F4F4F5',
            dark: '#D4D4D8',
            focus: '#FF5500',
          },
          muted: '#71717A',
          subtle: '#A1A1AA',
          // Aliases mapped to White/Orange/Black to maintain legacy safety
          teal: {
            DEFAULT: '#FF5500',
            dark: '#E04B00',
            darker: '#C2410C',
            light: '#FFF7ED',
            hover: '#E04B00',
          },
          brown: {
            DEFAULT: '#09090B',
            dark: '#000000',
            light: '#F4F4F5',
            muted: '#71717A',
          },
          pink: {
            DEFAULT: '#FF5500',
            light: '#FFF7ED',
          }
        }
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(74, 43, 32, 0.04), 0 1px 2px -1px rgba(74, 43, 32, 0.04)',
        'card': '0 2px 6px -1px rgba(74, 43, 32, 0.06), 0 2px 4px -2px rgba(74, 43, 32, 0.04)',
        'modal': '0 20px 25px -5px rgba(74, 43, 32, 0.12), 0 8px 10px -6px rgba(74, 43, 32, 0.08)',
        'keypad': '0 2px 0 0 rgba(74, 43, 32, 0.1)',
      }
    },
  },
  plugins: [],
}
