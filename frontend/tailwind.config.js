/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        container: {
            center: true,
            padding: '1rem',
            screens: {
                '2xl': '1280px',
            },
        },
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1rem' }],
                sm: ['0.875rem', { lineHeight: '1.25rem' }],
                base: ['0.9375rem', { lineHeight: '1.4' }],
                lg: ['1rem', { lineHeight: '1.4' }],
                xl: ['1.125rem', { lineHeight: '1.35' }],
                '2xl': ['1.375rem', { lineHeight: '1.3' }],
                '3xl': ['1.75rem', { lineHeight: '1.2' }],
                '4xl': ['2.25rem', { lineHeight: '1.15' }],
                '5xl': ['3rem', { lineHeight: '1.1' }],
            },
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                canvas: 'hsl(var(--canvas))',
                brand: {
                    50: 'hsl(var(--brand-50))',
                    100: 'hsl(var(--brand-100))',
                    200: 'hsl(var(--brand-200))',
                    300: 'hsl(var(--brand-300))',
                    400: 'hsl(var(--brand-400))',
                    500: 'hsl(var(--brand-500))',
                    600: 'hsl(var(--brand-600))',
                    700: 'hsl(var(--brand-700))',
                    800: 'hsl(var(--brand-800))',
                    900: 'hsl(var(--brand-900))',
                    DEFAULT: 'hsl(var(--brand-600))',
                    foreground: 'hsl(var(--brand-foreground))',
                },
                accent: {
                    50: 'hsl(var(--accent-50))',
                    100: 'hsl(var(--accent-100))',
                    400: 'hsl(var(--accent-400))',
                    500: 'hsl(var(--accent-500))',
                    600: 'hsl(var(--accent-600))',
                    700: 'hsl(var(--accent-700))',
                    DEFAULT: 'hsl(var(--accent-500))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                primary: {
                    50: 'hsl(var(--brand-50))',
                    100: 'hsl(var(--brand-100))',
                    500: 'hsl(var(--brand-500))',
                    600: 'hsl(var(--brand-600))',
                    700: 'hsl(var(--brand-700))',
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                card: '0 0 0 1px hsl(var(--border) / 0.6)',
                'card-hover': '0 0 0 1px hsl(var(--brand-300) / 0.6), 0 1px 2px hsl(0 0% 0% / 0.04)',
                pop: '0 8px 24px -8px hsl(220 40% 14% / 0.18), 0 2px 4px hsl(220 40% 14% / 0.04)',
                focus: '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--brand-500) / 0.45)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'fade-in-up': {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
                'fade-in-up': 'fade-in-up 0.4s ease-out',
                shimmer: 'shimmer 1.6s ease-in-out infinite',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}
