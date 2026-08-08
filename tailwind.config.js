/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--bg)',
          card: 'var(--bg-card)',
          raised: 'var(--bg-raised)',
          sunken: 'var(--bg-sunken)',
        },
        border: {
          DEFAULT: 'var(--border)',
          soft: 'var(--border-soft)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          line: 'var(--accent-line)',
        },
        teal: { DEFAULT: 'var(--teal)', soft: 'var(--teal-soft)' },
        good: { DEFAULT: 'var(--good)', soft: 'var(--good-soft)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        /* 后果声部：重来、删除。与告知类之 danger 墨阶分列（记-25） */
        critical: { DEFAULT: 'var(--danger-critical)', soft: 'var(--danger-critical-soft)' },
      },
      fontFamily: {
        /* 唯一底本在 tokens.css；此处只准引用变量（判例七、记-10） */
        display: ['var(--font-disp)'],
        body: ['var(--font-ui)'],
        zh: ['var(--font-zh)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
