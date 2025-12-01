/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./demo.html",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Micboard custom colors from colors.scss
        'mb-black': '#262626',
        'mb-red': '#DC493A',
        'mb-yellow': '#EF9D51',
        'mb-purple': '#845A6D',
        'mb-blue': '#006494',
        'mb-green': '#69B578',
        'mb-gray': '#616161',
        'mb-white': '#D7D7D7',
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  // Prevent Tailwind from conflicting with Bootstrap
  corePlugins: {
    preflight: false,
  },
}

