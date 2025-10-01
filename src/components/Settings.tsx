"use client";

import { User, getCorporateDomain } from '@/lib/auth-service';
import { fileUploadService } from '@/lib/file-service';
import { NotificationStatus } from '@/lib/notification-service';

interface SettingsProps {
  user: User | null;
  theme: 'light' | 'dark';
  department: string;
  setDepartment: (dept: string) => void;
  notificationStatus: NotificationStatus;
  toggleTheme: () => void;
  sendTestNotification: () => void;
}

const DEPARTMENTS = [
  { value: 'general', label: 'General' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'it', label: 'Information Technology' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'procurement', label: 'Procurement' },
];

export default function Settings({
  user,
  theme,
  department,
  setDepartment,
  notificationStatus,
  toggleTheme,
  sendTestNotification
}: SettingsProps) {
  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Account preferences</h3>
            <p className="panel__description">Control appearance, departments, and notification preferences for your session.</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Appearance</h4>
            <p className="section-description">Switch between light and dark mode globally.</p>
            <div className="toggle-row">
              <span>{theme === 'light' ? 'Light theme' : 'Dark theme'}</span>
              <button className="btn btn-secondary" onClick={toggleTheme}>
                Toggle theme
              </button>
            </div>
          </div>

          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Default department</h4>
            <p className="section-description">Set the primary department for uploads and AI context.</p>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              {DEPARTMENTS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Push notifications</h4>
            <p className="section-description">Status: {notificationStatus.isSupported ? 'Browser supported' : 'Unsupported in this browser'}.</p>
            <button className="btn btn-primary" onClick={sendTestNotification} disabled={!notificationStatus.isSupported || !user}>
              Send test announcement
            </button>
          </div>

          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Debug Testing</h4>
            <p className="section-description">Test API calls and logging functionality.</p>
            <div className="toggle-row">
              <button 
                className="btn btn-secondary" 
                onClick={async () => {
                  console.log('🧪 Testing debug logging system...');
                  console.group('🧪 API Test Group');
                  console.info('Testing info level logging');
                  console.warn('Testing warning level logging');
                  console.error('Testing error level logging');
                  console.log('Debug console should show this message');
                  console.groupEnd();
                  
                  // Test API call
                  if (user) {
                    try {
                      console.log('🧪 Testing file list API call...');
                      await fileUploadService.getUserFiles();
                      console.log('🧪 File list API test completed');
                    } catch (error) {
                      console.error('🧪 File list API test failed:', error);
                    }
                  }
                }}
              >
                Test Debug Logging
              </button>
              <span className="section-description">Look for the 🐛 button (bottom-right) or press Ctrl+`</span>
            </div>
          </div>

          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Profile</h4>
            <p className="section-description">Signed in as {user?.email ?? 'guest'}. Corporate domain enforced: @{getCorporateDomain()}.</p>
            <div className="toggle-row">
              <span>Session security</span>
              <span className="status-pill success">Active</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}