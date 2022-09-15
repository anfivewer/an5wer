const {resolve} = require('path');
const plugin = require('tailwindcss/plugin');

const PREFIX = '_';

module.exports = {
  prefix: PREFIX,
  content: [resolve(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    colors: {
      'ev-plate': '#259C3F',
      'text-secondary': 'rgba(0,0,0,0.5)',
    },
    spacing: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
    },
    fontFamily: {
      sans: ['Roboto', 'sans-serif'],
    },
  },
  plugins: [
    plugin(({addUtilities}) => {
      addUtilities({
        '.font-header-32-32': {
          'font-family': '"Roboto Condensed", sans-serif',
          'font-weight': '700',
          'font-size': '32px',
          'line-height': '32px',
        },
        '.font-mono-medium-32-32': {
          'font-family': '"Roboto Mono", monospace',
          'font-weight': '500',
          'font-size': '32px',
          'line-height': '32px',
        },
        '.font-mono-16-16': {
          'font-family': '"Roboto Mono", monospace',
          'font-weight': '500',
          'font-size': '16px',
          'line-height': '16px',
        },
        '.font-regular-24-24': {
          'font-family': '"Roboto", sans-serif',
          'font-weight': '400',
          'font-size': '24px',
          'line-height': '24px',
        },
        '.font-regular-24-28': {
          'font-family': '"Roboto", sans-serif',
          'font-weight': '400',
          'font-size': '24px',
          'line-height': '24px',
        },
      });
    }),
  ],
};
