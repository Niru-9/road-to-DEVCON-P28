import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        refi: {
          milk: "#FBF7F4",
          oat: "#F3ECE2",
          card: "#EFEAE2",
          sand: "#E5DED2",
          taupe: "#A39382",
          mocha: "#685D54",
          charcoal: "#1F1D1A",
          dark: "#141311",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Playfair Display", "serif"],
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;