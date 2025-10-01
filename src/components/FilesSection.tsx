"use client";

import { DragEvent, useRef } from 'react';
import { User } from '@/lib/auth-service';
import { UploadedFile, fileUploadService } from '@/lib/file-service';
import { notificationService } from '@/lib/notification-service';
import { SearchResult } from '@/components/SmartSearch';

interface FilesProps {
  user: User | null;
  department: string;
  setDepartment: (dept: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  orderedFiles: UploadedFile[];
  downloadURL: string | null;
  isUploading: boolean;
  uploadProgress: number;
  isDragActive: boolean;
  setIsDragActive: (active: boolean) => void;
  selectedSearchResult: SearchResult | null;
  setSelectedSearchResult: (result: SearchResult | null) => void;
  handleUpload: () => void;
  handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleDragEnd: () => void;
  handleDrop: (event: DragEvent<HTMLDivElement>) => void;
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

const getFileIcon = (contentType: string) => {
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('image')) return '🖼️';
  if (contentType.includes('video')) return '🎥';
  if (contentType.includes('audio')) return '🎵';
  if (contentType.includes('text')) return '📝';
  if (contentType.includes('word')) return '📝';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📊';
  return '📄';
};

const getSimilarityColor = (similarity: number) => {
  if (similarity >= 0.8) return '#10b981'; // green
  if (similarity >= 0.6) return '#f59e0b'; // amber
  return '#6b7280'; // gray
};

export default function Files({
  user,
  department,
  setDepartment,
  file,
  setFile,
  orderedFiles,
  downloadURL,
  isUploading,
  uploadProgress,
  isDragActive,
  setIsDragActive,
  selectedSearchResult,
  setSelectedSearchResult,
  handleUpload,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDragEnd,
  handleDrop
}: FilesProps) {
  return (
    <section className="section-stack">
      {selectedSearchResult && (
        <div className="panel" style={{ background: 'linear-gradient(135deg, var(--accent-soft) 0%, rgba(37, 99, 235, 0.08) 100%)', border: '1px solid var(--accent)' }}>
          <div className="panel__header">
            <div>
              <h3 className="panel__title">🔍 Search Result Selected</h3>
              <p className="panel__description">Found via AI semantic search with {Math.round(selectedSearchResult.similarity * 100)}% similarity</p>
            </div>
            <button 
              className="btn-icon" 
              onClick={() => setSelectedSearchResult(null)}
              aria-label="Clear search result"
            >
              ✕
            </button>
          </div>
          <div className="file-card" style={{ background: 'var(--surface)', border: '1px solid var(--accent)' }}>
            <div className="file-card__title">
              {getFileIcon(selectedSearchResult.contentType)} {selectedSearchResult.originalName || selectedSearchResult.fileName}
            </div>
            {selectedSearchResult.description && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', margin: '8px 0' }}>
                {selectedSearchResult.description}
              </div>
            )}
            <div className="file-card__meta">
              <span>{formatBytes(selectedSearchResult.size)} · {selectedSearchResult.contentType}</span>
              <span>Department · {selectedSearchResult.department}</span>
              <span>Uploaded · {formatDateTime(selectedSearchResult.uploadedAt)}</span>
              <span>Similarity · <strong style={{ color: getSimilarityColor(selectedSearchResult.similarity) }}>{Math.round(selectedSearchResult.similarity * 100)}%</strong></span>
            </div>
            <div className="panel__header" style={{ padding: 0, marginTop: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const success = await fileUploadService.downloadFile(
                      selectedSearchResult.fileId, 
                      selectedSearchResult.originalName || selectedSearchResult.fileName,
                      selectedSearchResult.downloadUrl
                    );
                    if (!success) {
                      notificationService.showInAppNotification(
                        'Download Failed',
                        'Unable to download the file. Please try again.',
                        'error'
                      );
                    }
                  } catch (error) {
                    console.error('Search result download error:', error);
                    notificationService.showInAppNotification(
                      'Download Error',
                      'An error occurred while downloading the file.',
                      'error'
                    );
                  }
                }}
              >
                📥 Download File
              </button>
              <span className="badge">AI Enhanced</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Upload documents</h3>
            <p className="panel__description">Securely store project contracts, HR letters, and department files in one workspace.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-control">
            <label className="form-label" htmlFor="department-select">Department</label>
            <select
              id="department-select"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              {DEPARTMENTS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="form-label" htmlFor="file-input">Choose file</label>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.zip"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file && (
              <span className="section-description">Selected • {file.name} ({formatBytes(file.size)})</span>
            )}
          </div>
        </div>

        <div
          className={`upload-dropzone ${isDragActive ? 'is-dragging' : ''}`}
          role="presentation"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop files or use the selector above</p>
          <p className="section-description">Supported formats include PDF, Office documents, images, and archives. Each upload is logged for compliance.</p>
        </div>

        {isUploading && (
          <div>
            <div className="progress-track">
              <div 
                className={`progress-bar ${uploadProgress === -1 ? 'progress-indeterminate' : ''}`}
                style={{ 
                  width: uploadProgress === -1 ? '100%' : `${uploadProgress}%`,
                  animation: uploadProgress === -1 ? 'progress-pulse 1.5s infinite' : 'none'
                }} 
              />
            </div>
            <p className="section-description" style={{ marginTop: 8 }}>
              Uploading… {uploadProgress === -1 ? 'Processing…' : `${Math.round(uploadProgress)}%`}
            </p>
          </div>
        )}

        <div className="panel__header">
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || isUploading || !user}
          >
            {isUploading ? 'Uploading…' : 'Upload document'}
          </button>
          {downloadURL && (
            <a className="btn btn-secondary" href={downloadURL} target="_blank" rel="noopener noreferrer">
              Open latest upload
            </a>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">My documents</h3>
            <p className="panel__description">Browse all files you&apos;ve uploaded to the corporate archive.</p>
          </div>
          <span className="badge">{orderedFiles.length} files</span>
        </div>

        {orderedFiles.length ? (
          <div className="file-grid">
            {orderedFiles.map((item) => (
              <div key={item.id} className="file-card">
                <div className="file-card__title">{item.originalName || item.name}</div>
                <div className="file-card__meta">
                  <span>{formatBytes(item.size)} · {item.contentType}</span>
                  <span>Department · {item.department || 'general'}</span>
                  <span>Uploaded · {formatDateTime(item.createdAt)}</span>
                </div>
                <div className="panel__header" style={{ padding: 0 }}>
                  <span className="badge">Version 1</span>
                  <span className="section-description">Owner · {item.uploadedBy || user?.email}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-description">You haven&apos;t uploaded any documents yet. Use the uploader above to get started.</p>
        )}
      </div>
    </section>
  );
}