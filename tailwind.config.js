/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0faf0',
          100: '#dcf0dc',
          500: '#4a9e4a',
          600: '#3d8b3d',
          700: '#357a35',
          800: '#213d21',
          900: '#1a2332',
        },
        jf: {
          bg:      '#1a3a1a',
          bg2:     '#213d21',
          bg3:     '#264826',
          card:    '#1e3d1e',
          text:    '#e8f5e8',
          text2:   '#9dc49d',
          green:   '#4a9e4a',
          dark:    '#1a2332',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
