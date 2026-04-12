import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Button, Chip, Tabs, Tab,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    CircularProgress, Alert, Grid, Tooltip, FormControl, InputLabel,
    Select, MenuItem, TextField, IconButton, Divider, LinearProgress,
    Snackbar,
} from '@mui/material'
import {
    ArrowBack, Storage as DataIcon, BarChart, Transform as TransformIcon,
    Visibility, Delete as DeleteIcon, Add as AddIcon, PlayArrow,
    Warning as WarningIcon, CheckCircle,
} from '@mui/icons-material'
import { api } from '../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColumnEDA {
    dtype: string
    null_count: number
    null_pct: number
    unique_count: number
    sample_values: string[]
    stats?: {
        mean: number; median: number; std: number
        min: number; max: number; q25: number; q75: number
        skewness: number; kurtosis: number
    }
    outliers?: { count: number; pct: number; lower_bound: number; upper_bound: number }
    histogram?: { counts: number[]; edges: number[] }
    value_counts?: Record<string, number>
}

interface EDAData {
    shape: { rows: number; columns: number }
    columns: Record<string, ColumnEDA>
    missing_summary: Record<string, { count: number; pct: number }>
    correlations: { columns: string[]; matrix: number[][] }
}

interface SampleData {
    columns: string[]
    dtypes: Record<string, string>
    total_rows: number
    total_columns: number
    data: Record<string, any>[]
}

interface TransformOp {
    id: string
    op: string
    [key: string]: any
}

const TRANSFORM_OPS = [
    { value: 'drop_columns', label: 'Drop Columns', icon: '🗑️', desc: 'Remove one or more columns' },
    { value: 'fill_missing', label: 'Fill Missing Values', icon: '🔧', desc: 'Fill null/NaN values' },
    { value: 'cast_dtype', label: 'Change Data Type', icon: '🔄', desc: 'Cast column to different type' },
    { value: 'rename_column', label: 'Rename Column', icon: '✏️', desc: 'Rename a column' },
    { value: 'remove_duplicates', label: 'Remove Duplicates', icon: '📋', desc: 'Drop duplicate rows' },
    { value: 'drop_na_rows', label: 'Drop Null Rows', icon: '❌', desc: 'Remove rows with nulls' },
    { value: 'encode_categorical', label: 'Encode Categorical', icon: '🏷️', desc: 'One-hot or label encode' },
    { value: 'scale_numeric', label: 'Scale Numeric', icon: '📐', desc: 'Standardize or normalize' },
    { value: 'filter_rows', label: 'Filter Rows', icon: '🔍', desc: 'Keep rows matching condition' },
]

const FILL_STRATEGIES = [
    { value: 'mean', label: 'Mean' },
    { value: 'median', label: 'Median' },
    { value: 'mode', label: 'Mode' },
    { value: 'zero', label: 'Zero' },
    { value: 'forward_fill', label: 'Forward Fill' },
    { value: 'backward_fill', label: 'Backward Fill' },
    { value: 'value', label: 'Custom Value' },
    { value: 'drop', label: 'Drop Rows' },
]

const CAST_TYPES = ['int', 'float', 'str', 'bool', 'datetime', 'category']
const FILTER_CONDITIONS = [
    { value: 'eq', label: '= Equal' },
    { value: 'neq', label: '≠ Not Equal' },
    { value: 'gt', label: '> Greater Than' },
    { value: 'gte', label: '≥ Greater or Equal' },
    { value: 'lt', label: '< Less Than' },
    { value: 'lte', label: '≤ Less or Equal' },
    { value: 'contains', label: '∈ Contains' },
    { value: 'not_contains', label: '∉ Not Contains' },
]

const dtypeColor = (dtype: string) => {
    if (dtype.includes('int') || dtype.includes('float')) return '#10B981'
    if (dtype.includes('object') || dtype.includes('str')) return '#F59E0B'
    if (dtype.includes('bool')) return '#3B82F6'
    if (dtype.includes('date') || dtype.includes('time')) return '#EC4899'
    if (dtype.includes('category')) return '#8B5CF6'
    return '#6B7280'
}

function corrColor(v: number): string {
    if (v >= 0.7) return 'rgba(16,185,129,0.8)'
    if (v >= 0.4) return 'rgba(16,185,129,0.4)'
    if (v >= 0.1) return 'rgba(16,185,129,0.15)'
    if (v <= -0.7) return 'rgba(239,68,68,0.8)'
    if (v <= -0.4) return 'rgba(239,68,68,0.4)'
    if (v <= -0.1) return 'rgba(239,68,68,0.15)'
    return 'transparent'
}

