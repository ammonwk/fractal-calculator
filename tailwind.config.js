/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Tell Tailwind to scan all JavaScript and TypeScript files for class names
  ],
  theme: {
    extend: {
      colors: {
        // You can add custom colors here
        'brand-blue': '#007acc',
        'brand-cyan': '#00d8ff',
        'brand-dark': '#1a1a2e',
      },
      fontFamily: {
        // Customize your fonts here
        sans: ['Poppins', 'Lato'], // Using Inter as the default sans-serif font
      },
      boxShadow: {
        // Add custom shadows
        'lg-blue': '0 10px 15px -3px rgba(0, 122, 204, 0.1), 0 4px 6px -2px rgba(0, 122, 204, 0.05)',
      },
    },
  },
  plugins: [],
};
