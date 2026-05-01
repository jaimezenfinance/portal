import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f3693',
        salmon: '#ffbeb8',
      },
      fontFamily: {
        prompt: ['Prompt', 'sans-serif'],
      },
    },
  },
} satisfies Config
