// Development authentication helper
// This creates a temporary admin user for testing when the real auth system isn't working

export const createDevAdminUser = () => {
  if (typeof window === 'undefined') return null;
  
  // Check if we're in development mode
  if (process.env.NODE_ENV !== 'development') return null;
  
  // Create a temporary admin user
  const devUser = {
    id: 999,
    name: 'Development Admin',
    email: 'dev-admin@court.com',
    role: 'super_admin' as const,
    court: 'Development Court',
    contact_info: 'dev-admin@court.com'
  };
  
  // Set a temporary token in cookies
  document.cookie = `token=dev-token-${Date.now()}; path=/; max-age=3600`; // 1 hour
  
  console.log('🔧 Development mode: Created temporary admin user:', devUser);
  return devUser;
};

export const isDevelopmentMode = () => {
  return process.env.NODE_ENV === 'development';
};

export const shouldUseDevAuth = () => {
  if (!isDevelopmentMode()) return false;
  
  // Check if we have a real token
  const realToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('token=') && !row.includes('dev-token'))
    ?.split('=')[1];
  
  return !realToken;
};
