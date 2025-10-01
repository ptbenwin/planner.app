/**
 * Backend-only notification service for PT Benwin Indonesia
 * All FCM operations are handled by the backend
 */

export interface NotificationStatus {
  isSupported: boolean;
  isSubscribed: boolean;
  token?: string;
}

export interface NotificationSubscription {
  topic: string;
  success: boolean;
  error?: string;
}

class NotificationService {
  private baseUrl: string;
  private status: NotificationStatus = { isSupported: false, isSubscribed: false };

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';
    this.initializeNotifications();
  }

  /**
   * Initialize notifications via backend
   */
  async initializeNotifications(): Promise<NotificationStatus> {
    try {
      if (typeof window === 'undefined') {
        return { isSupported: false, isSubscribed: false };
      }

      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔔 Initializing notifications via backend');
      }

      // Check if browser supports notifications
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('⚠️ Browser does not support notifications');
        this.status = { isSupported: false, isSubscribed: false };
        return this.status;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        this.status = { isSupported: false, isSubscribed: false };
        return this.status;
      }

      // Register service worker for notifications
      await this.registerServiceWorker();

      // Get subscription status from backend
      const response = await fetch(`${this.baseUrl}/api/notifications/status`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.status = {
          isSupported: true,
          isSubscribed: data.isSubscribed,
          token: data.token,
        };

        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ Notifications initialized:', this.status);
        }
      } else {
        this.status = { isSupported: true, isSubscribed: false };
      }

      return this.status;
    } catch (error) {
      console.error('❌ Notification initialization failed:', error);
      this.status = { isSupported: false, isSubscribed: false };
      return this.status;
    }
  }

  /**
   * Register service worker for notifications
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw-notifications.js');
      
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('✅ Service worker registered:', registration);
      }
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to company notifications
   */
  async subscribeToCompanyNotifications(department?: string): Promise<NotificationSubscription[]> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔔 Subscribing to company notifications');
      }

      const response = await fetch(`${this.baseUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          topics: [
            'pt-benwin-announcements',
            ...(department ? [`pt-benwin-${department.toLowerCase()}`] : [])
          ]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.status.isSubscribed = true;

        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ Subscribed to notifications:', data.subscriptions);
        }

        return data.subscriptions || [];
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      console.error('❌ Notification subscription failed:', error);
      return [{ topic: 'error', success: false, error: error instanceof Error ? error.message : 'Unknown error' }];
    }
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribeFromNotifications(): Promise<boolean> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔕 Unsubscribing from notifications');
      }

      const response = await fetch(`${this.baseUrl}/api/notifications/unsubscribe`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        this.status.isSubscribed = false;
        
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ Unsubscribed from notifications');
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Send test notification (admin feature)
   */
  async sendTestNotification(title: string, body: string, department?: string): Promise<boolean> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('📢 Sending test notification');
      }

  const response = await fetch(`${this.baseUrl}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          body,
          department,
          priority: 'high'
        }),
      });

      const success = response.ok;
      
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(success ? '✅ Test notification sent' : '❌ Test notification failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Test notification error:', error);
      return false;
    }
  }

  /**
   * Get current notification status
   */
  getStatus(): NotificationStatus {
    return this.status;
  }

  /**
   * Show in-app notification
   */
  showInAppNotification(title: string, body: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    // Simple in-app notification implementation
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };

    notification.style.backgroundColor = colors[type];
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
      <div>${body}</div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);

    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();