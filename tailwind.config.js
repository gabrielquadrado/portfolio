/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}", "!./node_modules/**"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-black':  'var(--black)',
        'brand-cream':  'var(--cream)',
        'brand-red':    'var(--red)',
        'brand-blue':   'var(--blue)',
        'brand-green':  'var(--green)',
        'brand-purple': 'var(--purple)',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
