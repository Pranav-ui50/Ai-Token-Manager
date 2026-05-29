/**
 * Select Component
 *
 * Reusable select dropdown.
 */

function Select({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  className = ''
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`
          block w-full px-3 py-2 rounded-md shadow-sm border text-sm
          ${error
            ? 'border-red-300 focus:border-red-500'
            : 'border-gray-300 focus:border-gray-500'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          focus:outline-none transition-colors
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default Select;