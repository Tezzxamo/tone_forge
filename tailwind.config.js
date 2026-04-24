/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "./src/renderer/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'tf-bg': '#0B0F19',
        'tf-panel': '#111827',
        'tf-panel-hover': '#1a2332',
        'tf-border': '#1E293B',
        'tf-border-glow': '#00E5FF',
        'tf-accent': '#00E5FF',
        'tf-accent-hover': '#00B8D4',
        'tf-accent-dim': 'rgba(0, 229, 255, 0.15)',
        'tf-text': '#F1F5F9',
        'tf-text-dim': '#64748B',
        'tf-danger': '#FF3366',
        'tf-warning': '#FFB020',
        'tf-success': '#00E676'
      }
    }
  },
  plugins: []
}
