'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { authService, User } from '@/lib/auth-service'
import { fileUploadService } from '@/lib/file-service'

interface FileHistoryEntry {
	id: string
	fileName: string
	originalName: string
	filePath: string
	size: number
	contentType: string
	department: string
	category: string
	uploadedBy: string
	uploadedAt: string
	userEmail: string
	downloadUrl?: string
	version: number
	status: string
	tags: string[]
	description: string
	metadata: Record<string, string>
	lastAccessed: string
	accessCount: number
	sharedWith?: string[]
	shareUrl?: string
	shareMessage?: string
}

interface FileHistoryResponse {
	files: FileHistoryEntry[]
	total: number
	page: number
	pageSize: number
	hasNext: boolean
	hasPrev: boolean
	departments: string[]
	categories: string[]
}

interface FileHistoryFilters {
	page: number
	pageSize: number
	department: string
	category: string
	search: string
	sortBy: string
	sortOrder: string
	dateFrom: string
	dateTo: string
	userOnly: boolean
}

const formatFileSize = (bytes: number): string => {
	if (!bytes) return '0 Bytes'
	const units = ['Bytes', 'KB', 'MB', 'GB']
	const index = Math.floor(Math.log(bytes) / Math.log(1024))
	const value = bytes / Math.pow(1024, index)
	return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

const formatDate = (dateString: string): string => {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays < 1) {
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
	}
	if (diffDays < 7) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
	}
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getFileIcon = (contentType: string): string => {
	if (contentType.startsWith('image/')) return '🖼️'
	if (contentType.startsWith('video/')) return '🎥'
	if (contentType.startsWith('audio/')) return '🎵'
	if (contentType.includes('pdf')) return '📄'
	if (contentType.includes('word')) return '📝'
	if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
	if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📽️'
	if (contentType.includes('text/')) return '📃'
	return '📁'
}

const getStatusVariant = (status: string): '' | 'success' | 'warning' | 'danger' => {
	switch (status) {
		case 'uploaded':
		case 'active':
			return 'success'
		case 'deleted':
			return 'danger'
		case 'shared':
		case 'pending':
			return 'warning'
		default:
			return ''
	}
}

const formatStatusLabel = (status: string): string =>
	status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const BENWIN_DOMAIN = '@benwinindonesia.com'
const BENWIN_IT_EMAIL = `it${BENWIN_DOMAIN}`

const normalizeEmail = (email?: string): string => (email ? email.trim().toLowerCase() : '')

const stripBenwinDomain = (email?: string): string => {
	if (!email) return ''
	const normalized = normalizeEmail(email)
	if (!normalized) return ''

	if (normalized === BENWIN_IT_EMAIL) {
		return 'IT'
	}

	if (normalized.endsWith(BENWIN_DOMAIN)) {
		return normalized.slice(0, normalized.length - BENWIN_DOMAIN.length)
	}

	return email.trim()
}

const formatOwnerLabel = (email?: string): string => {
	const normalized = normalizeEmail(email)
	if (!normalized) {
		return 'Owner unknown'
	}

	if (normalized === BENWIN_IT_EMAIL) {
		return '👤 IT'
	}

	const ownerIdentifier = stripBenwinDomain(email)
	if (!ownerIdentifier) {
		return 'Owner unknown'
	}

	if (normalized.endsWith(BENWIN_DOMAIN)) {
		return `👤 ${ownerIdentifier}`
	}

	return `👤 ${email?.trim()}`
}

const parseSharedWith = (file: FileHistoryEntry): string[] => {
	const directList = Array.isArray(file.sharedWith) ? file.sharedWith : []
	if (directList.length > 0) {
		return directList
	}

	const metadataKeys = ['sharedWith', 'shared_with', 'sharedEmails', 'shared_emails', 'shareWith', 'share_with']
	for (const key of metadataKeys) {
		const rawValue = file.metadata?.[key]
		if (!rawValue) continue

		try {
			const parsed = JSON.parse(rawValue)
			if (Array.isArray(parsed)) {
				return parsed.map((value) => String(value))
			}
		} catch (error) {
			const splitValues = rawValue
				.split(/[,;]+/)
				.map((value) => value.trim())
				.filter(Boolean)
			if (splitValues.length > 0) {
				return splitValues
			}
		}
	}

	return []
}

