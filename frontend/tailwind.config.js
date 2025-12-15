/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Uber-inspired Blue Theme
                midnight: {
                    900: '#0f172a', // Deep Midnight Blue (replaces Uber black)
                    800: '#1e293b',
                    700: '#334155',
                },
                brand: {
                    600: '#3b82f6', // Brand Blue
                    500: '#60a5fa',
                    400: '#93c5fd',
                },
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
            },
            borderRadius: {
                'card': '12px',
                'pill': '9999px',
            },
            boxShadow: {
                'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
                'float': '0 8px 24px rgba(0, 0, 0, 0.15)',
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
