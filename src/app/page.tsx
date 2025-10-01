"use client";

import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authService, User, getCorporateDomain } from '@/lib/auth-service';
import { fileUploadService, UploadedFile, FileUploadProgress } from '@/lib/file-service';
import { notificationService, NotificationStatus } from '@/lib/notification-service';
import { NavigationKey, ThemeMode, ChatEntry } from '../types';
import FileHistory from '@/components/FileHistory';
import SharedFiles from '@/components/SharedFiles';
import SmartSearch, { SearchResult } from '@/components/SmartSearch';
import Overview from '@/components/Overview';
import FilesSection from '@/components/FilesSection';
import AIAssistant from '@/components/AIAssistant';
import Settings from '@/components/Settings';
import Tools from '@/components/Tools';

const NAVIGATION: Array<{ id: NavigationKey; label: string; description: string; icon: string }> = [
  { id: 'overview', label: 'Overview', description: 'Company insights & health', icon: '📊' },
  { id: 'files', label: 'Files', description: 'Secure document workspace', icon: '📁' },
  { id: 'history', label: 'History', description: 'Audit logs & traceability', icon: '🗂️' },
  { id: 'shared', label: 'Shared', description: 'Files shared with me', icon: '📤' },
  { id: 'chat', label: 'AI Assistant', description: 'Ask Gemini for guidance', icon: '🤖' },
  { id: 'tools', label: 'Tools', description: 'Automation & workflow boosters', icon: '🛠️' },
  { id: 'settings', label: 'Settings', description: 'Profile, security & preferences', icon: '⚙️' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value < 10 && index > 0 ? value.toFixed(1) : Math.round(value)} ${units[index]}`;
}

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavigationKey>('overview');

  const [department, setDepartment] = useState<string>('general');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const [prompt, setPrompt] = useState('Saya membutuhkan bantuan dengan planning project untuk PT Benwin Indonesia');
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [lastAssistantReply, setLastAssistantReply] = useState('');

  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>({ isSupported: false, isSubscribed: false });
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);

  const backend = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';



  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('planner-theme') as ThemeMode | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('planner-theme', theme);
    }
  }, [theme]);

  const loadUserFiles = useCallback(async (currentUser: User | null) => {
    if (!currentUser) return;
    try {
      const userFiles = await fileUploadService.getUserFiles();
      setFiles(userFiles);
    } catch (error) {
      console.error('❌ Failed to load files:', error);
    }
  }, []);

  const initializeNotifications = useCallback(async (currentUser: User | null, currentDepartment: string) => {
    try {
      const status = await notificationService.initializeNotifications();
      setNotificationStatus(status);

      if (status.isSupported && currentUser) {
        await notificationService.subscribeToCompanyNotifications(currentDepartment || 'general');
        setNotificationStatus(prev => ({ ...prev, isSubscribed: true }));
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('🔐 Auth state changed:', nextUser ? `${nextUser.email} logged in` : 'User logged out');
      }

      setUser(nextUser);

      if (nextUser) {
        loadUserFiles(nextUser);
        initializeNotifications(nextUser, department);
      } else {
        setFiles([]);
        setRecentUploads([]);
        setNotificationStatus({ isSupported: false, isSubscribed: false });
      }
    });

    return unsubscribe;
  }, [department, initializeNotifications, loadUserFiles]);

  useEffect(() => {
    if (!user || !notificationStatus.isSupported) return;
    notificationService
      .subscribeToCompanyNotifications(department || 'general')
      .then(() => setNotificationStatus(prev => ({ ...prev, isSubscribed: true })))
      .catch((error) => console.error('❌ Failed to refresh notification topics:', error));
  }, [department, notificationStatus.isSupported, user]);

  useEffect(() => {
    if (!isSidebarOpen && !isProfileMenuOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isProfileMenuOpen && !target.closest('.profile-switcher')) {
        setProfileMenuOpen(false);
      }
      if (isSidebarOpen && !target.closest('.app-sidebar') && !target.closest('.sidebar-trigger')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isProfileMenuOpen, isSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      authService.handleOAuthCallback(code).then((result) => {
        if (!result.success) {
          alert(`Authentication failed: ${result.error}`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (error) {
      alert(`Authentication error: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('❌ Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Login failed: ${errorMessage}`);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authService.signOut();
      setFiles([]);
      setRecentUploads([]);
      setDownloadURL(null);
      setNotificationStatus({ isSupported: false, isSubscribed: false });
      setChatHistory([]);
      setLastAssistantReply('');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!user || !file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await fileUploadService.uploadFile(
        file,
        department || 'general',
        (progress: FileUploadProgress) => {
          console.log('📊 Frontend received progress:', progress);
          setUploadProgress(progress.percentage);
        },
      );

      if (!result.success || !result.file) {
        throw new Error(result.error || 'Upload failed');
      }

      setDownloadURL(result.file.downloadUrl);
      setRecentUploads(prev => [result.file!, ...prev].slice(0, 5));
      setFile(null);

      notificationService.showInAppNotification(
        'Upload Successful!',
        `${result.file.originalName || result.file.name} has been uploaded successfully`,
        'success',
      );

      await loadUserFiles(user);
    } catch (error) {
      console.error('❌ Upload error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [department, file, loadUserFiles, user]);

  const handleSendMessage = useCallback(async () => {
    if (!user || !prompt.trim()) return;

    const userMessage: ChatEntry = {
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setPrompt('');

    try {
      const response = await fetch(`${backend}/api/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: userMessage.content,
          department: department || 'general',
          context: 'User is an employee of PT Benwin Indonesia seeking assistance',
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.json();
      const replyText = data.text || 'AI assistant responded without text content.';
      const assistantMessage: ChatEntry = {
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
      };

      setLastAssistantReply(replyText);
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ Gemini error:', error);
      const assistantMessage: ChatEntry = {
        role: 'assistant',
        content: '⚠️ AI assistant encountered an issue. Please try again shortly.',
        timestamp: new Date().toISOString(),
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    }
  }, [backend, department, prompt, user]);

  const sendTestNotification = useCallback(async () => {
    if (!user) return;

    try {
      const success = await notificationService.sendTestNotification(
        'Company Announcement Test',
        `${user.name || user.email} triggered a broadcast notification`,
        department || undefined,
      );

      if (success) {
        notificationService.showInAppNotification(
          'Test notification sent',
          'Employees will receive a preview momentarily.',
          'success',
        );
      } else {
        throw new Error('Notification service reported a failure');
      }
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      alert('Failed to send test notification. Please verify your notification configuration.');
    }
  }, [department, user]);

  const toggleTheme = useCallback(() => {
    setTheme((prev: ThemeMode) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current += 1;

    if (!isDragActive) {
      setIsDragActive(true);
    }
  }, [isDragActive]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }, [isDragActive]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      dragCounterRef.current = Math.max(dragCounterRef.current - 1, 0);

      if (dragCounterRef.current === 0) {
        setIsDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragActive(false);

    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles || !droppedFiles.length) {
      return;
    }

    const droppedFile = droppedFiles[0];
    setFile(droppedFile);

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('📁 File dropped into uploader:', {
        name: droppedFile.name,
        size: droppedFile.size,
        type: droppedFile.type,
      });
    }

    notificationService.showInAppNotification(
      'File ready to upload',
      `${droppedFile.name} selected from drag & drop`,
      'success',
    );

    event.dataTransfer?.clearData();
  }, []);

  const handleDragEnd = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDragActive(false);
  }, []);

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    setSelectedSearchResult(result);
    setActiveSection('files'); // Switch to files section to show the result
    
    // Show notification about the selected file
    notificationService.showInAppNotification(
      'File Found',
      `Selected: ${result.originalName || result.fileName}`,
      'success'
    );

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('🔍 Search result selected:', result);
    }
  }, []);

  const activeNavigation = useMemo(
    () => NAVIGATION.find(item => item.id === activeSection) ?? NAVIGATION[0],
    [activeSection],
  );

  const orderedFiles = useMemo(() => {
    const combined = [...recentUploads, ...files];
    const unique = new Map<string, UploadedFile>();
    combined.forEach((item) => {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
    });
    return Array.from(unique.values()).sort((a, b) => (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, [files, recentUploads]);

  const stats = useMemo(() => {
    const totalDocuments = files.length;
    const totalBytes = files.reduce((acc, item) => acc + (item.size || 0), 0);
    const departmentsCovered = new Set(files.map(fileItem => fileItem.department || 'general'));
    const latest = orderedFiles[0];

    return {
      totalDocuments,
      totalBytes: formatBytes(totalBytes),
      departments: departmentsCovered.size,
      latestUpload: latest ? formatDateTime(latest.createdAt) : '—',
    };
  }, [files, orderedFiles]);

  const renderOverview = () => (
    <Overview
      user={user}
      files={files}
      orderedFiles={orderedFiles}
      lastAssistantReply={lastAssistantReply}
      notificationStatus={notificationStatus}
      stats={stats}
    />
  );

  const renderFiles = () => (
    <FilesSection
      user={user}
      department={department}
      setDepartment={setDepartment}
      file={file}
      setFile={setFile}
      orderedFiles={orderedFiles}
      downloadURL={downloadURL}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      isDragActive={isDragActive}
      setIsDragActive={setIsDragActive}
      selectedSearchResult={selectedSearchResult}
      setSelectedSearchResult={setSelectedSearchResult}
      handleUpload={handleUpload}
      handleDragEnter={handleDragEnter}
      handleDragOver={handleDragOver}
      handleDragLeave={handleDragLeave}
      handleDragEnd={handleDragEnd}
      handleDrop={handleDrop}
    />
  );

  const renderHistory = () => (
    <section className="section-stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">File history & audit logs</h3>
            <p className="panel__description">Track every upload, share, and deletion for compliance-ready reporting.</p>
          </div>
        </div>
        <FileHistory />
      </div>
    </section>
  );

  const renderShared = () => (
    <SharedFiles />
  );

  const renderChat = () => (
    <AIAssistant
      user={user}
      prompt={prompt}
      setPrompt={setPrompt}
      chatHistory={chatHistory}
      handleSendMessage={handleSendMessage}
    />
  );

  const renderTools = () => (
    <Tools />
  );

  const renderSettings = () => (
    <Settings
      user={user}
      theme={theme}
      department={department}
      setDepartment={setDepartment}
      notificationStatus={notificationStatus}
      toggleTheme={toggleTheme}
      sendTestNotification={sendTestNotification}
    />
  );

  const renderSection = () => {
    if (!user) {
      return (
        <section className="section-stack">
          <div className="panel" style={{ textAlign: 'center', alignItems: 'center' }}>
            <h2 className="panel__title">Welcome to Benwin Employee Portal</h2>
            <p className="panel__description" style={{ maxWidth: 520 }}>
              Sign in with your corporate Google account (@{getCorporateDomain()}) to access secure document workflows, Gemini assistance, and company notifications.
            </p>
            <button className="btn btn-primary" onClick={handleLogin}>Sign in securely</button>
            <div className="settings-card" style={{ maxWidth: 420 }}>
              <h4 style={{ margin: 0 }}>Corporate access policies</h4>
              <ul style={{ margin: '8px 0', paddingLeft: 20, textAlign: 'left', color: 'var(--text-secondary)' }}>
                <li>Only verified @ {getCorporateDomain()} accounts are permitted.</li>
                <li>Session cookies expire automatically after 7 days.</li>
                <li>Uploads and AI queries are logged for compliance.</li>
              </ul>
            </div>
          </div>
        </section>
      );
    }

    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'files':
        return renderFiles();
      case 'history':
        return renderHistory();
      case 'shared':
        return renderShared();
      case 'chat':
        return renderChat();
      case 'tools':
        return renderTools();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className={`app-shell ${isSidebarOpen ? 'is-sidebar-open' : ''}`}>
      <aside className="app-sidebar">
        <div className="app-sidebar__header">
          <span className="brand">
            <span className="brand-mark">BW</span>
            Benwin Planner
          </span>
          <button className="btn-icon sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAVIGATION.map((item) => {
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                className={`sidebar-nav__item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="icon" aria-hidden>{item.icon}</span>
                <span className="sidebar-nav__texts">
                  <span className="sidebar-nav__label">{item.label}</span>
                  <span className="sidebar-nav__description">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-card">
            <span className="sidebar-card__title">Workspace status</span>
            <div className="sidebar-card__actions">
              <span className={`status-pill ${notificationStatus.isSubscribed ? 'success' : 'warning'}`}>
                {notificationStatus.isSubscribed ? 'Subscribed' : 'Pending'}
              </span>
              <button className="btn-ghost" onClick={toggleTheme}>
                {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-left">
            <button className="btn-icon sidebar-trigger" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <div className="header-title-group">
              <h1 className="header-title">{activeNavigation.label}</h1>
              <span className="header-subtitle">{activeNavigation.description}</span>
            </div>
          </div>

          <div className="header-actions">
            <SmartSearch
              onResultSelect={handleSearchResultSelect}
              placeholder="Search documents with AI - try 'invoice keuangan' or 'meeting notes'"
              department={department}
              initiallyCollapsed={false}
            />
            <button className="btn-icon" aria-label="Notification status" title={notificationStatus.isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}>
              {notificationStatus.isSubscribed ? '🔔' : '🔕'}
            </button>
            <button className="btn-icon" aria-label="Toggle theme" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="profile-switcher">
              {user ? (
                <button className="profile-button" onClick={() => setProfileMenuOpen(prev => !prev)}>
                  <span className="profile-avatar">{user.name?.[0] ?? user.email[0]}</span>
                  <span className="profile-meta">
                    <span style={{ fontWeight: 600 }}>{user.name || user.email}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{department} • {theme === 'light' ? 'Light' : 'Dark'} mode</span>
                  </span>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleLogin}>Sign in</button>
              )}

              {isProfileMenuOpen && user && (
                <div className="profile-menu">
                  <button className="btn-ghost" onClick={() => setActiveSection('settings')}>View profile & settings</button>
                  <button className="btn-ghost" onClick={toggleTheme}>Toggle theme</button>
                  <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          {renderSection()}
        </main>
      </div>

      <div
        className={`mobile-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        role="presentation"
      />
    </div>
  );
}
