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
          green:        '#7B9E6B',
          'green-light': '#EDF3EA',
          'green-mid':   '#9DB98F',
          'green-dark':  '#5A7A4C',
          rose:         '#E8A0A0',
          'rose-light':  '#FCEEF0',
          'rose-dark':   '#C97070',
          amber:        '#BA7517',
          'amber-light': '#FAEEDA',
          red:          '#A32D2D',
          'red-light':   '#FCEBEB',
          blue:         '#185FA5',
          'blue-light':  '#E6F1FB',
        },
        surface:    '#FFFFFF',
        background: '#FAFAF8',
        border:     '#E5E3DC',
        text: {
          DEFAULT:   '#2C2C2A',
          secondary: '#5F5E5A',
          tertiary:  '#888780',
        },
        sidebar: '#3D4F38',
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm:      '8px',
        lg:      '16px',
      },
    },
  },
  plugins: [],
}
