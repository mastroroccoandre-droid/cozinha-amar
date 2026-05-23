/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green:      '#1D9E75',
          'green-light': '#E1F5EE',
          'green-mid':   '#5DCAA5',
          'green-dark':  '#0F6E56',
          amber:      '#BA7517',
          'amber-light': '#FAEEDA',
          red:        '#A32D2D',
          'red-light':   '#FCEBEB',
          blue:       '#185FA5',
          'blue-light':  '#E6F1FB',
        },
        surface: '#FFFFFF',
        background: '#FAFAF8',
        border: '#E5E3DC',
        text: {
          DEFAULT: '#2C2C2A',
          secondary: '#5F5E5A',
          tertiary: '#888780',
        },
        sidebar: '#2C2C2A',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
      },
    },
  },
  plugins: [],
}
