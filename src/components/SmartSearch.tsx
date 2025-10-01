"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchWithLogging, logEvent } from '../lib/api-logger';

export interface SearchResult {
  fileId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  department: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  downloadUrl: string;
  similarity: number;
  embeddingId: string;
  textPreview?: string;
  chunkIndex?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  totalEvaluated: number;
  embeddingModel: string;
}

interface SmartSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  department?: string;
  className?: string;
  initiallyCollapsed?: boolean;
}

export default function SmartSearch({
  onResultSelect,
  placeholder = "Search documents with AI - try 'invoice keuangan' or 'meeting notes'",
  department,
  className = "",
  initiallyCollapsed = true,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!initiallyCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // On mobile, always expand if not initially collapsed
      if (mobile && !initiallyCollapsed) {
        setIsExpanded(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [initiallyCollapsed]);

  // Close dropdown and collapse search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // On mobile, don't collapse if not initially collapsed, just clear query
        if (!query.trim() && !isMobile) {
          setIsExpanded(false);
        } else if (!query.trim() && isMobile && initiallyCollapsed) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, isMobile, initiallyCollapsed]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchResponse(null);
      setError(null);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const requestBody: {
        query: string;
        limit: number;
        threshold: number;
        department?: string;
      } = {
        query: searchQuery.trim(),
        limit: 8,
        threshold: 0.3,
      };

      if (department && department !== 'general') {
        requestBody.department = department;
      }

      const searchUrl = `${baseUrl}/api/files/search`;

      // Enhanced debug logging for search request
      console.log('🔍 === SEMANTIC SEARCH REQUEST ===');
      console.log('🔍 Query:', searchQuery.trim());
      console.log('🔍 Department:', department || 'all');
      console.log('🔍 Request URL:', searchUrl);
      console.log('🔍 Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('🔍 Credentials: include');
      console.log('🔍 Timestamp:', new Date().toISOString());

      const response = await fetchWithLogging(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('📋 === SEMANTIC SEARCH RESPONSE ===');
      console.log('📋 Status:', response.status);
      console.log('📋 Status Text:', response.statusText);
      console.log('📋 OK:', response.ok);
      console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error Response Body:', errorText);
        
        if (response.status === 401) {
          throw new Error('Please sign in to search documents');
        }
        let errorMessage = 'Search failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: SearchResponse = await response.json();

      console.log('✅ === SEMANTIC SEARCH SUCCESS ===');
      console.log('✅ Results Count:', data.count);
      console.log('✅ Total Evaluated:', data.totalEvaluated);
      console.log('✅ Embedding Model:', data.embeddingModel);
      console.log('✅ Results Details:');
      
      data.results.forEach((result, index) => {
        console.log(`✅   [${index + 1}] ${result.originalName}`);
        console.log(`✅       FileID: ${result.fileId}`);
        console.log(`✅       FilePath: ${result.filePath}`);
        console.log(`✅       DownloadURL: ${result.downloadUrl}`);
        console.log(`✅       Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`✅       Department: ${result.department}`);
        console.log(`✅       Size: ${result.size} bytes`);
        console.log(`✅       ContentType: ${result.contentType}`);
        if (result.textPreview) {
          console.log(`✅       Preview: ${result.textPreview.substring(0, 100)}...`);
        }
        console.log('✅       ---');
      });

      console.log('✅ === END SEARCH SUCCESS ===');

      setSearchResponse(data);
      setResults(data.results || []);
      setIsOpen(data.results.length > 0);
    } catch (err) {
      console.error('❌ === SEMANTIC SEARCH ERROR ===');
      console.error('❌ Error Object:', err);
      console.error('❌ Error Stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      const errorMessage = err instanceof Error ? err.message : 'Search service unavailable';
      setError(errorMessage);
      setResults([]);
      setSearchResponse(null);
      setIsOpen(true); // Show error state
      
      console.error('❌ === END SEARCH ERROR ===');
    } finally {
      setIsSearching(false);
    }
  }, [baseUrl, department]);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  }, [performSearch]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    logEvent('SEARCH', 'RESULT_SELECTED', {
      fileName: result.originalName || result.fileName,
      fileId: result.fileId,
      filePath: result.filePath,
      downloadUrl: result.downloadUrl,
      department: result.department,
      similarity: (result.similarity * 100).toFixed(1) + '%',
      fullResult: result
    });
    
    setIsOpen(false);
    setQuery(result.originalName || result.fileName);
    onResultSelect?.(result);
  }, [onResultSelect]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      // On mobile, don't collapse if not initially collapsed
      if (!query.trim() && !isMobile) {
        setIsExpanded(false);
      } else if (!query.trim() && isMobile && initiallyCollapsed) {
        setIsExpanded(false);
      }
    }
  }, [query, isMobile, initiallyCollapsed]);

  const handleSearchIconClick = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      // Focus the input after the expansion animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else if (query.trim()) {
      // If already expanded and has query, perform search
      performSearch(query);
    } else {
      // If expanded but no query, just focus the input
      inputRef.current?.focus();
    }
  }, [isExpanded, query, performSearch]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 KB';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value < 10 && index > 0 ? value.toFixed(1) : Math.round(value)} ${units[index]}`;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (contentType: string): string => {
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('image')) return '🖼️';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📽️';
    if (contentType.includes('document') || contentType.includes('word')) return '📝';
    if (contentType.includes('text')) return '📃';
    if (contentType.includes('zip') || contentType.includes('archive')) return '🗜️';
    return '📁';
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'var(--color-success)';
    if (similarity >= 0.6) return 'var(--color-warning)';
    return 'var(--color-info)';
  };

  // Determine if we should be expanded based on mobile state and initial setting
  const shouldBeExpanded = isMobile ? (!initiallyCollapsed || isExpanded) : isExpanded;

  return (
    <div ref={searchRef} className={`smart-search ${className} ${shouldBeExpanded ? 'smart-search--expanded' : 'smart-search--collapsed'} ${isMobile ? 'smart-search--mobile' : ''}`}>
      <div className="smart-search__input-container">
        <button
          type="button"
          onClick={handleSearchIconClick}
          className="smart-search__icon-button"
          aria-label={shouldBeExpanded ? "Search documents" : "Open search"}
        >
          <span className="smart-search__icon" aria-hidden="true">
            {isSearching ? '⏳' : '🔍'}
          </span>
        </button>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsExpanded(true);
            if (results.length > 0 || error) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={`smart-search__input ${shouldBeExpanded ? 'smart-search__input--visible' : 'smart-search__input--hidden'}`}
          aria-label="Semantic document search"
          autoComplete="off"
        />
        {query && shouldBeExpanded && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSearchResponse(null);
              setError(null);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="smart-search__clear"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="smart-search__dropdown">
          {error ? (
            <div className="smart-search__error">
              <span className="smart-search__error-icon">⚠️</span>
              <div>
                <div className="smart-search__error-title">Search Error</div>
                <div className="smart-search__error-message">{error}</div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="smart-search__header">
                <div className="smart-search__stats">
                  <span className="smart-search__count">
                    {searchResponse?.count || 0} results
                  </span>
                  <span className="smart-search__meta">
                    from {searchResponse?.totalEvaluated || 0} files · {searchResponse?.embeddingModel || 'AI'}
                  </span>
                </div>
                {department && department !== 'general' && (
                  <span className="smart-search__filter">
                    📂 {department}
                  </span>
                )}
              </div>

              <div className="smart-search__results">
                {results.map((result) => (
                  <button
                    key={result.fileId}
                    onClick={() => handleResultClick(result)}
                    className="smart-search__result"
                    type="button"
                  >
                    <div className="smart-search__result-header">
                      <span className="smart-search__result-icon">
                        {getFileIcon(result.contentType)}
                      </span>
                      <div className="smart-search__result-title">
                        {result.originalName || result.fileName}
                      </div>
                      <div 
                        className="smart-search__similarity"
                        style={{ color: getSimilarityColor(result.similarity) }}
                      >
                        {Math.round(result.similarity * 100)}%
                      </div>
                    </div>

                    {/** result.description && (
                      <div className="smart-search__result-description">
                        {result.description}
                      </div>
                    ) **/}

                    {result.textPreview && (
                      <div className="smart-search__result-preview">
                        <span className="smart-search__preview-label">📄 Content:</span>
                        <span className="smart-search__preview-text">{result.textPreview}</span>
                        {result.chunkIndex !== undefined && result.chunkIndex > 0 && (
                          <span className="smart-search__chunk-indicator">
                            (chunk {result.chunkIndex + 1})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="smart-search__result-meta">
                      <span>{formatFileSize(result.size)}</span>
                      <span>•</span>
                      <span>{result.department}</span>
                      <span>•</span>
                      <span>{formatDateTime(result.uploadedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="smart-search__footer">
                <div className="smart-search__tip">
                  💡 Try: &ldquo;laporan keuangan Q1&rdquo;, &ldquo;meeting notes project&rdquo;, &ldquo;kontrak vendor&rdquo;
                </div>
              </div>
            </>
          ) : query.trim() && !isSearching ? (
            <div className="smart-search__empty">
              <span className="smart-search__empty-icon">🔍</span>
              <div>
                <div className="smart-search__empty-title">No matches found</div>
                <div className="smart-search__empty-message">
                  Try different keywords or check if the document has been uploaded
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}