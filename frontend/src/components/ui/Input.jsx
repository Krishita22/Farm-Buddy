/**
 * Shared Input component — replaces 15+ repeated input patterns.
 * Supports optional left icon and consistent focus ring styling.
 */

export default function Input({
  icon: Icon, type = 'text', placeholder, value, onChange, onKeyDown,
  className = '', ...props
}) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-farm-500 focus:border-farm-500 focus:outline-none bg-gray-50/50 transition-all ${className}`}
        {...props}
      />
    </div>
  )
}
