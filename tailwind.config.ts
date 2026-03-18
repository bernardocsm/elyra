import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-dark-primary':   '#272523',
        'text-dark-secondary': '#686764',
        'background-main':     '#FFFFFF',
        'background-page':     '#F6F6F6',
        'background-faint':    '#F8F8F8',
        'accent-eden':         '#39624D',
        'accent-primary':      '#09321F',
        'primary-30':          '#B3BFB7',
        'background-primary-selected': '#ECF0ED',
        'accent-raspberry':    '#CC768D',
        'neutral-dark-5':      'rgba(39,37,35,0.05)',
        'neutral-dark-20':     'rgba(39,37,35,0.2)',
        'divider':             'rgba(39,37,35,0.1)',
        'accent-orange':       '#D97706',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'sidebar': 'cubic-bezier(0.23,1,0.32,1)',
      },
      boxShadow: {
        'sm':  '0 1px 2px 0 rgba(0,0,0,0.05)',
        'xl':  '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
