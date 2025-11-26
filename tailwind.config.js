/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.jsx", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist est nécessaire pour que les couleurs dynamiques (comme le statut lu du chat) soient conservées après la compilation
  safelist: [
     'text-[#10b981]', 
  ],
}