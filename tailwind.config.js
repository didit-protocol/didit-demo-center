import { nextui } from '@nextui-org/theme';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        // Didit Brand Colors
        accent: '#2567FF',
        'accent-hover': '#1a56db',
        'app-black': '#1A1A1A',
        'app-white': '#FEFEFE',
        'dusty-gray': '#9DA1A1',
        'graphite-gray': '#4B5058',
        'light-gray': '#F6F6F6',
        'light-blue': '#90B1FF',
        lime: '#ECF86E',
        // Surface colors
        surfaces: {
          hi: '#454545',
          'mid-hi': '#9DA1A1',
          'mid-lo': '#EDEDED',
          'u-lo': '#FAFAFC',
        },
        // Shadcn UI colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: {
        // Display typography
        'display-lg': [
          '52px',
          {
            lineHeight: '54px',
            letterSpacing: '-2.08px',
            fontWeight: '600',
          },
        ],
        'display-sm': [
          '42px',
          {
            lineHeight: '44px',
            letterSpacing: '-1.68px',
            fontWeight: '600',
          },
        ],
        // Headline typography
        'headline-lg': [
          '32px',
          {
            lineHeight: '36px',
            letterSpacing: '-1.28px',
            fontWeight: '600',
          },
        ],
        'headline-md': [
          '24px',
          {
            lineHeight: '28px',
            letterSpacing: '-0.96px',
            fontWeight: '600',
          },
        ],
        'headline-sm': [
          '20px',
          {
            lineHeight: '24px',
            letterSpacing: '-0.6px',
            fontWeight: '600',
          },
        ],
        // Body typography
        'body-lg': [
          '18px',
          {
            lineHeight: '26px',
            letterSpacing: '-0.36px',
            fontWeight: '400',
          },
        ],
        'body-md': [
          '15px',
          {
            lineHeight: '22px',
            letterSpacing: '-0.3px',
            fontWeight: '400',
          },
        ],
        'body-sm': [
          '14px',
          {
            lineHeight: '20px',
            letterSpacing: '-0.28px',
            fontWeight: '400',
          },
        ],
        // Label typography
        'label-lg': [
          '14px',
          {
            lineHeight: '16px',
            letterSpacing: '-0.28px',
            fontWeight: '500',
          },
        ],
        'label-md': [
          '13px',
          {
            lineHeight: '16px',
            letterSpacing: '-0.26px',
            fontWeight: '500',
          },
        ],
        'label-sm': [
          '12px',
          {
            lineHeight: '14px',
            letterSpacing: '-0.24px',
            fontWeight: '500',
          },
        ],
        // Preheader / section label
        preheader: [
          '11px',
          {
            lineHeight: '14px',
            letterSpacing: '1.5px',
            fontWeight: '600',
          },
        ],
        // Button text
        button: [
          '14px',
          {
            lineHeight: '16px',
            letterSpacing: '-0.56px',
            fontWeight: '500',
          },
        ],
      },
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 4px 24px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'elevated': '0 12px 40px 0 rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #2567FF 0%, #90B1FF 100%)',
        'gradient-hero': 'radial-gradient(circle at 50% 0%, #dcefff 0%, #eef3ff 50%, #ffffff 100%)',
        'gradient-section': 'linear-gradient(180deg, #FAFAFC 0%, #FFFFFF 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  darkMode: ['class'],
  plugins: [nextui(), require('tailwindcss-animate')],
};
