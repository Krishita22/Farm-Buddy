/**
 * Shared Alert component — replaces repeated error/success message patterns.
 */

export default function Alert({ message, type = 'error' }) {
  if (!message) return null
  const styles = type === 'error'
    ? 'text-red-500 bg-red-50'
    : 'text-green-600 bg-green-50'
  return <p className={`text-xs px-3 py-2 rounded-xl mt-3 ${styles}`}>{message}</p>
}
