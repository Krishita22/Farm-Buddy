/**
 * Shared Button component — replaces 20+ repeated button patterns across the app.
 * Variants: primary (green gradient), secondary (outline), ghost (text-only).
 */

const VARIANTS = {
  primary: 'bg-gradient-to-r from-farm-600 to-farm-500 text-white font-semibold hover:from-farm-700 hover:to-farm-600 shadow-lg shadow-farm-600/20',
  secondary: 'border border-gray-200 text-gray-500 hover:bg-gray-50',
  ghost: 'text-farm-600 hover:text-farm-700 font-medium',
  danger: 'bg-red-500 text-white font-semibold hover:bg-red-600',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'w-full py-3 text-sm rounded-2xl',
}

export default function Button({
  children, variant = 'primary', size = 'md', className = '',
  disabled, onClick, type = 'button', ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
