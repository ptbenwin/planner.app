/**
 * Backend-only authentication service for PT Benwin Indonesia
 * All Firebase operations are handled by the backend
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  department?: string;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  redirectUrl?: string;
}

class AuthService {
  private baseUrl: string;
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';
    
    // Only check auth status in browser environment
    if (typeof window !== 'undefined') {
      this.checkAuthStatus();
    }
  }

  /**
   * Start Google OAuth flow via backend
   */
  async signInWithGoogle(): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔐 Starting Google OAuth flow via backend');
      }

      // Redirect to backend OAuth endpoint
      const authUrl = `${this.baseUrl}/api/auth/google/login?redirect=${encodeURIComponent(window.location.origin)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out user via backend
   */
  async signOut(): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔐 Signing out via backend');
      }

      const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        this.setUser(null);
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ Sign-out successful');
        }
      } else {
        throw new Error('Sign-out failed');
      }
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      throw error;
    }
  }

  /**
   * Check current authentication status
   */
  async checkAuthStatus(): Promise<User | null> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔍 Checking auth status');
      }

      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const user: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          avatar: data.avatar,
          department: data.department,
          isAuthenticated: true,
        };
        
        this.setUser(user);
        
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ User authenticated:', { email: user.email, name: user.name });
        }
        
        return user;
      } else {
        this.setUser(null);
        return null;
      }
    } catch (error) {
      console.error('❌ Auth status check failed:', error);
      this.setUser(null);
      return null;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Call immediately with current state
    callback(this.user);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Set user and notify listeners
   */
  private setUser(user: User | null): void {
    this.user = user;
    this.listeners.forEach(callback => callback(user));
  }

  /**
   * Handle OAuth callback (called when user returns from Google OAuth)
   */
  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔐 Processing OAuth callback');
      }

      const response = await fetch(`${this.baseUrl}/api/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          avatar: data.user.avatar,
          department: data.user.department,
          isAuthenticated: true,
        };
        
        this.setUser(user);
        
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ OAuth callback successful:', { email: user.email });
        }
        
        return { success: true, user };
      } else {
        console.error('❌ OAuth callback failed:', data.error);
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      return { success: false, error: 'Network error during authentication' };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Validate corporate user (client-side validation)
export function isValidCorporateEmail(email: string): boolean {
  const corporateDomain = process.env.NEXT_PUBLIC_CORPORATE_DOMAIN || 'benwinindonesia.com';
  return email.toLowerCase().endsWith(`@${corporateDomain.toLowerCase()}`);
}

export function getCorporateDomain(): string {
  return process.env.NEXT_PUBLIC_CORPORATE_DOMAIN || 'benwinindonesia.com';
}