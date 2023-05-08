/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/*.html",
    "./public/js/*.js",
    "./public/css/*.css",
    "./views/*.ejs",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'water-tile': "url('/img/bgtile.png')",
      },
      scale: {
        '-100': '-1',
      }
    },
  },
  plugins: [],
}

