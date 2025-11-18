// Temporary authentication utility
// This is a workaround until the backend implements the /me endpoint

export interface TempUserData {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'court_recorder' | 'registrar' | 'judge' | 'magistrate' | 'clerk_of_court' | 'transcriber' | 'general_viewer';
  court: string;
  contact_info: string;
}

// Temporary user mapping - this should be replaced with proper backend implementation
const TEMP_USER_MAPPING: Record<string, TempUserData> = {
  'morton@soxfort.com': {
    id: 1,
    name: 'Morton Mabumbo',
    email: 'morton@soxfort.com',
    role: 'super_admin',
    court: 'Administrative',
    contact_info: 'morton@soxfort.com'
  },
  'admin@court.com': {
    id: 2,
    name: 'Admin User',
    email: 'admin@court.com',
    role: 'admin',
    court: 'High Court Harare',
    contact_info: 'admin@court.com'
  },
  // Add more test users as needed
  'test@example.com': {
    id: 3,
    name: 'Test User',
    email: 'test@example.com',
    role: 'court_recorder',
    court: 'Test Court',
    contact_info: 'test@example.com'
  },
  'user@example.com': {
    id: 4,
    name: 'General User',
    email: 'user@example.com',
    role: 'general_viewer',
    court: 'General Court',
    contact_info: 'user@example.com'
  }
};

// Extract email from JWT token (basic implementation)
function extractEmailFromToken(token: string): string | null {
  try {
    // This is a very basic JWT decode - in production, use a proper JWT library
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    console.log('🔍 Decoded token payload:', decoded);
    
    // Try multiple possible email fields
    const email = decoded.email || decoded.sub || decoded.username || decoded.user_email || decoded.user_id;
    
    if (email && typeof email === 'string' && email.includes('@')) {
      return email;
    }
    
    // If no email found, try to extract from other fields
    if (decoded.user && typeof decoded.user === 'object') {
      return decoded.user.email || decoded.user.email_address;
    }
    
    return null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Get current user from token
export function getTempCurrentUser(): TempUserData | null {
  try {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      console.log('🔍 No token found in cookies');
      
      // In development mode, create a temporary admin user
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Creating temporary admin user');
        const devUser = {
          id: 999,
          name: 'Development Admin',
          email: 'dev-admin@court.com',
          role: 'super_admin' as const,
          court: 'Development Court',
          contact_info: 'dev-admin@court.com'
        };
        
        // Set a temporary token
        document.cookie = `token=dev-token-${Date.now()}; path=/; max-age=3600`;
        return devUser;
      }
      
      return null;
    }

    console.log('🔍 Token found, length:', token.length);

    // Try to extract email from token
    const email = extractEmailFromToken(token);
    console.log('🔍 Extracted email from token:', email);

    if (email && TEMP_USER_MAPPING[email]) {
      console.log('🔍 Found exact user mapping for:', email);
      return TEMP_USER_MAPPING[email];
    }

    // Fallback: if the email is morton@soxfort.com, assume super admin
    if (email === 'morton@soxfort.com' || token.includes('morton')) {
      console.log('🔍 Using fallback super admin for morton@soxfort.com');
      return TEMP_USER_MAPPING['morton@soxfort.com'];
    }

    // Additional fallback: try to extract any email-like pattern from token
    if (email && email.includes('@')) {
      console.log('🔍 Creating generic user for email:', email);
      return {
        id: Date.now(), // Use timestamp as temporary ID
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: email,
        role: 'admin', // Default to admin role for unknown users
        court: 'Administrative',
        contact_info: email
      };
    }

    // Last resort: create a generic admin user if we have a token but can't extract email
    console.log('🔍 Creating generic admin user for token (no email extracted)');
    return {
      id: Date.now(),
      name: 'Authenticated User',
      email: 'user@example.com',
      role: 'admin',
      court: 'Administrative',
      contact_info: 'user@example.com'
    };

  } catch (error) {
    console.error('Error getting temp current user:', error);
    return null;
  }
} 