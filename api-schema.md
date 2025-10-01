# Frontend API Integration Schema

## Overview

This document describes the client-side API integration patterns and schema for the Ben Win Indonesia Employee Portal frontend application. The frontend communicates with the backend API using Firebase Authentication tokens and follows RESTful conventions.

## Authentication Schema

### Firebase Authentication Integration

```typescript
// Authentication configuration
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

// Corporate user validation
interface CorporateUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  domain: string; // Must be 'benwinindonesia.com'
}

// Authentication response
interface AuthenticationResult {
  valid: boolean;
  user?: CorporateUser;
  error?: string;
}
```

### Authentication Flow Schema

```typescript
// Login process
interface LoginFlow {
  step: 'idle' | 'authenticating' | 'validating' | 'success' | 'error';
  user?: CorporateUser;
  error?: AuthError;
}

// Authentication errors
interface AuthError {
  code: string;
  message: string;
  details?: {
    email?: string;
    domain?: string;
    verified?: boolean;
  };
}
```

## API Request Schema

### Base API Configuration

```typescript
// API client configuration
interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

// Standard request headers
interface APIHeaders {
  'Authorization': `Bearer ${string}`;
  'Content-Type': 'application/json';
  'X-Client-Version': string;
  'X-Request-ID': string;
}

// Request wrapper
interface APIRequest<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: APIHeaders;
  data?: T;
  params?: Record<string, string>;
}
```

### Response Schema

```typescript
// Standard API response wrapper
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;
  requestId: string;
}

// Error response structure
interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

## Document Management Schema

### File Upload Schema

```typescript
// File upload request
interface FileUploadRequest {
  file: File;
  department: Department;
  metadata?: FileMetadata;
}

// File metadata
interface FileMetadata {
  description?: string;
  tags?: string[];
  category?: string;
  isConfidential?: boolean;
}

// Department enumeration
type Department = 
  | 'finance' 
  | 'hr' 
  | 'it' 
  | 'operations' 
  | 'marketing' 
  | 'general';

// File upload response
interface FileUploadResponse {
  file: UploadedFile;
  uploadProgress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

// Uploaded file information
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  contentType: string;
  downloadURL: string;
  department: Department;
  uploadedAt: string;
  uploadedBy: string;
  metadata?: FileMetadata;
}
```

### File Management Schema

```typescript
// File list request parameters
interface FileListParams {
  department?: Department;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// File list response
interface FileListResponse {
  files: UploadedFile[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// File operation results  
interface FileOperationResult {
  success: boolean;
  fileId: string;
  operation: 'delete' | 'rename' | 'move';
  message?: string;
}
```

## AI Assistant Schema

### Chat Interface Schema

```typescript
// Chat message types
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sessionId: string;
  department?: Department;
}

// Chat request
interface ChatRequest {
  message: string;
  department?: Department;
  context?: ChatContext;
  sessionId?: string;
}

// Chat context
interface ChatContext {
  previousMessages?: ChatMessage[];
  userRole?: string;
  companyContext?: string;
  urgency?: 'low' | 'medium' | 'high';
}

// Chat response
interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
  usage: {
    tokensUsed: number;
    estimatedCost: number;
  };
  suggestions?: string[];
}
```

### Chat Session Management

```typescript
// Chat session
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  department?: Department;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  isActive: boolean;
}

// Session list response
interface ChatSessionListResponse {
  sessions: ChatSession[];
  total: number;
  hasMore: boolean;
}
```

## Push Notifications Schema

### FCM Integration Schema

```typescript
// FCM token registration
interface FCMTokenRegistration {
  token: string;
  deviceType: 'web' | 'mobile';
  userAgent: string;
  registeredAt: string;
}

// Notification subscription
interface NotificationSubscription {
  topics: string[];
  departments: Department[];
  preferences: NotificationPreferences;
}

// Notification preferences
interface NotificationPreferences {
  enabled: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  priority_filter: 'all' | 'high' | 'urgent';
  department_notifications: boolean;
  company_announcements: boolean;
}
```

### Notification Display Schema

```typescript
// Notification message
interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  department?: Department;
}

