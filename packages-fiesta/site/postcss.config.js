const {resolve} = require('path');

module.exports = {
  plugins: {
    tailwindcss: resolve(__dirname, 'tailwind.config.js'),
  },
};
