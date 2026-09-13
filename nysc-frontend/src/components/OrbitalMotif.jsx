// A recurring abstract motif combining orbital arcs (earth observation)
// with topographic contour lines (mining/terrain) — used sparingly across
// sections as the one consistent visual signature of the site, rather than
// a different icon per section.
export default function OrbitalMotif({ className = '', variant = 'hero' }) {
  if (variant === 'hero') {
    return (
      <svg
        viewBox="0 0 600 600"
        className={className}
        aria-hidden="true"
        fill="none"
      >
        {/* Orbital arcs */}
        <circle cx="420" cy="220" r="180" stroke="var(--color-ochre)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="420" cy="220" r="140" stroke="var(--color-navy)" strokeWidth="1.5" opacity="0.25" />
        <circle cx="420" cy="220" r="230" stroke="var(--color-gold)" strokeWidth="1" opacity="0.3" strokeDasharray="2 6" />
        {/* satellite node */}
        <circle cx="420" cy="40" r="5" fill="var(--color-ochre)" />
        <circle cx="600" cy="150" r="3" fill="var(--color-navy)" />

        {/* Topographic contour lines, lower-left */}
        <path d="M0 480 Q 100 440 200 480 T 400 470" stroke="var(--color-moss)" strokeWidth="1.5" opacity="0.4" />
        <path d="M0 520 Q 110 470 220 520 T 430 505" stroke="var(--color-moss)" strokeWidth="1.5" opacity="0.3" />
        <path d="M0 560 Q 120 505 240 560 T 460 540" stroke="var(--color-moss)" strokeWidth="1.5" opacity="0.22" />
      </svg>
    )
  }

  // Compact divider variant used between sections
  return (
    <svg viewBox="0 0 200 40" className={className} aria-hidden="true" fill="none">
      <path d="M0 30 Q 50 10 100 30 T 200 25" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="170" cy="12" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