// Notification action
interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Notification history
interface NotificationHistory {
  notifications: NotificationMessage[];
  unreadCount: number;
  total: number;
  hasMore: boolean;
}
```

## UI State Management Schema

### Application State Schema

```typescript
// Global application state
interface AppState {
  auth: AuthState;
  documents: DocumentState;
  chat: ChatState;
  notifications: NotificationState;
  ui: UIState;
}

// Authentication state
interface AuthState {
  user: CorporateUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: AuthError;
  loginAttempts: number;
  lastLoginAt?: string;
}

// Document management state
interface DocumentState {
  files: UploadedFile[];
  uploadProgress: Record<string, number>;
  isUploading: boolean;
  selectedDepartment: Department;
  searchQuery: string;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

// Chat state
interface ChatState {
  currentSession?: ChatSession;
  messages: ChatMessage[];
  isTyping: boolean;
  sessions: ChatSession[];
  activeSessionId?: string;
}

// Notification state
interface NotificationState {
  messages: NotificationMessage[];
  unreadCount: number;
  isPermissionGranted: boolean;
  token?: string;
  subscriptions: string[];
}

// UI state
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeTab: 'documents' | 'chat' | 'notifications';
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}
```

## Form Validation Schema

### Document Upload Validation

```typescript
// File validation rules
interface FileValidationRules {
  maxSize: number; // bytes
  allowedTypes: string[]; // MIME types
  allowedExtensions: string[];
  requiredFields: string[];
}

// Validation result
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

// Validation error
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Validation warning
interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}
```

### Corporate Email Validation

```typescript
// Email validation schema
interface EmailValidation {
  domain: string;
  isVerified: boolean;
  isCorporate: boolean;
  format: 'valid' | 'invalid';
}

// Domain validation rules
interface DomainValidationRules {
  allowedDomains: string[];
  requireVerification: boolean;
  blockPersonalDomains: boolean;
  customValidation?: (email: string) => boolean;
}
```

## Error Handling Schema

### Error Types

```typescript
// Application error types
type AppErrorType = 
  | 'authentication'
  | 'authorization' 
  | 'validation'
  | 'network'
  | 'server'
  | 'unknown';

// Structured error
interface AppError {
  type: AppErrorType;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

// Error context
interface ErrorContext {
  component: string;
  action: string;
  userAgent: string;
  url: string;
  timestamp: string;
}
```

### Error Recovery Schema

```typescript
// Recovery action
interface RecoveryAction {
  type: 'retry' | 'refresh' | 'logout' | 'contact_support';
  label: string;
  action: () => void;
}

// Error display
interface ErrorDisplay {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  actions: RecoveryAction[];
  dismissible: boolean;
}
```

## Performance Monitoring Schema

### Metrics Collection

```typescript
// Performance metrics
interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: Record<string, number>;
  uploadSpeed: number;
  errorRate: number;
  userInteractions: InteractionMetric[];
}

// Interaction tracking
interface InteractionMetric {
  action: string;
  component: string;
  timestamp: string;
  duration?: number;
  success: boolean;
}
```

## Configuration Schema

### Environment Configuration

```typescript
// Environment variables schema
interface EnvironmentConfig {
  // Firebase configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    vapidKey: string;
  };
  
  // API configuration
  api: {
    baseURL: string;
    timeout: number;
    retries: number;
  };
  
  // Corporate settings
  corporate: {
    domain: string;
    companyName: string;
    supportEmail: string;
  };
  
  // Feature flags
  features: {
    darkMode: boolean;
    notifications: boolean;
    analytics: boolean;
    debugging: boolean;
  };
}
```

## TypeScript Integration

### Type Guards

```typescript
// Corporate user type guard
function isCorporateUser(user: any): user is CorporateUser {
  return user && 
         typeof user.email === 'string' &&
         user.email.endsWith('@benwinindonesia.com') &&
         user.emailVerified === true;
}

// API response type guard
function isAPIResponse<T>(response: any): response is APIResponse<T> {
  return response &&
         typeof response.success === 'boolean' &&
         typeof response.timestamp === 'string';
}
```

### Generic Types

```typescript
// Generic API hook return type
interface UseAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  refetch: () => Promise<void>;
}

// Generic form state
interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}
```

---

**Schema Version**: 1.0.0  
**Last Updated**: September 28, 2025  
**Compatible With**: Backend API v1.0.0