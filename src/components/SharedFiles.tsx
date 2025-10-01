'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { authService, User } from '@/lib/auth-service'
import { fileUploadService, SharedFileInfo } from '@/lib/file-service'

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

const SharedFiles: React.FC = () => {
	const [user, setUser] = useState<User | null>(null)
	const [sharedFiles, setSharedFiles] = useState<SharedFileInfo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
	const [searchTerm, setSearchTerm] = useState('')
	const [departmentFilter, setDepartmentFilter] = useState('')

	const loadSharedFiles = useCallback(async (currentUser?: User | null) => {
		const effectiveUser = typeof currentUser !== 'undefined' ? currentUser : user
		if (!effectiveUser) return

		setLoading(true)
		setError('')

		try {
			const files = await fileUploadService.getSharedFiles()
			setSharedFiles(files)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load shared files'
			setError(message)
			setSharedFiles([])
			console.error('Error loading shared files:', err)
		} finally {
			setLoading(false)
		}
	}, [user])

	const departments = useMemo(() => {
		const unique = new Set<string>()
		sharedFiles.forEach((file) => {
			const department = file.department?.trim() || 'General'
			if (department) {
				unique.add(department)
			}
		})
		return Array.from(unique).sort((a, b) => a.localeCompare(b))
	}, [sharedFiles])

	const filteredFiles = useMemo(() => {
		const search = searchTerm.trim().toLowerCase()
		return sharedFiles.filter((file) => {
			const matchesDepartment = departmentFilter
				? (file.department?.trim() || 'General').toLowerCase() === departmentFilter.toLowerCase()
				: true

			if (!matchesDepartment) {
				return false
			}

			if (!search) {
				return true
			}

			const haystack = [
				file.originalName,
				file.fileName,
				file.sharedBy,
				file.department,
				file.description,
			]
				.filter((value): value is string => Boolean(value))
				.map((value) => value.toLowerCase())

			return haystack.some((value) => value.includes(search))
		})
	}, [sharedFiles, searchTerm, departmentFilter])

	useEffect(() => {
		const unsubscribe = authService.onAuthStateChanged((nextUser) => {
			setUser(nextUser)
			if (nextUser) {
				loadSharedFiles(nextUser)
			}
		})

		return unsubscribe
	}, [loadSharedFiles])

	const handleDownload = async (file: SharedFileInfo) => {
		console.log('📥 === SHARED FILE DOWNLOAD START ===')
		console.log('📥 File Object:', file)
		console.log('📥 Original Name:', file.originalName)
		console.log('📥 File ID:', file.fileId)
		console.log('📥 Download URL:', file.downloadUrl)

		setActionLoading((prev) => ({ ...prev, [`download_${file.fileId}`]: true }))

		try {
			console.log('📥 Calling fileUploadService.downloadFile...')
			const success = await fileUploadService.downloadFile(file.fileId, file.originalName, file.downloadUrl)
			
			console.log('📥 Download result:', success)
			
			if (!success) {
				console.log('❌ Download failed - service returned false')
				alert('Failed to download file. Please try again.')
			} else {
				console.log('✅ Download completed successfully')
			}
		} catch (err) {
			console.error('❌ === DOWNLOAD ERROR ===')
			console.error('❌ Error Object:', err)
			console.error('❌ Error Stack:', err instanceof Error ? err.stack : 'No stack trace')
			console.error('❌ === END DOWNLOAD ERROR ===')
			alert('Failed to download file. Please try again.')
		} finally {
			setActionLoading((prev) => ({ ...prev, [`download_${file.fileId}`]: false }))
			console.log('📥 === SHARED FILE DOWNLOAD END ===')
		}
	}

	if (!user) {
		return (
			<section className="section-stack">
				<div className="panel">
					<h2 className="panel__title">Sign in to view shared files</h2>
					<p className="panel__description">Authenticate with your corporate account to see files shared with you.</p>
				</div>
			</section>
		)
	}

	return (
		<section className="section-stack">
			<div className="panel">
				<div className="panel__header">
					<div>
						<h2 className="panel__title">Files shared with me</h2>
						<p className="panel__description">Documents that colleagues have shared with your account.</p>
					</div>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => loadSharedFiles(user)}
						disabled={loading}
					>
						{loading ? 'Loading...' : 'Refresh'}
					</button>
				</div>

				<div className="panel__meta">
					<span>
						{loading
							? 'Loading...'
							: `Showing ${filteredFiles.length} of ${sharedFiles.length} shared file${sharedFiles.length !== 1 ? 's' : ''}`}
					</span>
				</div>

				<div className="panel__content">
					{loading ? (
						<div className="panel__loading">
							<div className="spinner" aria-hidden />
							<span>Loading shared files…</span>
						</div>
					) : error ? (
						<div className="panel__error">
							<div style={{ fontSize: '2rem' }}>⚠️</div>
							<p>{error}</p>
							<button type="button" className="btn btn-primary" onClick={() => loadSharedFiles(user)}>
								Retry
							</button>
						</div>
					) : (
						<>
							<div className="form-grid" style={{ marginBottom: '16px' }}>
								<div className="form-control">
									<label className="form-label" htmlFor="shared-search">Search</label>
									<input
										id="shared-search"
										type="text"
										placeholder="Search documents, owners, or departments"
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
									/>
								</div>
								<div className="form-control">
									<label className="form-label" htmlFor="shared-department">Department</label>
									<select
										id="shared-department"
										value={departmentFilter}
										onChange={(event) => setDepartmentFilter(event.target.value)}
									>
										<option value="">All departments</option>
										{departments.map((department) => (
											<option key={department} value={department}>
												{department}
											</option>
										))}
									</select>
								</div>
							</div>

							{sharedFiles.length === 0 ? (
								<div className="panel__empty">
									<div style={{ fontSize: '3rem' }}>📤</div>
									<p>No files have been shared with you yet.</p>
									<span className="section-description">When colleagues share files with your email, they will appear here.</span>
								</div>
							) : filteredFiles.length === 0 ? (
								<div className="panel__empty">
									<div style={{ fontSize: '3rem' }}>🔍</div>
									<p>No shared files match your filters.</p>
									<span className="section-description">Try adjusting the search keywords or department filter.</span>
								</div>
							) : (
								<table className="table">
									<thead>
										<tr>
											<th>Name</th>
											<th>Size</th>
											<th>Shared by</th>
											<th>Department</th>
											<th>Shared date</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{filteredFiles.map((file) => (
											<tr key={file.fileId}>
												<td>
													<div className="file-history__name">
														<span className="file-history__icon" aria-hidden>{getFileIcon(file.contentType)}</span>
														<div>
															<div className="file-history__filename">{file.originalName}</div>
															{file.description && (
																<div className="file-history__description">
																	{file.description.length > 100 ? file.description.substring(0, 100) + '...' : file.description}
																</div>
															)}
														</div>
													</div>
												</td>
												<td>{formatFileSize(file.size)}</td>
												<td>
													<div>{file.sharedBy}</div>
												</td>
												<td>
													<span className="badge">{file.department || 'General'}</span>
												</td>
												<td>
													<div>{formatDate(file.sharedAt)}</div>
												</td>
												<td>
													<div className="file-history__actions">
														<button
															type="button"
															onClick={() => handleDownload(file)}
															disabled={actionLoading[`download_${file.fileId}`]}
															className="success"
														>
															{actionLoading[`download_${file.fileId}`] ? 'Downloading…' : 'Download'}
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</>
					)}
				</div>
			</div>
		</section>
	)
}

export default SharedFiles