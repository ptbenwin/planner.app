/**
 * Frontend API Logging Utility for PT Benwin Indonesia
 * Provides comprehensive logging for all API calls when DEBUG=true
 */

export interface ApiLogConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp?: string;
}

export interface ApiResponseLog {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
  duration?: number;
}

class ApiLogger {
  private isDebugEnabled(): boolean {
    return process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Log API request details
   */
  logRequest(config: ApiLogConfig): void {
    if (!this.isDebugEnabled()) return;

    const timestamp = config.timestamp || this.getTimestamp();
    
    console.group(`🌐 === API REQUEST: ${config.method} ===`);
    console.log('🌐 Timestamp:', timestamp);
    console.log('🌐 Method:', config.method);
    console.log('🌐 URL:', config.url);
    
    if (config.headers) {
      console.log('🌐 Headers:');
      Object.entries(config.headers).forEach(([key, value]) => {
        if (key.toLowerCase() === 'authorization') {
          console.log(`🌐   ${key}: Bearer [REDACTED]`);
        } else {
          console.log(`🌐   ${key}: ${value}`);
        }
      });
    }
    
    if (config.body) {
      console.log('🌐 Request Body:');
      if (typeof config.body === 'string') {
        try {
          const parsed = JSON.parse(config.body);
          console.log('🌐', JSON.stringify(parsed, null, 2));
        } catch {
          console.log('🌐', config.body);
        }
      } else {
        console.log('🌐', config.body);
      }
    }
    
    console.groupEnd();
  }

  /**
   * Log API response details
   */
  logResponse(config: ApiLogConfig, response: ApiResponseLog): void {
    if (!this.isDebugEnabled()) return;

    const isSuccess = response.status >= 200 && response.status < 300;
    const icon = isSuccess ? '✅' : '❌';
    
    console.group(`${icon} === API RESPONSE: ${config.method} ${config.url} ===`);
    console.log(`${icon} Status:`, response.status, response.statusText);
    console.log(`${icon} Duration:`, response.duration ? `${response.duration}ms` : 'N/A');
    
    if (Object.keys(response.headers).length > 0) {
      console.log(`${icon} Response Headers:`);
      Object.entries(response.headers).forEach(([key, value]) => {
        console.log(`${icon}   ${key}: ${value}`);
      });
    }
    
    if (response.body) {
      console.log(`${icon} Response Body:`);
      if (typeof response.body === 'object') {
        console.log(`${icon}`, JSON.stringify(response.body, null, 2));
      } else {
        console.log(`${icon}`, response.body);
      }
    }
    
    console.groupEnd();
  }

  /**
   * Log API error details
   */
  logError(config: ApiLogConfig, error: any, duration?: number): void {
    if (!this.isDebugEnabled()) return;

    console.group(`❌ === API ERROR: ${config.method} ${config.url} ===`);
    console.log('❌ Duration:', duration ? `${duration}ms` : 'N/A');
    console.log('❌ Error Type:', error?.constructor?.name || 'Unknown');
    console.log('❌ Error Message:', error?.message || 'No message');
    
    if (error?.stack) {
      console.log('❌ Stack Trace:', error.stack);
    }
    
    if (error?.response) {
      console.log('❌ Response Status:', error.response.status);
      console.log('❌ Response Data:', error.response.data);
    }
    
    console.log('❌ Full Error Object:', error);
    console.groupEnd();
  }

  /**
   * Enhanced fetch wrapper with automatic logging
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const startTime = Date.now();
    const method = options.method || 'GET';
    
    // Log request
    this.logRequest({
      method,
      url,
      headers: options.headers as Record<string, string>,
      body: options.body,
      timestamp: this.getTimestamp()
    });

    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      // Clone response to read body without consuming it
      const responseClone = response.clone();
      let responseBody: any = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          responseBody = await responseClone.json();
        } else {
          const text = await responseClone.text();
          responseBody = text.length > 1000 ? `[Large response: ${text.length} chars]` : text;
        }
      } catch {
        responseBody = '[Unable to parse response body]';
      }

      // Log response
      this.logResponse(
        { method, url },
        {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
          duration
        }
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError({ method, url }, error, duration);
      throw error;
    }
  }

  /**
   * Log custom events and operations
   */
  logEvent(category: string, event: string, data?: any): void {
    if (!this.isDebugEnabled()) return;

    console.group(`🎯 === ${category}: ${event} ===`);
    console.log('🎯 Timestamp:', this.getTimestamp());
    if (data) {
      console.log('🎯 Data:', data);
    }
    console.groupEnd();
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, startTime: number, endTime?: number): void {
    if (!this.isDebugEnabled()) return;

    const end = endTime || Date.now();
    const duration = end - startTime;
    
    console.log(`⏱️ Performance: ${operation} took ${duration}ms`);
  }
}

// Export singleton instance
export const apiLogger = new ApiLogger();

// Export convenience functions
export const logApiRequest = (config: ApiLogConfig) => apiLogger.logRequest(config);
export const logApiResponse = (config: ApiLogConfig, response: ApiResponseLog) => apiLogger.logResponse(config, response);
export const logApiError = (config: ApiLogConfig, error: any, duration?: number) => apiLogger.logError(config, error, duration);
export const logEvent = (category: string, event: string, data?: any) => apiLogger.logEvent(category, event, data);
export const logPerformance = (operation: string, startTime: number, endTime?: number) => apiLogger.logPerformance(operation, startTime, endTime);

// Enhanced fetch with automatic logging
export const fetchWithLogging = (url: string, options?: RequestInit) => apiLogger.fetch(url, options);