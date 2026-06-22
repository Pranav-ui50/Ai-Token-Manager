/**
 * Input Component
 *
 * Reusable input component with label and error handling.
 */

import { forwardRef } from 'react';
import { cn } from '../../utils/helpers.js';

const Input = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  inputClassName = '',
  type = 'text',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const inputId = props.id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}{required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 text-sm text-gray-900 bg-white border rounded-lg shadow-sm',
          'transition-all duration-200 placeholder:text-gray-400',
          'focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300',
          disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
          inputClassName
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
