# Ben Win Indonesia - Employee Portal Frontend

## 🖥️ Overview

The frontend application for the Ben Win Indonesia Employee Portal, built with Next.js 14, TypeScript, and React. This modern web application provides a responsive and intuitive interface for corporate employees to access document management, AI assistance, and push notifications.

## 🔐 Corporate Authentication

**SECURITY REQUIREMENT**: Only users with `@benwinindonesia.com` email addresses can access the application.

### Authentication Features
- **Google OAuth Integration** with hosted domain restriction
- **Real-time Email Validation** before access is granted
- **Email Verification Enforcement** through Firebase
- **Automatic Session Management** with secure token handling
- **Corporate Domain Validation** on both client and server

## 🚀 Features

### 📄 Document Management Interface
- **Drag & Drop Upload** with real-time progress tracking
- **Department Selection** for organized file storage
- **File Type Validation** (PDF, XLSX, DOCX, PPTX, Images)
- **My Documents View** with metadata display
- **Download & Share** functionality
- **File Size Validation** (max 10MB)

### 🤖 AI Assistant Chat Interface
- **Interactive Chat UI** with message history
- **Indonesian & English Support** with automatic language detection
- **Department Context** for personalized responses
- **Real-time Response Streaming** for better UX
- **Copy & Share Responses** functionality
- **Chat Session Management** 

### 📱 Push Notifications
- **Real-time Notifications** via Firebase Cloud Messaging
- **Background Service Worker** for offline notifications
- **Notification History** and management
- **Department-specific Subscriptions** 
- **Company-wide Announcements** display

## 🏗️ Technology Stack

### Core Technologies
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **React 18** - Component-based UI library
- **Tailwind CSS** - Utility-first CSS framework

### Firebase Integration
- **Firebase Auth** - Corporate authentication
- **Firebase Storage** - File upload and management
- **Firebase Cloud Messaging** - Push notifications
- **Firebase Web SDK v9** - Modular Firebase integration

## 📋 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager
- Firebase project with Web App configured
- Corporate Google Workspace setup

### Installation

1. **Clone and Setup**
```bash
cd frontend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```

3. **Development Server**
```bash
npm run dev
# Application available at http://localhost:3000
```

4. **Production Build**
```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables (.env.local)

```bash
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Backend API Configuration
NEXT_PUBLIC_API_BASE=http://localhost:8080

# Corporate Authentication (Required)
NEXT_PUBLIC_CORPORATE_DOMAIN=benwinindonesia.com
```

## 🔒 Security Implementation

### Corporate Email Validation
```typescript
// Frontend validation before authentication
export function isCorporateEmail(email: string): boolean {
  return email.endsWith(`@${getCorporateDomain()}`);
}

export function isValidCorporateUser(user: any): ValidationResult {
  if (!isCorporateEmail(user.email)) {
    return {
      valid: false,
      error: "Access denied. Please use your @benwinindonesia.com email."
    };
  }
  
  if (!user.emailVerified) {
    return {
      valid: false,
      error: "Please verify your corporate email address."
    };
  }
  
  return { valid: true };
}
```

### Authentication Flow
1. User clicks "Login with Corporate Google Account"
2. Google OAuth popup opens with domain restriction
3. User authenticates with `@benwinindonesia.com` account
4. Frontend validates email domain and verification status  
5. If invalid, user is signed out with error message
6. If valid, user gains access to the portal
7. Firebase ID token is included in all API requests

## 🚀 Deployment

### Build Process
```bash
# Production build
npm run build

# Start production server
npm start
```

### Deployment Platforms

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

#### Netlify
```bash
# Build command: npm run build
# Publish directory: out
# Environment variables: Set in Netlify dashboard
```

## 📚 API Integration

### Backend Communication
```typescript
// Authenticated API requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const token = await user.getIdToken();
  
  return fetch(`${process.env.NEXT_PUBLIC_API_BASE}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};
```

## 🆘 Troubleshooting

### Common Issues

#### Authentication Problems
- **Issue**: "Corporate email required" error
- **Solution**: Ensure user has `@benwinindonesia.com` email address
- **Check**: Email verification status in Firebase

#### File Upload Issues  
- **Issue**: Upload fails with CORS error
- **Solution**: Configure Firebase Storage CORS settings
- **Check**: File size limits and allowed types

### Support Contacts
- **IT Support**: it@benwinindonesia.com
- **Firebase Issues**: Check Firebase Console status
- **Authentication Problems**: Verify Google Workspace settings

---

**Built for Ben Win Indonesia Employees**  
*Secure • Modern • User-Friendly*
