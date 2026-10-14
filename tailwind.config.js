/** Tailwind config — matches the legacy inline config used by the CDN runtime.
 *  Rebuild stylesheet after markup/class changes:  npm run build:css
 */
module.exports = {
  content: [
    './index.html',
    './assets/js/app.js',
    './assets/js/site.js',
    './src/home.template.html',
    './src/page.template.html',
    './src/partials/*.html',
    './data/pages.json',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        tims: {
          red: '#C8102E',
          darkRed: '#99001A',
          coffee: '#361D15',
          darkCoffee: '#23120C',
          cream: '#FDFBF7',
          latte: '#F5EBE1',
          gold: '#D97706',
          warmGray: '#8C7A70',
        },
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(54, 29, 21, 0.08), 0 2px 6px -1px rgba(54, 29, 21, 0.04)',
        cardHover: '0 12px 28px -4px rgba(200, 16, 46, 0.15), 0 4px 12px -2px rgba(54, 29, 21, 0.06)',
      },
    },
  },
  plugins: [],
};
