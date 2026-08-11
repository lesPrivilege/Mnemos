import mark from '../assets/brand/mnemos-mark.svg?raw'

/**
 * The in-app rendering of the canonical brand SVG. Color remains contextual,
 * while every path and stroke comes from the same source used by native icons.
 */
export default function MnemosMark({
  size = 22,
  color = 'currentColor',
  accent = 'var(--accent)',
  label,
}) {
  return (
    <span
      className="mnemos-mark"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: size,
        height: size,
        color,
        '--mnemos-mark-accent': accent,
      }}
      dangerouslySetInnerHTML={{ __html: mark }}
    />
  )
}
