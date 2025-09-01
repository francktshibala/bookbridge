'use client';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ApiAdapter {
  private static getBaseUrl(): string {
    // Check if we're in a Capacitor native environment
    if (typeof window !== 'undefined') {
      try {
        // Dynamic import to avoid SSR issues
        import('@capacitor/core').then(({ Capacitor }) => {
          if (Capacitor.isNativePlatform()) {
            return 'https://bookbridge.onrender.com';
          }
        });
      } catch {
        // Capacitor not available, continue with web logic
      }
    }

    // Server-side or web environment
    if (typeof window === 'undefined') {
      // Server-side: use environment variables
      return process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    }

    // Client-side web: use relative URLs (current behavior)
    return '';
  }

  static async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = this.getBaseUrl();
    const url = endpoint.startsWith('/api') ? `${baseUrl}${endpoint}` : `${baseUrl}/api${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    console.log(`🌐 API Call: ${url}`);
    
    return fetch(url, {
      ...options,
      headers: defaultHeaders,
    });
  }

  static async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(endpoint, {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API GET failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async post<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API POST failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async put<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API PUT failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(endpoint, {
      method: 'DELETE',
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API DELETE failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Helper method to check if we're in native environment
  static async isNativeEnvironment(): Promise<boolean> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  // Get the appropriate API base URL for the current environment
  static async getApiBaseUrl(): Promise<string> {
    const isNative = await this.isNativeEnvironment();
    
    if (isNative) {
      return 'https://bookbridge.onrender.com';
    }
    
    // Web environment uses relative URLs
    return '';
  }
}

// Legacy export for backward compatibility
export const apiClient = {
  get: ApiAdapter.get.bind(ApiAdapter),
  post: ApiAdapter.post.bind(ApiAdapter),
  put: ApiAdapter.put.bind(ApiAdapter),
  delete: ApiAdapter.delete.bind(ApiAdapter),
  fetch: ApiAdapter.fetch.bind(ApiAdapter),
};