// ── Mini Chart Components ─────────────────────────────────────────────────────

function Histogram({ counts, edges }: { counts: number[]; edges: number[] }) {
    const maxCount = Math.max(...counts, 1)
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: 60, mt: 1 }}>
            {counts.map((c, i) => (
                <Tooltip key={i} title={`${edges[i].toFixed(2)} – ${edges[i + 1]?.toFixed(2)}: ${c}`} arrow>
                    <Box sx={{
                        flex: 1, height: `${(c / maxCount) * 100}%`,
                        background: 'linear-gradient(180deg, #6366F1, #6366F180)',
                        borderRadius: '2px 2px 0 0', minHeight: 2,
                        transition: 'height 0.4s ease',
                        '&:hover': { background: '#818CF8', opacity: 1 },
                    }} />
                </Tooltip>
            ))}
        </Box>
    )
}

function ValueCountsBar({ data }: { data: Record<string, number> }) {
    const entries = Object.entries(data).slice(0, 8)
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)
    return (
        <Box sx={{ mt: 1 }}>
            {entries.map(([label, count]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ width: 80, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#D1D5DB', fontSize: 10 }}>
                        {label}
                    </Typography>
                    <Box sx={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>
                        <Box sx={{
                            height: '100%', borderRadius: 4,
                            width: `${(count / maxVal) * 100}%`,
                            background: 'linear-gradient(90deg, #F59E0B, #F59E0B80)',
                            transition: 'width 0.6s ease',
                        }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: 10, minWidth: 30, textAlign: 'right' }}>{count}</Typography>
                </Box>
            ))}
        </Box>
    )
}

// ── Transform Operation Config Component ──────────────────────────────────────

