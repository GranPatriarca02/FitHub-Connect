/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Colores
        'fithub-black': '#050505',    // Fondo profundo
        'fithub-gray': '#121212',     // Color de inputs y tarjetas
        'fithub-green': '#2ecc71',    // El verde de acento
        'border-nocta': '#262626',    // Color de los bordes sutiles
      },
    },
  },
  plugins: [],
}