const formatSharedWithLabel = (file: FileHistoryEntry): string | null => {
	const sharedWithEmails = parseSharedWith(file)
	if (!sharedWithEmails.length) {
		return null
	}

	const ownerEmail = normalizeEmail(file.userEmail)
	const names = Array.from(
		new Set(
			sharedWithEmails
				.map((email) => email?.trim())
				.filter(Boolean)
				.filter((email) => normalizeEmail(email) !== ownerEmail)
				.map((email) => stripBenwinDomain(email) || email)
				.filter(Boolean),
		),
	)

	if (!names.length) {
		return null
	}

	return `👥 ${names.join(', ')}`
}

const FileHistory: React.FC = () => {
	const [user, setUser] = useState<User | null>(null)
	const [files, setFiles] = useState<FileHistoryEntry[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [departments, setDepartments] = useState<string[]>([])
	const [categories, setCategories] = useState<string[]>([])
	const [pagination, setPagination] = useState({
		total: 0,
		page: 1,
		pageSize: 20,
		hasNext: false,
		hasPrev: false,
	})
	const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
	const [showShareModal, setShowShareModal] = useState(false)
	const [shareFilePath, setShareFilePath] = useState('')
	const [shareEmails, setShareEmails] = useState('')
	const [shareMessage, setShareMessage] = useState('')
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

	const [filters, setFilters] = useState<FileHistoryFilters>({
		page: 1,
		pageSize: 20,
		department: '',
		category: '',
		search: '',
		sortBy: 'uploadedAt',
		sortOrder: 'desc',
		dateFrom: '',
		dateTo: '',
		userOnly: false,
	})

	const totalPages = useMemo(
		() => (pagination.pageSize ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1),
		[pagination],
	)

	const shareTarget = useMemo(
		() => (shareFilePath ? shareFilePath.split('/').slice(-3).join('/') : ''),
		[shareFilePath],
	)

	const loadFileHistory = useCallback(async (currentUser?: User | null) => {
		const effectiveUser = typeof currentUser !== 'undefined' ? currentUser : user
		if (!effectiveUser) return

		setLoading(true)
		setError('')

		try {
			const params = new URLSearchParams()
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== '' && value !== false && value !== 0) {
					params.append(key, String(value))
				}
			})

			const backend = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081'
			const response = await fetch(`${backend}/api/history/files?${params}`, {
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(errorText || 'Failed to load file history')
			}

			const data: FileHistoryResponse = await response.json()
			setFiles(data.files || [])
			setPagination({
				total: data.total || 0,
				page: data.page || 1,
				pageSize: data.pageSize || 20,
				hasNext: data.hasNext || false,
				hasPrev: data.hasPrev || false,
			})
			setDepartments(data.departments || [])
			setCategories(data.categories || [])
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load file history'
			setError(message)
			setFiles([]) // Ensure files is always an empty array on error
			console.error('Error loading file history:', err)
		} finally {
			setLoading(false)
		}
	}, [filters, user])

	useEffect(() => {
		const unsubscribe = authService.onAuthStateChanged((nextUser) => {
			setUser(nextUser)
			if (nextUser) {
				loadFileHistory(nextUser)
			}
		})

		return unsubscribe
	}, [loadFileHistory])

	useEffect(() => {
		if (user) {
			loadFileHistory(user)
		}
	}, [loadFileHistory, user])

	const handleFilterChange = (key: keyof FileHistoryFilters, value: string | boolean | number) => {
		setFilters((prev) => ({
			...prev,
			[key]: value,
			page: key === 'page' ? (value as number) : 1,
		}))
	}

	const clearFilters = () => {
		setFilters({
			page: 1,
			pageSize: 20,
			department: '',
			category: '',
			search: '',
			sortBy: 'uploadedAt',
			sortOrder: 'desc',
			dateFrom: '',
			dateTo: '',
			userOnly: false,
		})
	}

	const handleDownload = async (file: FileHistoryEntry) => {
		console.log('📥 === FILE HISTORY DOWNLOAD START ===');
		console.log('📥 File Object:', file);
		console.log('📥 Original Name:', file.originalName);
		console.log('📥 File Path:', file.filePath);
		console.log('📥 File ID:', file.id);
		console.log('📥 Status:', file.status);
		console.log('📥 Download URL:', file.downloadUrl);

		if (file.status === 'deleted') {
			console.log('❌ Download blocked: File is marked as deleted');
			alert('This file has been deleted and cannot be downloaded.')
			return
		}

		// Convert file path to encoded format for API
		const fileId = file.filePath.replace(/\//g, '_')
		console.log('📥 Encoded File ID for API:', fileId);
		console.log('📥 Starting download process...');

		setActionLoading((prev) => ({ ...prev, [`download_${file.id}`]: true }))

		try {
			console.log('📥 Calling fileUploadService.downloadFile...');
			console.log('📥 File data:', { fileId, originalName: file.originalName, downloadUrl: file.downloadUrl });
			const success = await fileUploadService.downloadFile(fileId, file.originalName, file.downloadUrl)
			
			console.log('📥 Download result:', success);
			
			if (!success) {
				console.log('❌ Download failed - service returned false');
				alert('Failed to download file. Please try again.')
			} else {
				console.log('✅ Download completed successfully');
			}
		} catch (err) {
			console.error('❌ === DOWNLOAD ERROR ===');
			console.error('❌ Error Object:', err);
			console.error('❌ Error Stack:', err instanceof Error ? err.stack : 'No stack trace');
			console.error('❌ === END DOWNLOAD ERROR ===');
			alert('Failed to download file. Please try again.')
		} finally {
			setActionLoading((prev) => ({ ...prev, [`download_${file.id}`]: false }))
			console.log('📥 === FILE HISTORY DOWNLOAD END ===');
		}
	}

	const handleDelete = async (file: FileHistoryEntry) => {
		if (file.status === 'deleted') {
			alert('This file has already been deleted.')
			return
		}

		if (!confirm(`Are you sure you want to delete "${file.originalName}"? This action cannot be undone.`)) {
			return
		}

		const fileId = file.filePath.replace(/\//g, '_')
		setActionLoading((prev) => ({ ...prev, [`delete_${file.id}`]: true }))

		try {
			const success = await fileUploadService.deleteFile(fileId)
			if (success) {
				alert('File deleted successfully.')
				loadFileHistory(user)
			} else {
				alert('Failed to delete file. Please try again.')
			}
		} catch (err) {
			console.error('Delete error:', err)
			alert('Failed to delete file. Please try again.')
		} finally {
			setActionLoading((prev) => ({ ...prev, [`delete_${file.id}`]: false }))
		}
	}

	const handleShare = (file: FileHistoryEntry) => {
		if (file.status === 'deleted') {
			alert('This file has been deleted and cannot be shared.')
			return
		}

		setShareFilePath(file.filePath)
		setShareEmails('')
		setShareMessage('')
		setShowShareModal(true)
	}

	const handleShareSubmit = async () => {
		if (!shareFilePath) {
			alert('No file selected for sharing. Please try again.')
			return
		}

		const emails = shareEmails
			.split(',')
			.map((email) => email.trim())
			.filter(Boolean)

		if (!emails.length) {
			alert('Please enter at least one valid email address.')
			return
		}

		setActionLoading((prev) => ({ ...prev, share_submit: true }))

		try {
			// Convert file path to encoded file ID format
			const fileId = shareFilePath.replace(/\//g, '_')
			const result = await fileUploadService.shareFile(fileId, emails, shareMessage)
			
			if (result.success) {
				let message = result.message || 'File shared successfully.'
				if (result.invalidEmails && result.invalidEmails.length > 0) {
					message += `\n\nNote: Some emails were invalid: ${result.invalidEmails.join(', ')}`
				}
				alert(message)
				setShowShareModal(false)
				setShareFilePath('')
				loadFileHistory(user)
			} else {
				alert(`Failed to share file: ${result.error}`)
			}
		} catch (err) {
			console.error('Share error:', err)
			alert('Failed to share file. Please try again.')
		} finally {
			setActionLoading((prev) => ({ ...prev, share_submit: false }))
		}
	}

	const closeShareModal = () => {
		setShowShareModal(false)
		setShareFilePath('')
	}

	if (!user) {
		return (
			<section className="section-stack">
				<div className="panel">
					<h2 className="panel__title">Sign in to view file history</h2>
					<p className="panel__description">Authenticate with your corporate account to review document audit logs.</p>
				</div>
			</section>
		)
	}

	return (
		<section className="section-stack">
			<div className="panel file-history">
				<div className="file-history__header">
					<div>
						<h2 className="panel__title">File history</h2>
						<p className="panel__description">Audit every upload, share, and deletion across the Benwin workspace.</p>
					</div>
					<div className="file-history__view-toggle">
						<button
							type="button"
							className={`btn-tab ${viewMode === 'list' ? 'is-active' : ''}`}
							onClick={() => setViewMode('list')}
						>
							📋 List
						</button>
						<button
							type="button"
							className={`btn-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
							onClick={() => setViewMode('grid')}
						>
							⊞ Grid
						</button>
					</div>
				</div>

				<div className="form-grid file-history__filters">
					<div className="form-control">
						<label className="form-label" htmlFor="history-search">Search</label>
						<input
							id="history-search"
							type="text"
							placeholder="Search documents, owners, or tags"
							value={filters.search}
							onChange={(event) => handleFilterChange('search', event.target.value)}
						/>
					</div>
					<div className="form-control">
						<label className="form-label" htmlFor="history-department">Department</label>
						<select
							id="history-department"
							value={filters.department}
							onChange={(event) => handleFilterChange('department', event.target.value)}
						>
							<option value="">All departments</option>
							{departments.map((dept) => (
								<option key={dept} value={dept}>
									{dept}
								</option>
							))}
						</select>
					</div>
					<div className="form-control">
						<label className="form-label" htmlFor="history-category">Category</label>
						<select
							id="history-category"
							value={filters.category}
							onChange={(event) => handleFilterChange('category', event.target.value)}
						>
							<option value="">All categories</option>
							{categories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>
					<div className="form-control">
						<label className="form-label" htmlFor="history-sort">Sort order</label>
						<select
							id="history-sort"
							value={`${filters.sortBy}-${filters.sortOrder}`}
							onChange={(event) => {
								const [sortBy, sortOrder] = event.target.value.split('-')
								handleFilterChange('sortBy', sortBy)
								handleFilterChange('sortOrder', sortOrder)
							}}
						>
							<option value="uploadedAt-desc">Newest first</option>
							<option value="uploadedAt-asc">Oldest first</option>
							<option value="fileName-asc">Name A–Z</option>
							<option value="fileName-desc">Name Z–A</option>
							<option value="size-desc">Largest first</option>
							<option value="size-asc">Smallest first</option>
						</select>
					</div>
				</div>

				<div className="file-history__filters-secondary">
					<label className="checkbox" htmlFor="history-user-only">
						<input
							id="history-user-only"
							type="checkbox"
							checked={filters.userOnly}
							onChange={(event) => handleFilterChange('userOnly', event.target.checked)}
						/>
						<span>Show my uploads only</span>
					</label>
					<div className="file-history__date-group">
						<span>From</span>
						<input
							type="date"
							value={filters.dateFrom}
							onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
						/>
					</div>
					<div className="file-history__date-group">
						<span>To</span>
						<input
							type="date"
							value={filters.dateTo}
							onChange={(event) => handleFilterChange('dateTo', event.target.value)}
						/>
					</div>
					<button type="button" className="btn btn-secondary" onClick={clearFilters}>
						Clear filters
					</button>
				</div>

				<div className="file-history__meta">
					<span>
						Showing {files?.length || 0} of {pagination.total} files{filters.userOnly ? ' · filtered to your uploads' : ''}
					</span>
					{pagination.total > 0 && <span>Page {pagination.page} of {totalPages}</span>}
				</div>

				<div className="file-history__content">
					{loading ? (
						<div className="file-history__loading">
							<div className="spinner" aria-hidden />
							<span>Loading file history…</span>
						</div>
					) : error ? (
						<div className="file-history__error">
							<div style={{ fontSize: '2rem' }}>⚠️</div>
							<p>{error}</p>
							<button type="button" className="btn btn-primary" onClick={() => loadFileHistory(user)}>
								Retry
							</button>
						</div>
					) : (files?.length || 0) === 0 ? (
						<div className="file-history__empty">
							<div style={{ fontSize: '3rem' }}>📂</div>
							<p>No files matched your filters.</p>
							<span className="section-description">Adjust the filters or upload a document to populate your history.</span>
						</div>
					) : viewMode === 'list' ? (
						<table className="table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Size</th>
									<th>Access By</th>
									<th>Department</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{(files || []).map((file) => {
									const statusVariant = getStatusVariant(file.status)
									const statusClass = statusVariant ? `status-pill ${statusVariant}` : 'status-pill'
									const ownerLabel = formatOwnerLabel(file.userEmail)
									const sharedWithLabel = formatSharedWithLabel(file)
									return (
										<tr key={file.id}>
											<td>
												<div className="file-history__name">
													<span className="file-history__icon" aria-hidden>{getFileIcon(file.contentType)}</span>
													<div>
														<div className="file-history__filename">{file.originalName}</div>
														{file.description && <div className="file-history__description">{file.description.length > 100 ? file.description.substring(0, 100) + '...' : file.description}</div>}
													</div>
												</div>
											</td>
											<td>{formatFileSize(file.size)}</td>
											<td>
												<div>{formatDate(file.uploadedAt)}</div>
												<span className="section-description--micro">{ownerLabel}</span>
												<br></br>{sharedWithLabel && (
													<span className="section-description section-description--micro">{sharedWithLabel}</span>
												)}
											</td>
											<td>
												<span className="badge">{file.department || 'General'}</span>
											</td>
											<td>
												<span className={statusClass}>{formatStatusLabel(file.status)}</span>
											</td>
											<td>
												<div className="file-history__actions">
													{file.status !== 'deleted' ? (
														<>
															<button
																type="button"
																onClick={() => handleDownload(file)}
																disabled={actionLoading[`download_${file.id}`]}
																className="success"
															>
																{actionLoading[`download_${file.id}`] ? 'Downloading…' : 'Download'}
															</button>
															<button type="button" onClick={() => handleShare(file)}>
																Share
															</button>
															<button
																type="button"
																onClick={() => handleDelete(file)}
																disabled={actionLoading[`delete_${file.id}`]}
																className="danger"
															>
																{actionLoading[`delete_${file.id}`] ? 'Deleting…' : 'Delete'}
															</button>
														</>
													) : (
														<span className="section-description">File deleted</span>
													)}
												</div>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					) : (
						<div className="file-history__grid">
							{(files || []).map((file) => {
								const statusVariant = getStatusVariant(file.status)
								const statusClass = statusVariant ? `status-pill ${statusVariant}` : 'status-pill'
								const ownerLabel = formatOwnerLabel(file.userEmail)
								const sharedWithLabel = formatSharedWithLabel(file)
								return (
									<div key={file.id} className="file-history__card">
										<div className="file-history__card-header">
											<span className="file-history__icon" aria-hidden>{getFileIcon(file.contentType)}</span>
											<div>
												<div className="file-history__filename">{file.originalName}</div>
												<span className="section-description">{ownerLabel}</span>
												{sharedWithLabel && (
													<span className="section-description section-description--micro">{sharedWithLabel}</span>
												)}
											</div>
										</div>
										<div className="file-history__card-meta">
											<span>Size • {formatFileSize(file.size)}</span>
											<span>Uploaded • {formatDate(file.uploadedAt)}</span>
											<span>Department • {file.department || 'General'}</span>
											<span>{file.description ? (file.description.length > 100 ? file.description.substring(0, 100) + '...' : file.description) : 'No description provided'}</span>
										</div>
										<div className="file-history__card-actions">
											<span className={statusClass}>{formatStatusLabel(file.status)}</span>
											{file.status !== 'deleted' ? (
												<>
													<button
														type="button"
														onClick={() => handleDownload(file)}
														disabled={actionLoading[`download_${file.id}`]}
														className="success"
													>
														{actionLoading[`download_${file.id}`] ? '…' : 'Download'}
													</button>
													<button type="button" onClick={() => handleShare(file)}>
														Share
													</button>
													<button
														type="button"
														onClick={() => handleDelete(file)}
														disabled={actionLoading[`delete_${file.id}`]}
														className="danger"
													>
														{actionLoading[`delete_${file.id}`] ? '…' : 'Delete'}
													</button>
												</>
											) : (
												<span className="section-description">File deleted</span>
											)}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>

				{pagination.total > pagination.pageSize && (
					<div className="file-history__pagination">
						<span>Page {pagination.page} of {totalPages}</span>
						<div className="file-history__pagination-buttons">
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
								disabled={!pagination.hasPrev}
							>
								Previous
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => handleFilterChange('page', pagination.page + 1)}
								disabled={!pagination.hasNext}
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>

			{showShareModal && (
				<div className="modal-backdrop">
					<div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
						<div className="modal__header">
							<h3 id="share-modal-title" className="modal__title">Share file</h3>
							<button type="button" className="btn-icon" aria-label="Close share modal" onClick={closeShareModal}>
								✕
							</button>
						</div>
						<div className="form-control">
							<label htmlFor="share-emails" className="form-label">Recipients (comma-separated)</label>
							<input
								id="share-emails"
								type="text"
								value={shareEmails}
								onChange={(event) => setShareEmails(event.target.value)}
								placeholder="colleague@benwin.co, manager@benwin.co"
							/>
						</div>
						<div className="form-control">
							<label htmlFor="share-message" className="form-label">Message (optional)</label>
							<textarea
								id="share-message"
								rows={3}
								value={shareMessage}
								onChange={(event) => setShareMessage(event.target.value)}
								placeholder="Add context for your colleagues…"
							/>
						</div>
						<div className="modal__actions">
							{shareTarget && <span className="modal__hint">Target path: {shareTarget}</span>}
							<button type="button" className="btn btn-secondary" onClick={closeShareModal}>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleShareSubmit}
								disabled={actionLoading.share_submit}
							>
								{actionLoading.share_submit ? 'Sharing…' : 'Share file'}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default FileHistory