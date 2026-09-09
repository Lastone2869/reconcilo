import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#446743',
          dark: '#B6DEB1',
          container: '#B6DEB1',
          'container-dark': '#1D3824',
          'on-container': '#40633F',
          'on-container-dark': '#0E2612',
          fixed: '#C5EDBF',
          glow: '#86EFAC',
          vibrant: '#7DBE76',
        },
        secondary: {
          DEFAULT: '#785561',
          dark: '#FFD1E0',
          container: '#FFD1E0',
          'container-dark': '#3D1A25',
          'on-container': '#7A5764',
          'on-container-dark': '#FFD1E0',
          fixed: '#FFD9E5',
        },
        tertiary: {
          DEFAULT: '#70518E',
          dark: '#DFBAFF',
          container: '#E6C8FF',
          'container-dark': '#37264A',
          'on-container': '#6D4D8A',
          'on-container-dark': '#E6C8FF',
          fixed: '#F0DBFF',
        },
        error: {
          DEFAULT: '#BA1A1A',
          dark: '#FF858D',
          container: '#FFDAD6',
          'container-dark': '#491216',
          'on-container': '#93000A',
        },
        surface: {
          DEFAULT: '#F8FAF8',
          dark: '#0F1412',
          dim: '#D8DAD9',
          'container-lowest': '#FFFFFF',
          'container-lowest-dark': '#0A0E0C',
          'container-low': '#F2F4F2',
          'container-low-dark': '#131C17',
          container: '#ECEEEC',
          'container-dark': '#18221C',
          'container-high': '#E6E9E7',
          'container-high-dark': '#1D2821',
          'container-highest': '#E1E3E1',
          'container-highest-dark': '#223026',
        },
        'on-surface': {
          DEFAULT: '#191C1B',
          dark: '#EDF2EC',
          variant: '#424840',
          'variant-dark': '#9BB0A0',
        },
        outline: {
          DEFAULT: '#737970',
          dark: '#415548',
          variant: '#C2C8BE',
          'variant-dark': '#27382E',
        },
        // Sync semantic states per design.md §3.9
        sync: {
          synced: {
            bg: '#EBF7EB',
            border: '#C4E8C2',
            text: '#266838',
          },
          pending: {
            bg: '#FFF9E6',
            border: '#FFE7A3',
            text: '#8D6208',
          },
          reconciling: {
            bg: '#F5F0FE',
            border: '#E1D0FD',
            text: '#4D25B8',
          },
          conflict: {
            bg: '#FEECEE',
            border: '#FFD1E0',
            text: '#A72638',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.04)',
        card: '0 4px 20px rgba(0, 0, 0, 0.06)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
    },
  },
  plugins: [],
} satisfies Config;
