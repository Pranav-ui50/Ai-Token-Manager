/**
 * Loader Component
 *
 * A unified loading spinner component used across the application.
 * Supports different sizes and can be used inline or as a full-page loader.
 */

const Loader = ({
  size = 'md',
  fullPage = false,
  className = '',
  text = ''
}) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-t border-b',
    md: 'h-8 w-8 border-t-2 border-b-2',
    lg: 'h-12 w-12 border-t-2 border-b-2',
    xl: 'h-16 w-16 border-t-4 border-b-4'
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-[#DC2626] ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        {spinner}
        {text && (
          <p className="mt-4 text-sm text-gray-500">{text}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {spinner}
      {text && (
        <span className="ml-2 text-sm text-gray-500">{text}</span>
      )}
    </div>
  );
};

export default Loader;