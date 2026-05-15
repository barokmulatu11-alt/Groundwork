/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#FAF7F2',
        surface: 'rgba(255, 255, 255, 0.60)',
        primary: '#007AFF',
        primaryForeground: '#ffffff',
        textPrimary: '#1C1C1E',
        textSecondary: '#AEAEB2',
        borderLight: 'rgba(255, 255, 255, 0.95)',
        tabBar: 'rgba(255, 255, 255, 0.55)',
      },
      fontFamily: {
        thin: ['Inter_100Thin', 'sans-serif'],
        extralight: ['Inter_200ExtraLight', 'sans-serif'],
        light: ['Inter_300Light', 'sans-serif'],
        sans: ['Inter_300Light', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        'full': '9999px',
      }
    },
  },
  plugins: [],
}
