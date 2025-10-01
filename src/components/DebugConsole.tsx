"use client";

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'group' | 'groupEnd';
  message: string;
  data?: any[];
}

export default function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Only show in debug mode
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDebugMode) return;

    // Intercept console methods
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      group: console.group,
      groupEnd: console.groupEnd,
    };

    const addLog = (level: LogEntry['level'], args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-499), { // Keep last 500 logs
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data: args
      }]);
    };

    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args);
      addLog('log', args);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      addLog('info', args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addLog('error', args);
    };

    console.group = (...args) => {
      originalConsole.group(...args);
      addLog('group', args);
    };

    console.groupEnd = () => {
      originalConsole.groupEnd();
      addLog('groupEnd', []);
    };

    // Cleanup function
    return () => {
      Object.assign(console, originalConsole);
    };
  }, [isDebugMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    if (!isDebugMode) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDebugMode]);

  if (!isDebugMode) return null;

  const clearLogs = () => setLogs([]);

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'group': return 'text-green-400 font-bold';
      case 'groupEnd': return 'text-gray-500';
      default: return 'text-gray-300';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isVisible && (
        <div 
          className="debug-console-overlay"
          onClick={() => setIsVisible(false)}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`debug-console-toggle ${isVisible ? 'debug-console-toggle--active' : ''}`}
        title="Toggle Debug Console (Ctrl + `) - Frontend API Logging"
      >
        {isVisible ? '✕' : '🐛'}
      </button>

      {/* Debug Console - Slide from Right */}
      <div className={`debug-console-panel ${isVisible ? 'debug-console-panel--visible' : ''}`}>
        {/* Header */}
        <div className="debug-console-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-orange-400">🐛</span>
              <div>
                <div className="font-bold">Debug Console</div>
                <div className="text-xs text-gray-400">Frontend API Logger</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearLogs}
                className="debug-btn debug-btn--danger"
                title="Clear Logs"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="debug-btn debug-btn--primary"
                title="Minimize/Restore"
              >
                {isMinimized ? '⬆️' : '⬇️'}
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="debug-btn debug-btn--secondary"
                title="Close Console"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Logs Container */}
        {!isMinimized && (
          <div className="debug-console-content">
            <div className="debug-console-stats">
              <span className="debug-stat">
                <span className="debug-stat-label">Total Logs:</span>
                <span className="debug-stat-value">{logs.length}</span>
              </span>
              <span className="debug-stat">
                <span className="debug-stat-label">Errors:</span>
                <span className="debug-stat-value debug-stat-value--error">
                  {logs.filter(l => l.level === 'error').length}
                </span>
              </span>
              <span className="debug-stat">
                <span className="debug-stat-label">API Calls:</span>
                <span className="debug-stat-value debug-stat-value--info">
                  {logs.filter(l => l.message.includes('API')).length}
                </span>
              </span>
            </div>

            <div className="debug-console-logs">
              {logs.length === 0 ? (
                <div className="debug-console-empty">
                  <div className="debug-console-empty-icon">📝</div>
                  <div className="debug-console-empty-title">No logs yet</div>
                  <div className="debug-console-empty-subtitle">
                    API calls and events will appear here in real-time
                  </div>
                  <div className="debug-console-empty-hint">
                    Try uploading a file or using the search to see logs
                  </div>
                </div>
              ) : (
                <div className="debug-log-list">
                  {logs.map((log, index) => (
                    <div key={index} className={`debug-log-entry debug-log-entry--${log.level}`}>
                      <div className="debug-log-header">
                        <span className="debug-log-timestamp">{log.timestamp}</span>
                        <span className={`debug-log-level debug-log-level--${log.level}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="debug-log-message">
                        {log.message}
                      </div>
                      {log.data && log.data.length > 0 && (
                        <div className="debug-log-data">
                          {log.data.map((item, i) => (
                            <div key={i} className="debug-log-data-item">
                              {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="debug-console-footer">
          <div className="debug-console-footer-left">
            <span className="debug-console-shortcut">Ctrl+` to toggle</span>
            <span className="debug-console-version">v1.0</span>
          </div>
          <div className="debug-console-footer-right">
            <span className="debug-console-status">
              {isVisible ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}