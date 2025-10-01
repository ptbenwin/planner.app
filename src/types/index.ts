export interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type NavigationKey = 'overview' | 'files' | 'history' | 'shared' | 'chat' | 'tools' | 'settings';
export type ThemeMode = 'light' | 'dark';