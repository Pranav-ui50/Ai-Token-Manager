/**
 * Avatar Component
 *
 * User avatar with initials fallback.
 */

// Get the backend base URL for serving static files
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace('/api', '');

function Avatar({ src, alt, name, size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getColorFromName = (name) => {
    const colors = [
      'bg-red-100 text-red-700',
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700'
    ];
    const hash = name?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  // Process avatar URL - prepend backend URL if it's a relative path
  const getAvatarUrl = (avatarSrc) => {
    if (!avatarSrc) return null;
    // If it's already a full URL, use it as is
    if (avatarSrc.startsWith('http://') || avatarSrc.startsWith('https://')) {
      return avatarSrc;
    }
    // Otherwise, prepend the backend URL
    return `${BACKEND_URL}${avatarSrc}`;
  };

  const avatarUrl = getAvatarUrl(src);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt || name || 'Avatar'}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium ${getColorFromName(name)} ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
