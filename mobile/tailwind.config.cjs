/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [
    "./App.jsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "fithub-black": "#050505",
        "fithub-gray": "#121212",
        "fithub-green": "#2ecc71",
        "border-nocta": "#262626",
      },
    },
  },
  plugins: [],
}