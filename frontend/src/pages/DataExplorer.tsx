import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
    Box, Typography, Card, Chip, LinearProgress,
    Table, TableBody, TableCell, TableHead, TableRow,
    IconButton, Tooltip, Alert, CircularProgress, Snackbar, Button
} from '@mui/material'
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    TableChart as TableIcon,
    Image as ImageIcon,
    TextFields as TextIcon,
    Visibility as ViewIcon,
    BarChart as EdaIcon,
    Build as TransformIcon,
    Public as PublicIcon,
    Lock as PrivateIcon,
    AutoFixHigh as AutoFixIcon,
    Download as DownloadIcon,
} from '@mui/icons-material'
import { fetchDatasets, deleteDataset, uploadDataset } from '../store/dataSlice'
import { api } from '../api/client'
import type { AppDispatch, RootState } from '../store/store'

const typeIcons: Record<string, React.ReactNode> = {
    tabular: <TableIcon />,
    image: <ImageIcon />,
    text: <TextIcon />,
}

const typeColors: Record<string, string> = {
    tabular: '#6366F1',
    image: '#F59E0B',
    text: '#10B981',
}

const statusColors: Record<string, string> = {
    ready: '#10B981',
    processing: '#6366F1',
    error: '#EF4444',
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function DataExplorer() {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { datasets, loading, uploading, error } = useSelector((s: RootState) => s.data)
    const [progress, setProgress] = useState(0)
    const [autoFixing, setAutoFixing] = useState<string | null>(null)
    const [snackMsg, setSnackMsg] = useState<string | null>(null)

    useEffect(() => { dispatch(fetchDatasets()) }, [dispatch])

    const onDrop = useCallback((accepted: File[]) => {
        if (!accepted.length) return
        dispatch(uploadDataset({ file: accepted[0], onProgress: setProgress }))
    }, [dispatch])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/zip': ['.zip'],
            'text/plain': ['.txt'],
        }
    })

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Data Explorer</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Upload and manage your training datasets
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={() => dispatch(fetchDatasets())}><RefreshIcon /></IconButton>
                </Tooltip>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Upload Dropzone */}
            <Box {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} mb={4}>
                <input {...getInputProps()} id="dataset-upload-input" />
                {uploading ? (
                    <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress size={40} sx={{ mb: 2, color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight={600} mb={1}>Uploading...</Typography>
                        <Box sx={{ width: 200, mx: 'auto' }}>
                            <LinearProgress variant="determinate" value={progress} />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>{progress}%</Typography>
                    </Box>
                ) : (
                    <>
                        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                        <Typography variant="h6" fontWeight={700} mb={1}>
                            {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Supports CSV, Excel, ZIP (images), TXT files
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                            Free: up to 100 MB · Pro: up to 2 GB
                        </Typography>
                    </>
                )}
            </Box>

            {/* Dataset List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : datasets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TableIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>No datasets yet</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Upload your first dataset to get started</Typography>
                </Box>
            ) : (
                <Card>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {['Name', 'Type', 'Size', 'Rows', 'Quality', 'Visibility', 'Status', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>
                                        {h.toUpperCase()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {datasets.map((ds) => (
                                <TableRow key={ds.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/data/${ds.id}`)}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={600}>{ds.name}</Typography>
                                            <Chip label={`v${ds.version || 1}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.12)', color: '#818CF8' }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {new Date(ds.created_at).toLocaleDateString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: typeColors[ds.dataset_type] || '#6B7280' }}>
                                            {typeIcons[ds.dataset_type]}
                                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{ds.dataset_type}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2">{formatBytes(ds.file_size_bytes)}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{ds.row_count?.toLocaleString() ?? '—'}</Typography></TableCell>
                                    <TableCell>
                                        {ds.quality_score != null ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={ds.quality_score}
                                                    sx={{ width: 60, height: 4, borderRadius: 2 }}
                                                />
                                                <Typography variant="caption">{ds.quality_score}%</Typography>
                                            </Box>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={ds.status}
                                            size="small"
                                            sx={{
                                                background: `${statusColors[ds.status] || '#6B7280'}15`,
                                                color: statusColors[ds.status] || '#6B7280',
                                                border: `1px solid ${statusColors[ds.status] || '#6B7280'}30`,
                                                fontSize: 11,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={ds.is_public ? <PublicIcon sx={{ fontSize: 14 }} /> : <PrivateIcon sx={{ fontSize: 14 }} />}
                                            label={ds.is_public ? 'Public' : 'Private'}
                                            size="small"
                                            variant="outlined"
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                await api.patch(`/data/datasets/${ds.id}`, { is_public: !ds.is_public })
                                                dispatch(fetchDatasets())
                                            }}
                                            sx={{ cursor: 'pointer', color: ds.is_public ? '#10B981' : '#6B7280', borderColor: ds.is_public ? '#10B98130' : '#6B728030' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                            <Tooltip title="View · EDA · Transform">
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: '#6366F1' }}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/data/${ds.id}`) }}
                                                >
                                                    <EdaIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {ds.dataset_type === 'tabular' && (
                                                <Tooltip title="Auto-fix: fill nulls, remove duplicates">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#10B981' }}
                                                        disabled={autoFixing === ds.id}
                                                        onClick={async (e) => {
                                                            e.stopPropagation()
                                                            setAutoFixing(ds.id)
                                                            try {
                                                                const res = await api.post(`/data/datasets/${ds.id}/auto-fix`)
                                                                setSnackMsg(res.data.message)
                                                                dispatch(fetchDatasets())
                                                            } catch (err: any) {
                                                                setSnackMsg(err.response?.data?.detail || 'Auto-fix failed')
                                                            }
                                                            setAutoFixing(null)
                                                        }}
                                                    >
                                                        {autoFixing === ds.id ? <CircularProgress size={16} /> : <AutoFixIcon fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Download">
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: '#8B5CF6' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const token = localStorage.getItem('access_token')
                                                        window.open(`http://localhost:8000/api/v1/data/datasets/${ds.id}/download?token=${token}`, '_blank')
                                                    }}
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete dataset">
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: 'error.main' }}
                                                    onClick={(e) => { e.stopPropagation(); dispatch(deleteDataset(ds.id)) }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <Snackbar open={!!snackMsg} autoHideDuration={5000} onClose={() => setSnackMsg(null)} message={snackMsg} />
        </Box>
    )
}