function TransformConfig({ op, columnNames, onChange, onRemove }: {
    op: TransformOp; columnNames: string[]; onChange: (op: TransformOp) => void; onRemove: () => void
}) {
    const opInfo = TRANSFORM_OPS.find(t => t.value === op.op)

    return (
        <Card sx={{ borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontSize={18}>{opInfo?.icon}</Typography>
                        <Typography variant="body2" fontWeight={700}>{opInfo?.label}</Typography>
                    </Box>
                    <IconButton size="small" onClick={onRemove} sx={{ color: '#EF4444' }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>

                {/* Drop Columns */}
                {op.op === 'drop_columns' && (
                    <FormControl fullWidth size="small">
                        <InputLabel>Columns to drop</InputLabel>
                        <Select multiple value={op.columns || []} label="Columns to drop"
                            onChange={(e) => onChange({ ...op, columns: e.target.value as string[] })}
                            renderValue={(sel) => (sel as string[]).join(', ')}>
                            {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                )}

                {/* Fill Missing */}
                {op.op === 'fill_missing' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.column || ''} label="Column" onChange={(e) => onChange({ ...op, column: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Strategy</InputLabel>
                            <Select value={op.strategy || 'mean'} label="Strategy" onChange={(e) => onChange({ ...op, strategy: e.target.value })}>
                                {FILL_STRATEGIES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {op.strategy === 'value' && (
                            <TextField size="small" label="Value" value={op.value || ''} onChange={(e) => onChange({ ...op, value: e.target.value })} sx={{ flex: 1 }} />
                        )}
                    </Box>
                )}

                {/* Cast Dtype */}
                {op.op === 'cast_dtype' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.column || ''} label="Column" onChange={(e) => onChange({ ...op, column: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Cast to</InputLabel>
                            <Select value={op.to || 'str'} label="Cast to" onChange={(e) => onChange({ ...op, to: e.target.value })}>
                                {CAST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Rename Column */}
                {op.op === 'rename_column' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.from || ''} label="Column" onChange={(e) => onChange({ ...op, from: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="New name" value={op.to || ''} onChange={(e) => onChange({ ...op, to: e.target.value })} sx={{ flex: 1 }} />
                    </Box>
                )}

                {/* Remove Duplicates — no config needed */}
                {op.op === 'remove_duplicates' && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Removes all duplicate rows.</Typography>
                )}

                {/* Drop NA Rows */}
                {op.op === 'drop_na_rows' && (
                    <FormControl fullWidth size="small">
                        <InputLabel>Check columns (optional)</InputLabel>
                        <Select multiple value={op.subset || []} label="Check columns (optional)"
                            onChange={(e) => onChange({ ...op, subset: e.target.value as string[] })}
                            renderValue={(sel) => (sel as string[]).length ? (sel as string[]).join(', ') : 'All columns'}>
                            {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                )}

                {/* Encode Categorical */}
                {op.op === 'encode_categorical' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.column || ''} label="Column" onChange={(e) => onChange({ ...op, column: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Method</InputLabel>
                            <Select value={op.method || 'label'} label="Method" onChange={(e) => onChange({ ...op, method: e.target.value })}>
                                <MenuItem value="label">Label Encoding</MenuItem>
                                <MenuItem value="onehot">One-Hot Encoding</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Scale Numeric */}
                {op.op === 'scale_numeric' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.column || ''} label="Column" onChange={(e) => onChange({ ...op, column: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Method</InputLabel>
                            <Select value={op.method || 'standard'} label="Method" onChange={(e) => onChange({ ...op, method: e.target.value })}>
                                <MenuItem value="standard">Standardize (z-score)</MenuItem>
                                <MenuItem value="minmax">Min-Max (0–1)</MenuItem>
                                <MenuItem value="log">Log Transform</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Filter Rows */}
                {op.op === 'filter_rows' && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Column</InputLabel>
                            <Select value={op.column || ''} label="Column" onChange={(e) => onChange({ ...op, column: e.target.value })}>
                                {columnNames.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Condition</InputLabel>
                            <Select value={op.condition || 'eq'} label="Condition" onChange={(e) => onChange({ ...op, condition: e.target.value })}>
                                {FILTER_CONDITIONS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Value" value={op.value || ''} onChange={(e) => onChange({ ...op, value: e.target.value })} sx={{ flex: 1 }} />
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DataPrepStudio() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [tab, setTab] = useState(0)

    // Data state
    const [dataset, setDataset] = useState<any>(null)
    const [sample, setSample] = useState<SampleData | null>(null)
    const [eda, setEda] = useState<EDAData | null>(null)
    const [loading, setLoading] = useState(true)
    const [edaLoading, setEdaLoading] = useState(false)
    const [sampleLoading, setSampleLoading] = useState(false)

    // Transform state
    const [pipeline, setPipeline] = useState<TransformOp[]>([])
    const [transforming, setTransforming] = useState(false)
    const [snackMsg, setSnackMsg] = useState('')

    // Load dataset detail
    useEffect(() => {
        if (!id) return
        setLoading(true)
        api.get(`/data/datasets/${id}`)
            .then(({ data }) => setDataset(data))
            .catch(() => navigate('/data'))
            .finally(() => setLoading(false))
    }, [id])

    // Load sample when tab changes
    useEffect(() => {
        if (tab === 1 && id && !sample) {
            setSampleLoading(true)
            api.get(`/data/datasets/${id}/sample?rows=100`)
                .then(({ data }) => setSample(data))
                .finally(() => setSampleLoading(false))
        }
    }, [tab, id])

    // Load EDA when tab changes
    useEffect(() => {
        if (tab === 2 && id && !eda) {
            setEdaLoading(true)
            api.get(`/data/datasets/${id}/eda`)
                .then(({ data }) => setEda(data))
                .finally(() => setEdaLoading(false))
        }
    }, [tab, id])

    const columnNames = dataset?.columns_metadata ? Object.keys(dataset.columns_metadata) : (sample?.columns || [])

    const addOp = (opType: string) => {
        setPipeline([...pipeline, { id: Date.now().toString(), op: opType }])
    }

    const updateOp = (idx: number, op: TransformOp) => {
        const copy = [...pipeline]
        copy[idx] = op
        setPipeline(copy)
    }

    const removeOp = (idx: number) => {
        setPipeline(pipeline.filter((_, i) => i !== idx))
    }

    const applyTransforms = async () => {
        if (!id || pipeline.length === 0) return
        setTransforming(true)
        try {
            const ops = pipeline.map(({ id: _id, ...rest }) => rest)
            const { data } = await api.post(`/data/datasets/${id}/transform`, { operations: ops })
            setSnackMsg(data.message)
            setPipeline([])
            // Refresh data
            const { data: ds } = await api.get(`/data/datasets/${id}`)
            setDataset(ds)
            setSample(null)
            setEda(null)
        } catch (e: any) {
            setSnackMsg(e.response?.data?.detail || 'Transform failed')
        } finally {
            setTransforming(false)
        }
    }

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
    )

    if (!dataset) return <Alert severity="error">Dataset not found</Alert>

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/data')} sx={{ color: 'text.secondary' }}>
                    <ArrowBack />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h5" fontWeight={800}>{dataset.name}</Typography>
                        <Chip label={`v${dataset.version}`} size="small" sx={{
                            height: 20, fontSize: 10, fontWeight: 700,
                            background: 'rgba(99,102,241,0.12)', color: '#818CF8',
                            border: '1px solid rgba(99,102,241,0.25)',
                        }} />
                        <Chip label={dataset.dataset_type} size="small" sx={{
                            height: 20, fontSize: 10,
                            background: 'rgba(255,255,255,0.05)',
                        }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {dataset.row_count?.toLocaleString()} rows · {dataset.column_count} columns · {dataset.quality_score ? `${dataset.quality_score}% quality` : 'processing...'}
                    </Typography>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Tab label="Overview" icon={<DataIcon />} iconPosition="start" sx={{ fontSize: 13, textTransform: 'none' }} />
                <Tab label="Data Preview" icon={<Visibility />} iconPosition="start" sx={{ fontSize: 13, textTransform: 'none' }} />
                <Tab label="EDA" icon={<BarChart />} iconPosition="start" sx={{ fontSize: 13, textTransform: 'none' }} />
                <Tab label="Transform" icon={<TransformIcon />} iconPosition="start" sx={{ fontSize: 13, textTransform: 'none' }} />
            </Tabs>

            {/* ═══ Tab 0: Overview ═══ */}
            {tab === 0 && (
                <Box className="fade-in">
                    {dataset.columns_metadata ? (
                        <Grid container spacing={2}>
                            {Object.entries(dataset.columns_metadata as Record<string, any>).map(([col, meta]: [string, any]) => {
                                const color = dtypeColor(meta?.dtype || '')
                                return (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={col}>
                                        <Card sx={{ height: '100%', borderRadius: '12px' }}>
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight={700}>{col}</Typography>
                                                    <Chip label={meta.dtype?.replace('float64', 'float').replace('int64', 'int').replace('object', 'str')}
                                                        size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}30` }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Unique</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{meta.unique_count?.toLocaleString()}</Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Nulls</Typography>
                                                        <Typography variant="body2" fontWeight={600} sx={{ color: meta.null_count > 0 ? '#EF4444' : '#10B981' }}>
                                                            {meta.null_count} ({meta.null_pct}%)
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {meta.mean != null && (
                                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Mean</Typography>
                                                            <Typography variant="body2" fontWeight={600}>{Number(meta.mean).toFixed(2)}</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Range</Typography>
                                                            <Typography variant="body2" fontWeight={600}>{meta.min} – {meta.max}</Typography>
                                                        </Box>
                                                    </Box>
                                                )}
                                                {meta.top_values && (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Top Values</Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                                            {Object.entries(meta.top_values).slice(0, 4).map(([k, v]) => (
                                                                <Chip key={k} label={`${k}: ${v}`} size="small"
                                                                    sx={{ height: 18, fontSize: 9, background: 'rgba(255,255,255,0.05)' }} />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                                {/* Null bar */}
                                                <Box sx={{ mt: 1.5 }}>
                                                    <LinearProgress variant="determinate" value={100 - (meta.null_pct || 0)}
                                                        sx={{ height: 4, borderRadius: 2, background: 'rgba(239,68,68,0.15)',
                                                            '& .MuiLinearProgress-bar': { background: '#10B981', borderRadius: 2 } }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )
                            })}
                        </Grid>
                    ) : (
                        <Alert severity="info">Profile not yet available. Dataset may still be processing.</Alert>
                    )}
                </Box>
            )}

            {/* ═══ Tab 1: Data Preview ═══ */}
            {tab === 1 && (
                <Box className="fade-in">
                    {sampleLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                    ) : sample ? (
                        <Card sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <Box sx={{
                                px: 2, py: 1.5, background: 'rgba(99,102,241,0.06)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary' }}>
                                    Showing {sample.data.length} of {sample.total_rows.toLocaleString()} rows · {sample.total_columns} columns
                                </Typography>
                            </Box>
                            <TableContainer sx={{ maxHeight: 500 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ background: '#111117', fontWeight: 700, fontSize: 11, color: '#6B7280', position: 'sticky', left: 0, zIndex: 3, minWidth: 40, py: 1 }}>#</TableCell>
                                            {sample.columns.map(col => (
                                                <TableCell key={col} sx={{ background: '#111117', fontWeight: 700, fontSize: 11, color: '#D1D5DB', whiteSpace: 'nowrap', py: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: dtypeColor(sample.dtypes[col] || ''), flexShrink: 0 }} />
                                                        {col}
                                                        <Typography component="span" sx={{ fontSize: 9, color: '#6B7280', ml: 0.3 }}>
                                                            {sample.dtypes[col]?.replace('float64', 'float').replace('int64', 'int').replace('object', 'str')}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sample.data.map((row, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell sx={{ color: '#4B5563', fontSize: 11, background: '#0A0A0F', position: 'sticky', left: 0, zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{i + 1}</TableCell>
                                                {sample.columns.map(col => (
                                                    <TableCell key={col} sx={{ fontSize: 12, color: '#E5E7EB', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        {row[col] === '' || row[col] == null
                                                            ? <Box component="span" sx={{ color: '#4B5563', fontStyle: 'italic' }}>null</Box>
                                                            : String(row[col])}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    ) : (
                        <Alert severity="info">Could not load data preview.</Alert>
                    )}
                </Box>
            )}

            {/* ═══ Tab 2: EDA ═══ */}
            {tab === 2 && (
                <Box className="fade-in">
                    {edaLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                    ) : eda ? (
                        <>
                            <Typography variant="h6" fontWeight={700} mb={2}>📊 Column Analysis</Typography>
                            <Grid container spacing={2} mb={4}>
                                {Object.entries(eda.columns).map(([col, meta]) => (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={col}>
                                        <Card sx={{ borderRadius: '12px', height: '100%' }}>
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight={700}>{col}</Typography>
                                                    <Chip label={meta.dtype.replace('float64', 'float').replace('int64', 'int').replace('object', 'str')}
                                                        size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, background: `${dtypeColor(meta.dtype)}15`, color: dtypeColor(meta.dtype) }} />
                                                </Box>

                                                {/* Stats */}
                                                {meta.stats && (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                                                        {[
                                                            ['Mean', meta.stats.mean],
                                                            ['Med', meta.stats.median],
                                                            ['Std', meta.stats.std],
                                                            ['Skew', meta.stats.skewness],
                                                        ].map(([label, value]) => (
                                                            <Box key={label as string}>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 9 }}>{label}</Typography>
                                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{Number(value).toFixed(2)}</Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}

                                                {/* Histogram */}
                                                {meta.histogram && <Histogram counts={meta.histogram.counts} edges={meta.histogram.edges} />}

                                                {/* Value counts bar */}
                                                {meta.value_counts && <ValueCountsBar data={meta.value_counts} />}

                                                {/* Outliers */}
                                                {meta.outliers && meta.outliers.count > 0 && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
                                                        <WarningIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                                                        <Typography variant="caption" sx={{ color: '#F59E0B', fontSize: 10 }}>
                                                            {meta.outliers.count} outliers ({meta.outliers.pct}%)
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Null indicator */}
                                                {meta.null_count > 0 && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                                                        <Typography variant="caption" sx={{ color: '#EF4444', fontSize: 10 }}>
                                                            {meta.null_count} missing ({meta.null_pct}%)
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Missing Values Summary */}
                            {Object.keys(eda.missing_summary).length > 0 && (
                                <Box mb={4}>
                                    <Typography variant="h6" fontWeight={700} mb={2}>🔍 Missing Values</Typography>
                                    <Card sx={{ borderRadius: '12px' }}>
                                        <CardContent sx={{ p: 2.5 }}>
                                            {Object.entries(eda.missing_summary).map(([col, info]) => (
                                                <Box key={col} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 140 }}>{col}</Typography>
                                                    <Box sx={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.04)' }}>
                                                        <Box sx={{
                                                            height: '100%', borderRadius: 5,
                                                            width: `${info.pct}%`,
                                                            background: info.pct > 50 ? '#EF4444' : info.pct > 20 ? '#F59E0B' : '#6366F1',
                                                            transition: 'width 0.6s ease',
                                                        }} />
                                                    </Box>
                                                    <Typography variant="caption" sx={{ minWidth: 80, textAlign: 'right', color: 'text.secondary' }}>
                                                        {info.count.toLocaleString()} ({info.pct}%)
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {/* Correlation Matrix */}
                            {eda.correlations?.matrix && eda.correlations.columns.length > 0 && (
                                <Box mb={4}>
                                    <Typography variant="h6" fontWeight={700} mb={2}>🔗 Correlation Matrix</Typography>
                                    <Card sx={{ borderRadius: '12px', overflow: 'auto' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'inline-block', minWidth: 'fit-content' }}>
                                                {/* Header row */}
                                                <Box sx={{ display: 'flex' }}>
                                                    <Box sx={{ width: 90, flexShrink: 0 }} />
                                                    {eda.correlations.columns.map(c => (
                                                        <Box key={c} sx={{ width: 56, textAlign: 'center', p: 0.5 }}>
                                                            <Typography variant="caption" sx={{ fontSize: 9, color: '#9CA3AF', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}>
                                                                {c.length > 10 ? c.slice(0, 10) + '…' : c}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                                {/* Matrix rows */}
                                                {eda.correlations.matrix.map((row, i) => (
                                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="caption" sx={{ width: 90, flexShrink: 0, fontSize: 10, color: '#D1D5DB', pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {eda.correlations.columns[i]}
                                                        </Typography>
                                                        {row.map((v, j) => (
                                                            <Tooltip key={j} title={`${eda.correlations.columns[i]} ↔ ${eda.correlations.columns[j]}: ${v.toFixed(3)}`} arrow>
                                                                <Box sx={{
                                                                    width: 56, height: 28,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    background: corrColor(v),
                                                                    border: '1px solid rgba(255,255,255,0.03)',
                                                                    borderRadius: '3px',
                                                                    cursor: 'default',
                                                                }}>
                                                                    <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 600, color: Math.abs(v) > 0.3 ? '#fff' : '#9CA3AF' }}>
                                                                        {i === j ? '1' : v.toFixed(2)}
                                                                    </Typography>
                                                                </Box>
                                                            </Tooltip>
                                                        ))}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Alert severity="info">Could not load EDA data. Dataset may only support tabular format.</Alert>
                    )}
                </Box>
            )}

            {/* ═══ Tab 3: Transform ═══ */}
            {tab === 3 && (
                <Box className="fade-in">
                    {/* Add Transform Ops */}
                    <Box mb={3}>
                        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Add Transformation</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {TRANSFORM_OPS.map(op => (
                                <Button
                                    key={op.value}
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Typography fontSize={14}>{op.icon}</Typography>}
                                    onClick={() => addOp(op.value)}
                                    sx={{
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: '#D1D5DB',
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontSize: 12,
                                        '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.08)' },
                                    }}
                                >
                                    {op.label}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

                    {/* Pipeline */}
                    {pipeline.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <TransformIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No transforms added</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Click buttons above to add operations to the pipeline</Typography>
                        </Box>
                    ) : (
                        <>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>
                                Pipeline ({pipeline.length} operation{pipeline.length > 1 ? 's' : ''})
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                                {pipeline.map((op, i) => (
                                    <Box key={op.id}>
                                        {i > 0 && (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                                <Box sx={{ width: 2, height: 20, background: 'rgba(99,102,241,0.3)', borderRadius: 1 }} />
                                            </Box>
                                        )}
                                        <TransformConfig
                                            op={op}
                                            columnNames={columnNames}
                                            onChange={(updated) => updateOp(i, updated)}
                                            onRemove={() => removeOp(i)}
                                        />
                                    </Box>
                                ))}
                            </Box>

                            {/* Apply button */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={transforming ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                                    disabled={transforming}
                                    onClick={applyTransforms}
                                    sx={{
                                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                        px: 4, py: 1.2, borderRadius: '10px', fontWeight: 700,
                                    }}
                                >
                                    {transforming ? 'Applying...' : `Apply ${pipeline.length} Transform${pipeline.length > 1 ? 's' : ''}`}
                                </Button>
                                <Button variant="outlined" onClick={() => setPipeline([])}
                                    sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'text.secondary', borderRadius: '10px' }}>
                                    Clear All
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            )}

            <Snackbar
                open={!!snackMsg}
                autoHideDuration={4000}
                onClose={() => setSnackMsg('')}
                message={snackMsg}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    )
}
