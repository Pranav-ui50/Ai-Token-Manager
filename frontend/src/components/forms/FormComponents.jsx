/**
 * Form Components
 *
 * Reusable form components with validation support.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Loader from '../common/Loader.jsx';

/**
 * Form Component with validation
 */
export const Form = ({ children, onSubmit, className = '', ...props }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} {...props}>
      {children}
    </form>
  );
};

/**
 * Form Field wrapper with label and error display
 */
export const FormField = ({
  children,
  label,
  error,
  required,
  hint,
  className = ''
}) => {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

/**
 * Input Component
 */
export const Input = ({
  type = 'text',
  label,
  error,
  required,
  hint,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 dark:text-white
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const errorClasses = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600';

  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <input
        type={type}
        className={`${baseInputClasses} ${errorClasses} ${inputClassName}`}
        {...props}
      />
    </FormField>
  );
};

/**
 * Textarea Component
 */
export const Textarea = ({
  label,
  error,
  required,
  hint,
  rows = 4,
  className = '',
  textareaClassName = '',
  ...props
}) => {
  const baseTextareaClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 dark:text-white
    disabled:opacity-50 disabled:cursor-not-allowed
    resize-none
    transition-colors duration-200
  `;

  const errorClasses = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600';

  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <textarea
        rows={rows}
        className={`${baseTextareaClasses} ${errorClasses} ${textareaClassName}`}
        {...props}
      />
    </FormField>
  );
};

/**
 * Select Component
 */
export const Select = ({
  label,
  error,
  required,
  hint,
  options = [],
  placeholder = 'Select...',
  className = '',
  selectClassName = '',
  ...props
}) => {
  const baseSelectClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 dark:text-white
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors duration-200
    bg-white dark:bg-gray-800
  `;

  const errorClasses = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600';

  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <select className={`${baseSelectClasses} ${errorClasses} ${selectClassName}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};

/**
 * Multi-Select Component
 */
export const MultiSelect = ({
  label,
  error,
  required,
  hint,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const selectedLabels = options
    .filter(o => value.includes(o.value))
    .map(o => o.label);

  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white flex items-center justify-between"
        >
          <span className={selectedLabels.length ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
            {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-white">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </FormField>
  );
};

/**
 * Checkbox Component
 */
export const Checkbox = ({
  label,
  error,
  hint,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          {...props}
        />
      </div>
      {label && (
        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

/**
 * Radio Group Component
 */
export const RadioGroup = ({
  label,
  options = [],
  value,
  onChange,
  error,
  required,
  hint,
  className = '',
  name
}) => {
  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">{option.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  );
};

/**
 * Toggle Switch Component
 */
export const Toggle = ({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
  className = ''
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {label && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{label}</span>
      )}
      {hint && (
        <span className="ml-2 text-sm text-gray-500">{hint}</span>
      )}
    </div>
  );
};

/**
 * Slider Component
 */
export const Slider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  error,
  hint,
  showValue = true,
  className = ''
}) => {
  return (
    <FormField label={label} error={error} hint={hint} className={className}>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        {showValue && (
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">{value}</span>
        )}
      </div>
    </FormField>
  );
};

/**
 * Date Input Component
 */
export const DateInput = ({
  label,
  error,
  required,
  hint,
  className = '',
  ...props
}) => {
  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <input
        type="date"
        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </FormField>
  );
};

/**
 * File Input Component
 */
export const FileInput = ({
  label,
  error,
  required,
  hint,
  accept,
  multiple = false,
  onFileSelect,
  className = ''
}) => {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const handleChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    if (onFileSelect) {
      onFileSelect(multiple ? selectedFiles : selectedFiles[0]);
    }
  };

  return (
    <FormField label={label} error={error} required={required} hint={hint} className={className}>
      <div className="flex items-center space-x-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Choose File{multiple ? 's' : ''}
        </button>
        {files.length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {files.map(f => f.name).join(', ')}
          </span>
        )}
      </div>
    </FormField>
  );
};

/**
 * Form Actions Component
 */
export const FormActions = ({
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-end space-x-3 ${className}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <Loader size="sm" inline className="mr-2" />
            Processing...
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
};

/**
 * Form Error Alert Component
 */
export const FormError = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
      <div className="flex">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="ml-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Form Success Alert Component
 */
export const FormSuccess = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg ${className}`}>
      <div className="flex">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <div className="ml-3">
          <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default {
  Form,
  FormField,
  Input,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  RadioGroup,
  Toggle,
  Slider,
  DateInput,
  FileInput,
  FormActions,
  FormError,
  FormSuccess
};