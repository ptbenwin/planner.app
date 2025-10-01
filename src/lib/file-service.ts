/**
 * Backend-only file upload service for PT Benwin Indonesia
 * All Firebase Storage operations are handled by the backend
 */

import { fetchWithLogging, logEvent, logPerformance } from './api-logger';

export interface FileUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  downloadUrl: string;
  department: string;
  createdAt: string;
  uploadedBy: string;
}

export interface UploadResponse {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

export interface ShareFileResult {
  success: boolean;
  message?: string;
  fileId?: string;
  sharedWith?: string[];
  shareUrl?: string;
  validEmails?: string[];
  invalidEmails?: string[];
  error?: string;
}

export interface SharedFileInfo {
  fileId: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  department: string;
  sharedBy: string;
  sharedAt: string;
  downloadUrl: string;
  description?: string;
}

class FileUploadService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';
  }

  /**
   * Upload file to backend (which handles Firebase Storage)
   */
  async uploadFile(
    file: File,
    department: string = 'general',
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadResponse> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('📁 Starting file upload:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          department
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('department', department);
      formData.append('originalName', file.name);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress tracking
        if (onProgress) {
          console.log('🔧 Setting up progress tracking...');
          
          xhr.upload.addEventListener('loadstart', () => {
            console.log('📤 Upload started');
            onProgress({
              bytesTransferred: 0,
              totalBytes: file.size,
              percentage: 0
            });
          });

          xhr.upload.addEventListener('progress', (event) => {
            console.log('📊 Progress event:', {
              lengthComputable: event.lengthComputable,
              loaded: event.loaded,
              total: event.total
            });
            
            if (event.lengthComputable) {
              const progress: FileUploadProgress = {
                bytesTransferred: event.loaded,
                totalBytes: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              
              console.log(`📊 Upload progress: ${progress.percentage}% (${progress.bytesTransferred}/${progress.totalBytes} bytes)`);
              onProgress(progress);
            } else {
              console.log('📊 Progress not computable, using indeterminate progress');
              // For indeterminate progress, we can show a pulsing animation
              onProgress({
                bytesTransferred: 0,
                totalBytes: file.size,
                percentage: -1 // Use -1 to indicate indeterminate
              });
            }
          });

          xhr.upload.addEventListener('load', () => {
            console.log('📤 Upload load complete');
            onProgress({
              bytesTransferred: file.size,
              totalBytes: file.size,
              percentage: 100
            });
          });
        }

        // Handle completion
        xhr.addEventListener('load', () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              
              if (response.success) {
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  console.log('✅ File upload successful:', response.file);
                }
                resolve(response);
              } else {
                console.error('❌ Upload failed:', response.error);
                resolve({ success: false, error: response.error });
              }
            } else {
              const errorText = xhr.responseText || xhr.statusText;
              console.error('❌ Upload HTTP error:', xhr.status, errorText);
              resolve({ success: false, error: `Upload failed: ${errorText}` });
            }
          } catch (error) {
            console.error('❌ Upload response parsing error:', error);
            resolve({ success: false, error: 'Invalid response from server' });
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          console.error('❌ Upload network error');
          resolve({ success: false, error: 'Network error during upload' });
        });

        xhr.addEventListener('abort', () => {
          console.log('⚠️ Upload aborted');
          resolve({ success: false, error: 'Upload was cancelled' });
        });

        // Start upload
        xhr.open('POST', `${this.baseUrl}/api/files/upload`);
        xhr.withCredentials = true; // Include cookies for authentication
        xhr.send(formData);
      });

    } catch (error) {
      console.error('❌ Upload initialization error:', error);
      return { success: false, error: 'Failed to start upload' };
    }
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(): Promise<UploadedFile[]> {
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('📂 Fetching user files');
      }

      const response = await fetch(`${this.baseUrl}/api/files/user`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log('✅ User files loaded:', data.files?.length || 0, 'files');
        }
        
        return data.files || [];
      } else {
        console.error('❌ Failed to load user files:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading user files:', error);
      return [];
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const deleteUrl = `${this.baseUrl}/api/files/${fileId}`;
      
      console.log('🗑️ DELETE OPERATION DEBUG:');
      console.log('  � Base URL:', this.baseUrl);
      console.log('  🆔 File ID:', fileId);
      console.log('  🌐 Full URL:', deleteUrl);
      console.log('  🍪 Credentials: include');

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('📋 DELETE RESPONSE:');
      console.log('  📊 Status:', response.status);
      console.log('  📄 Status Text:', response.statusText);
      console.log('  ✅ OK:', response.ok);
      console.log('  📨 Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('  ❌ Error Body:', errorText);
        return false;
      }

      const responseData = await response.json();
      console.log('  📦 Response Data:', responseData);
      
      return true;
    } catch (error) {
      console.error('❌ DELETE ERROR:', error);
      return false;
    }
  }

  /**
   * Get file download URL (backend-signed URL)
   */
  async getDownloadUrl(fileId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/files/${fileId}/download`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.downloadUrl;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      return null;
    }
  }

  /**
   * Download a file directly - supports both file ID and direct download URL
   */
  async downloadFile(fileIdOrUrl: string, fileName: string, providedDownloadUrl?: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // If a download URL is provided, use it; otherwise construct from fileId
      let downloadUrl: string;
      if (providedDownloadUrl) {
        // Use the provided download URL (from search results, etc.)
        downloadUrl = providedDownloadUrl.startsWith('http') 
          ? providedDownloadUrl 
          : `${this.baseUrl}${providedDownloadUrl}`;
      } else {
        // Construct URL from file ID (legacy behavior)
        downloadUrl = `${this.baseUrl}/api/files/${fileIdOrUrl}/download`;
      }
      
      logEvent('FILE_SERVICE', 'DOWNLOAD_START', {
        baseUrl: this.baseUrl,
        fileIdOrUrl,
        fileName,
        providedDownloadUrl,
        finalDownloadUrl: downloadUrl
      });

      const response = await fetchWithLogging(downloadUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        logEvent('FILE_SERVICE', 'DOWNLOAD_FAILED', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        return false;
      }

      // Check if response is actually a file or an error JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        logEvent('FILE_SERVICE', 'DOWNLOAD_ERROR_JSON_RESPONSE', errorData);
        return false;
      }

      const blob = await response.blob();
      logEvent('FILE_SERVICE', 'DOWNLOAD_BLOB_CREATED', {
        blobSize: blob.size,
        blobType: blob.type,
        fileName
      });

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      logPerformance(`File Download: ${fileName}`, startTime);
      logEvent('FILE_SERVICE', 'DOWNLOAD_SUCCESS', {
        fileName,
        fileSize: blob.size,
        duration: Date.now() - startTime
      });
      
      return true;
    } catch (error) {
      logEvent('FILE_SERVICE', 'DOWNLOAD_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileIdOrUrl,
        fileName
      });
      return false;
    }
  }

  /**
   * Share a file with other employees using the new API
   */
  async shareFile(
    fileId: string,
    shareWith: string[],
    message?: string,
    expiryDays?: number
  ): Promise<ShareFileResult> {
    try {
      const shareUrl = `${this.baseUrl}/api/files/share`;
      const requestBody: Record<string, unknown> = {
        fileId,
        shareWith,
      };

      if (message && message.trim().length > 0) {
        requestBody.message = message.trim();
      }

      if (expiryDays && expiryDays > 0) {
        requestBody.expiryDays = expiryDays;
      }
      
      console.log('🔗 SHARE OPERATION DEBUG:');
      console.log('  🌐 Base URL:', this.baseUrl);
      console.log('  📁 File ID:', fileId);
      console.log('  👥 Share With:', shareWith);
      console.log('  💬 Message:', message);
      console.log('  ⏰ Expiry Days:', expiryDays);
      console.log('  🌐 Full URL:', shareUrl);
      console.log('  📦 Request Body:', requestBody);
      console.log('  🍪 Credentials: include');

      const response = await fetch(shareUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📋 SHARE RESPONSE:');
      console.log('  📊 Status:', response.status);
      console.log('  📄 Status Text:', response.statusText);
      console.log('  ✅ OK:', response.ok);
      console.log('  📨 Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ Share Success Data:', data);
        return {
          success: true,
          message: data.message,
          fileId: data.fileId,
          sharedWith: data.sharedWith,
          shareUrl: data.shareUrl,
          validEmails: data.validEmails,
          invalidEmails: data.invalidEmails,
        };
      } else {
        const errorText = await response.text();
        console.log('  ❌ Share Error Body:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return { success: false, error: errorData.error || 'Share failed' };
        } catch (e) {
          return { success: false, error: errorText || 'Share failed' };
        }
      }
    } catch (error) {
      console.error('❌ SHARE ERROR:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Remove sharing access from a file
   */
  async unshareFile(fileId: string, unshareFrom: string[]): Promise<ShareFileResult> {
    try {
      const unshareUrl = `${this.baseUrl}/api/files/unshare`;
      const requestBody = {
        fileId,
        unshareFrom,
      };
      
      console.log('🔗 UNSHARE OPERATION DEBUG:');
      console.log('  🌐 Base URL:', this.baseUrl);
      console.log('  📁 File ID:', fileId);
      console.log('  👥 Unshare From:', unshareFrom);
      console.log('  🌐 Full URL:', unshareUrl);
      console.log('  📦 Request Body:', requestBody);

      const response = await fetch(unshareUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📋 UNSHARE RESPONSE:');
      console.log('  📊 Status:', response.status);
      console.log('  📄 Status Text:', response.statusText);
      console.log('  ✅ OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ Unshare Success Data:', data);
        return {
          success: true,
          message: data.message,
          fileId: data.fileId,
        };
      } else {
        const errorText = await response.text();
        console.log('  ❌ Unshare Error Body:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return { success: false, error: errorData.error || 'Unshare failed' };
        } catch (e) {
          return { success: false, error: errorText || 'Unshare failed' };
        }
      }
    } catch (error) {
      console.error('❌ UNSHARE ERROR:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Get files shared with the current user
   */
  async getSharedFiles(): Promise<SharedFileInfo[]> {
    try {
      console.log('📂 Fetching shared files');

      const response = await fetch(`${this.baseUrl}/api/files/shared`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Shared files loaded:', data.files?.length || 0, 'files');
        
        return data.files || [];
      } else {
        console.error('❌ Failed to load shared files:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading shared files:', error);
      return [];
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();