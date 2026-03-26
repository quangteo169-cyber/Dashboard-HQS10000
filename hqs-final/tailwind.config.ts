import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg:       '#07090f',
        surface:  '#0d1117',
        surface2: '#111827',
        border:   '#1f2937',
        border2:  '#374151',
        gmv:      '#22d3ee',
        re2:      '#fb923c',
        re1:      '#818cf8',
        pl1b:     '#34d399',
      },
    },
  },
  plugins: [],
}
export default config
