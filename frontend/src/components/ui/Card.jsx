/**
 * Shared Card component — replaces repeated glass-card and white-card patterns.
 * Variants: glass (translucent), solid (white), skeleton (loading shimmer).
 */

const VARIANTS = {
  glass: 'bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm',
  solid: 'bg-white rounded-2xl border border-gray-200 shadow-sm',
  skeleton: 'market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm',
}

export default function Card({ children, variant = 'glass', className = '', animate, style, ...props }) {
  const animClass = animate ? 'market-card-enter hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300' : ''
  return (
    <div
      className={`${VARIANTS[variant]} ${animClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}
