import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    Box, Typography, Card, CardContent, Button, Chip, LinearProgress,
    Grid, Alert, Stepper, Step, StepLabel, CircularProgress,
    Slider, FormHelperText, FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Tooltip,
    IconButton, Collapse, Accordion, AccordionSummary, AccordionDetails,
    Checkbox, FormControlLabel, TextField,
} from '@mui/material'
import {
    PlayArrow, TableChart, Image as ImgIcon, TextFields, CheckCircle,
    Cancel as CancelIcon, Visibility, VisibilityOff, ArrowDropDown,
    ExpandMore as ExpandMoreIcon, Tune as TuneIcon, RestartAlt as ResetIcon,
} from '@mui/icons-material'
import { fetchDatasets } from '../store/dataSlice'
import { fetchJobs, submitJob, cancelJob, appendLog, setProgress, resetLive } from '../store/trainingSlice'
import { api } from '../api/client'
import type { AppDispatch, RootState } from '../store/store'

const TASK_TYPES = [
    { value: 'classification', label: 'Classification', icon: <TableChart />, desc: 'Predict categories from tabular data', color: '#6366F1' },
    { value: 'regression', label: 'Regression', icon: <TableChart />, desc: 'Predict numeric values from tabular data', color: '#8B5CF6' },
    { value: 'image_classification', label: 'Image Classification', icon: <ImgIcon />, desc: 'Classify images into categories', color: '#F59E0B' },
    { value: 'text_classification', label: 'Text Classification', icon: <TextFields />, desc: 'Classify text into categories', color: '#10B981' },
    { value: 'sentiment', label: 'Sentiment Analysis', icon: <TextFields />, desc: 'Analyze positive/negative sentiment in text', color: '#3B82F6' },
]

const STEPS = ['Select Dataset', 'Configure', 'Train', 'Results']

const statusColor = (s: string) => ({ completed: '#10B981', running: '#6366F1', failed: '#EF4444', queued: '#F59E0B', cancelled: '#9CA3AF' }[s] || '#6B7280')

// Type colors for column dtype badges
const dtypeColor = (dtype: string) => {
    if (dtype.includes('int') || dtype.includes('float')) return '#10B981'
    if (dtype.includes('object') || dtype.includes('str')) return '#F59E0B'
    if (dtype.includes('bool')) return '#3B82F6'
    if (dtype.includes('date') || dtype.includes('time')) return '#EC4899'
    return '#6B7280'
}

interface ColumnMeta {
    dtype: string
    null_count: number
    null_pct: number
    unique_count: number
    mean?: number
    std?: number
    min?: number
    max?: number
    top_values?: Record<string, number>
}

export default function TrainingStudio() {
    const dispatch = useDispatch<AppDispatch>()
    const { datasets } = useSelector((s: RootState) => s.data)
    const { jobs, submitting, liveLog, liveProgress, currentJob } = useSelector((s: RootState) => s.training)
    const [step, setStep] = useState(0)
    const [datasetId, setDatasetId] = useState('')
    const [taskType, setTaskType] = useState('')
    const [targetColumn, setTargetColumn] = useState('')
    const [timeLimit, setTimeLimit] = useState(120)
    const logsRef = useRef<HTMLDivElement>(null)

    // Dataset detail state
    const [columnsMeta, setColumnsMeta] = useState<Record<string, ColumnMeta>>({})
    const [sampleData, setSampleData] = useState<Record<string, any>[]>([])
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [columnNames, setColumnNames] = useState<string[]>([])

    // Advanced hyperparameters
    const [algorithm, setAlgorithm] = useState('auto')
    const [nEstimators, setNEstimators] = useState(100)
    const [maxDepth, setMaxDepth] = useState<number | null>(null)
    const [learningRate, setLearningRate] = useState(0.1)
    const [testSize, setTestSize] = useState(0.2)
    const [crossValidation, setCrossValidation] = useState<number | null>(null)
    const [excludedCols, setExcludedCols] = useState<string[]>([])

    useEffect(() => { dispatch(fetchDatasets()); dispatch(fetchJobs()); }, [dispatch])

    useEffect(() => {
        if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
    }, [liveLog])

    // Fetch profile when dataset is selected
    useEffect(() => {
        if (!datasetId) {
            setColumnsMeta({})
            setSampleData([])
            setColumnNames([])
            setTargetColumn('')
            return
        }
        let cancelled = false
        const fetchProfile = async () => {
            setLoadingProfile(true)
            try {
                const { data } = await api.get(`/data/datasets/${datasetId}/profile`)
                if (cancelled) return
                if (data.columns) {
                    setColumnsMeta(data.columns)
                    setColumnNames(Object.keys(data.columns))
                }
                if (data.sample) {
                    setSampleData(data.sample.slice(0, 50))
                }
            } catch {
                // Profile may not be ready yet
            } finally {
                if (!cancelled) setLoadingProfile(false)
            }
        }
        fetchProfile()
        return () => { cancelled = true }
    }, [datasetId])

    // SSE for live log streaming
    useEffect(() => {
        if (!currentJob?.id || currentJob.status === 'completed' || currentJob.status === 'failed') return
        const token = localStorage.getItem('access_token')
        if (!token) return

        const es = new EventSource(`http://localhost:8000/api/v1/training/jobs/${currentJob.id}/logs?token=${token}`)

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                dispatch(appendLog(data.message || e.data))
                if (data.pct) dispatch(setProgress(data.pct))
                if (data.event === 'completed' || data.event === 'failed') {
                    dispatch(fetchJobs())
                    es.close()
                }
            } catch {
                dispatch(appendLog(e.data))
            }
        }
        es.onerror = () => { es.close() }
        return () => { es.close() }
    }, [currentJob?.id, currentJob?.status])

    const readyDatasets = datasets.filter(d => d.status === 'ready')
    const selectedDataset = datasets.find(d => d.id === datasetId)
    const isTabular = ['classification', 'regression'].includes(taskType)

    const handleSubmit = async () => {
        dispatch(resetLive())
        const payload: any = {
            dataset_id: datasetId,
            task_type: taskType,
            config: {
                time_limit_seconds: timeLimit,
                algorithm,
                n_estimators: nEstimators,
                max_depth: maxDepth,
                learning_rate: learningRate,
                test_size: testSize,
                cross_validation: crossValidation,
                excluded_columns: excludedCols,
            },
        }
        if (isTabular && targetColumn) payload.target_column = targetColumn
        const result = await dispatch(submitJob(payload))
        if (submitJob.fulfilled.match(result)) setStep(2)
    }

    const resetAdvanced = () => {
        setAlgorithm('auto'); setNEstimators(100); setMaxDepth(null)
        setLearningRate(0.1); setTestSize(0.2); setCrossValidation(null)
        setExcludedCols([])
    }

    const toggleExcludeCol = (col: string) => {
        setExcludedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
    }

    // Auto-detect task type suggestion
    const suggestedTaskType = (() => {
        if (!targetColumn || !columnsMeta[targetColumn]) return null
        const meta = columnsMeta[targetColumn]
        if (meta.dtype?.includes('float') || meta.dtype?.includes('int')) {
            if (meta.unique_count && meta.unique_count <= 10) return 'classification'
            return 'regression'
        }
        if (meta.dtype?.includes('object') || meta.dtype?.includes('str')) return 'classification'
        return null
    })()

    return (
        <Box className="fade-in">
            <Box mb={3}>
                <Typography variant="h4" fontWeight={800}>Training Studio</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Train AI models without writing a single line of code</Typography>
            </Box>

            <Stepper activeStep={step} sx={{ mb: 4 }}>
                {STEPS.map((label) => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

            {/* Step 0: Dataset Selection */}
            {step === 0 && (
                <Box className="fade-in">
                    <Typography variant="h6" fontWeight={700} mb={2}>Choose a Dataset</Typography>
                    {readyDatasets.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No ready datasets. Please upload a dataset in the Data Explorer first.
                        </Alert>
                    ) : (
                        <Grid container spacing={2}>
                            {readyDatasets.map((ds: any) => (
                                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={ds.id}>
                                    <Card
                                        sx={{
                                            cursor: 'pointer',
                                            border: datasetId === ds.id ? '2px solid #6366F1' : '2px solid transparent',
                                            boxShadow: datasetId === ds.id ? '0 0 20px rgba(99,102,241,0.2)' : undefined,
                                        }}
                                        onClick={() => setDatasetId(ds.id)}
                                    >
                                        <CardContent sx={{ p: 2.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body1" fontWeight={600} noWrap>{ds.name}</Typography>
                                                {datasetId === ds.id && <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />}
                                            </Box>
                                            <Chip label={ds.dataset_type} size="small" sx={{ mb: 1, fontSize: 11 }} />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                {ds.row_count?.toLocaleString()} rows · {ds.column_count} columns
                                            </Typography>
                                            {/* Metric chart placeholder */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 40, mt: 2 }}>
                                                {[...Array(12)].map((_, j: number) => (
                                                    <Box key={j} sx={{
                                                        flex: 1,
                                                        height: `${Math.random() * 80 + 20}%`,
                                                        bgcolor: 'rgba(16,185,129,0.2)',
                                                        borderRadius: '2px 2px 0 0'
                                                    }} />
                                                ))}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Data Preview Panel */}
                    {datasetId && (
                        <Box sx={{ mt: 3, animation: 'fadeIn 0.4s ease forwards' }}>
                            {/* Column Overview */}
                            {loadingProfile ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading dataset profile...</Typography>
                                </Box>
                            ) : columnNames.length > 0 && (
                                <>
                                    {/* Column Cards */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            📊 Dataset Columns ({columnNames.length})
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
                                            onClick={() => setShowPreview(!showPreview)}
                                            sx={{ color: 'text.secondary', fontSize: 12 }}
                                        >
                                            {showPreview ? 'Hide' : 'Show'} Data Preview
                                        </Button>
                                    </Box>

                                    <Box sx={{
                                        display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2,
                                    }}>
                                        {columnNames.map((col) => {
                                            const meta = columnsMeta[col]
                                            const color = dtypeColor(meta?.dtype || '')
                                            return (
                                                <Tooltip
                                                    key={col}
                                                    arrow
                                                    title={
                                                        <Box sx={{ p: 0.5, fontSize: 12 }}>
                                                            <Box><b>Column:</b> {col}</Box>
                                                            <Box><b>Type:</b> {meta?.dtype}</Box>
                                                            <Box><b>Unique:</b> {meta?.unique_count?.toLocaleString()}</Box>
                                                            <Box><b>Nulls:</b> {meta?.null_count} ({meta?.null_pct}%)</Box>
                                                            {meta?.mean != null && <Box><b>Mean:</b> {meta.mean}</Box>}
                                                            {meta?.min != null && <Box><b>Range:</b> {meta.min} — {meta.max}</Box>}
                                                            {meta?.top_values && (
                                                                <Box><b>Top:</b> {Object.keys(meta.top_values).slice(0, 3).join(', ')}</Box>
                                                            )}
                                                        </Box>
                                                    }
                                                >
                                                    <Chip
                                                        label={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Box sx={{
                                                                    width: 6, height: 6, borderRadius: '50%',
                                                                    background: color, flexShrink: 0,
                                                                }} />
                                                                <span>{col}</span>
                                                                <Box component="span" sx={{ fontSize: 9, color: 'text.secondary', ml: 0.3 }}>
                                                                    {meta?.dtype?.replace('float64', 'float').replace('int64', 'int').replace('object', 'str')}
                                                                </Box>
                                                            </Box>
                                                        }
                                                        size="small"
                                                        sx={{
                                                            background: `${color}10`,
                                                            border: `1px solid ${color}25`,
                                                            borderRadius: '8px',
                                                            fontSize: 12,
                                                            height: 28,
                                                            cursor: 'default',
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                                background: `${color}20`,
                                                                borderColor: `${color}50`,
                                                            },
                                                        }}
                                                    />
                                                </Tooltip>
                                            )
                                        })}
                                    </Box>

                                    {/* Data Preview Table */}
                                    <Collapse in={showPreview} timeout={400}>
                                        {sampleData.length > 0 && (
                                            <Card sx={{ borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
                                                <Box sx={{
                                                    px: 2, py: 1.5,
                                                    background: 'rgba(99,102,241,0.06)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                }}>
                                                    <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary' }}>
                                                        Showing first {sampleData.length} rows
                                                    </Typography>
                                                    <Chip
                                                        label={`${selectedDataset?.row_count?.toLocaleString()} total rows`}
                                                        size="small"
                                                        sx={{ height: 20, fontSize: 10, background: 'rgba(255,255,255,0.05)' }}
                                                    />
                                                </Box>
                                                <TableContainer sx={{ maxHeight: 360 }}>
                                                    <Table size="small" stickyHeader>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell
                                                                    sx={{
                                                                        background: '#111117',
                                                                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                                                                        color: '#6B7280',
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        py: 1,
                                                                        minWidth: 40,
                                                                        position: 'sticky',
                                                                        left: 0,
                                                                        zIndex: 3,
                                                                    }}
                                                                >
                                                                    #
                                                                </TableCell>
                                                                {columnNames.map((col) => (
                                                                    <TableCell
                                                                        key={col}
                                                                        sx={{
                                                                            background: '#111117',
                                                                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                                                                            color: '#D1D5DB',
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            py: 1,
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <Box sx={{
                                                                                width: 5, height: 5, borderRadius: '50%',
                                                                                background: dtypeColor(columnsMeta[col]?.dtype || ''),
                                                                                flexShrink: 0,
                                                                            }} />
                                                                            {col}
                                                                        </Box>
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {sampleData.map((row, i) => (
                                                                <TableRow key={i} hover sx={{
                                                                    '&:hover': { background: 'rgba(99,102,241,0.04)' },
                                                                }}>
                                                                    <TableCell sx={{
                                                                        color: '#4B5563', fontSize: 11,
                                                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                                        background: '#0A0A0F',
                                                                        position: 'sticky',
                                                                        left: 0,
                                                                        zIndex: 1,
                                                                    }}>
                                                                        {i + 1}
                                                                    </TableCell>
                                                                    {columnNames.map((col) => (
                                                                        <TableCell key={col} sx={{
                                                                            fontSize: 12,
                                                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                                            color: '#E5E7EB',
                                                                            maxWidth: 200,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            py: 0.8,
                                                                        }}>
                                                                            {row[col] === null || row[col] === undefined || row[col] === ''
                                                                                ? <Box component="span" sx={{ color: '#4B5563', fontStyle: 'italic' }}>null</Box>
                                                                                : String(row[col])
                                                                            }
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Card>
                                        )}
                                    </Collapse>
                                </>
                            )}
                        </Box>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" disabled={!datasetId} onClick={() => setStep(1)}>
                            Continue →
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Step 1: Configure */}
            {step === 1 && (
                <Box className="fade-in">
                    <Typography variant="h6" fontWeight={700} mb={2}>Configure Training</Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Select task type:</Typography>
                    <Grid container spacing={2} mb={3}>
                        {TASK_TYPES.map((t) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={t.value}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        border: taskType === t.value ? `2px solid ${t.color}` : '2px solid transparent',
                                        boxShadow: taskType === t.value ? `0 0 20px ${t.color}30` : undefined,
                                    }}
                                    onClick={() => setTaskType(t.value)}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ color: t.color, mb: 1 }}>{t.icon}</Box>
                                        <Typography variant="body1" fontWeight={600}>{t.label}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.desc}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Target Column Dropdown — auto-populated from dataset columns */}
                    {isTabular && selectedDataset?.dataset_type === 'tabular' && columnNames.length > 0 && (
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel id="target-column-label">Target Column (label to predict)</InputLabel>
                            <Select
                                labelId="target-column-label"
                                id="target-column-select"
                                value={targetColumn}
                                label="Target Column (label to predict)"
                                onChange={(e) => setTargetColumn(e.target.value)}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            maxHeight: 360,
                                            background: '#1A1A24',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        },
                                    },
                                }}
                            >
                                {columnNames.map((col) => {
                                    const meta = columnsMeta[col]
                                    const color = dtypeColor(meta?.dtype || '')
                                    return (
                                        <MenuItem key={col} value={col} sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                                <Box sx={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: color, flexShrink: 0,
                                                }} />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600}>{col}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {meta?.dtype} · {meta?.unique_count?.toLocaleString()} unique
                                                        {meta?.null_pct > 0 && ` · ${meta.null_pct}% null`}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={meta?.dtype?.replace('float64', 'float').replace('int64', 'int').replace('object', 'str')}
                                                    size="small"
                                                    sx={{
                                                        height: 20, fontSize: 10, fontWeight: 600,
                                                        background: `${color}15`, color: color,
                                                        border: `1px solid ${color}30`,
                                                    }}
                                                />
                                            </Box>
                                        </MenuItem>
                                    )
                                })}
                            </Select>
                            <FormHelperText>
                                {targetColumn
                                    ? (() => {
                                        const meta = columnsMeta[targetColumn]
                                        if (!meta) return ''
                                        const info: string[] = [`Type: ${meta.dtype}`, `${meta.unique_count} unique values`]
                                        if (meta.null_count > 0) info.push(`${meta.null_count} nulls (${meta.null_pct}%)`)
                                        if (meta.mean != null) info.push(`Mean: ${meta.mean}`)
                                        return info.join(' · ')
                                    })()
                                    : 'Select the column you want to predict'
                                }
                            </FormHelperText>
                        </FormControl>
                    )}

                    {/* Fallback text input if columns couldn't be loaded */}
                    {isTabular && selectedDataset?.dataset_type === 'tabular' && columnNames.length === 0 && (
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel id="target-col-fallback">Target Column</InputLabel>
                            <Select
                                labelId="target-col-fallback"
                                value={targetColumn}
                                label="Target Column"
                                onChange={(e) => setTargetColumn(e.target.value)}
                                open={false}
                                disabled
                            />
                            <FormHelperText>
                                {loadingProfile
                                    ? 'Loading columns...'
                                    : 'Column data not available. Dataset may still be processing.'
                                }
                            </FormHelperText>
                        </FormControl>
                    )}

                    {/* Auto-detect task type hint */}
                    {suggestedTaskType && !taskType && (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                            Based on your target column, we suggest <strong>{suggestedTaskType}</strong>.{' '}
                            <Button size="small" onClick={() => setTaskType(suggestedTaskType)}>Use suggestion</Button>
                        </Alert>
                    )}

                    <Typography variant="body2" fontWeight={600} mb={1}>Time Budget: {timeLimit}s</Typography>
                    <Slider
                        value={timeLimit}
                        min={30}
                        max={600}
                        step={30}
                        onChange={(_: Event, v: number | number[]) => setTimeLimit(v as number)}
                        marks={[
                            { value: 30, label: '30s' },
                            { value: 300, label: '5m' },
                            { value: 600, label: '10m' },
                        ]}
                        sx={{ mb: 3 }}
                    />
                    <FormHelperText>Longer time budgets typically yield better models</FormHelperText>

                    {/* Feature Column Selection */}
                    {isTabular && columnNames.length > 0 && targetColumn && (
                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1}>
                                📋 Feature Columns ({columnNames.filter(c => c !== targetColumn && !excludedCols.includes(c)).length} selected)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Uncheck columns you don't want to use as features (e.g. IDs, names, dates that shouldn't predict the target)
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {columnNames.filter(c => c !== targetColumn).map(col => {
                                    const meta = columnsMeta[col]
                                    const isExcluded = excludedCols.includes(col)
                                    const isIdLike = meta && meta.unique_count === (selectedDataset?.row_count || 0)
                                    const color = dtypeColor(meta?.dtype || '')
                                    return (
                                        <Chip
                                            key={col}
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Checkbox
                                                        checked={!isExcluded}
                                                        onChange={() => toggleExcludeCol(col)}
                                                        size="small"
                                                        sx={{ p: 0, mr: 0.5 }}
                                                    />
                                                    <span>{col}</span>
                                                    {isIdLike && !isExcluded && (
                                                        <Tooltip title="This column has all unique values — it might be an ID column">
                                                            <Box component="span" sx={{ fontSize: 12 }}>⚠️</Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            }
                                            size="small"
                                            variant="outlined"
                                            onClick={() => toggleExcludeCol(col)}
                                            sx={{
                                                opacity: isExcluded ? 0.4 : 1,
                                                textDecoration: isExcluded ? 'line-through' : 'none',
                                                borderColor: isExcluded ? '#6B728030' : `${color}40`,
                                                cursor: 'pointer',
                                            }}
                                        />
                                    )
                                })}
                            </Box>
                            {excludedCols.length > 0 && (
                                <Typography variant="caption" sx={{ color: '#F59E0B', mt: 1, display: 'block' }}>
                                    ⚠ {excludedCols.length} column(s) excluded from training
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Advanced Settings Accordion */}
                    <Accordion
                        sx={{ mt: 2, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px !important', '&:before': { display: 'none' } }}
                        disableGutters
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TuneIcon fontSize="small" sx={{ color: '#6366F1' }} />
                                <Typography variant="body2" fontWeight={600}>Advanced Settings</Typography>
                                <Typography variant="caption" color="text.secondary">(optional)</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                <Button size="small" startIcon={<ResetIcon />} onClick={resetAdvanced} sx={{ fontSize: 11 }}>Reset to Defaults</Button>
                            </Box>
                            <Grid container spacing={3}>
                                {/* Algorithm Selection */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Algorithm</InputLabel>
                                        <Select value={algorithm} label="Algorithm" onChange={e => setAlgorithm(e.target.value)}>
                                            <MenuItem value="auto">🤖 Auto (try all, pick best)</MenuItem>
                                            {isTabular && taskType === 'regression' ? (
                                                [
                                                    <MenuItem key="lr" value="linear_regression">Linear Regression</MenuItem>,
                                                    <MenuItem key="rf" value="random_forest">Random Forest</MenuItem>,
                                                    <MenuItem key="gb" value="gradient_boosting">Gradient Boosting</MenuItem>,
                                                    <MenuItem key="svm" value="svm">SVR (Support Vector)</MenuItem>,
                                                    <MenuItem key="knn" value="knn">KNN (K-Nearest Neighbors)</MenuItem>,
                                                ]
                                            ) : (
                                                [
                                                    <MenuItem key="lr" value="logistic_regression">Logistic Regression</MenuItem>,
                                                    <MenuItem key="rf" value="random_forest">Random Forest</MenuItem>,
                                                    <MenuItem key="gb" value="gradient_boosting">Gradient Boosting</MenuItem>,
                                                    <MenuItem key="svm" value="svm">SVM (Support Vector Machine)</MenuItem>,
                                                    <MenuItem key="knn" value="knn">KNN (K-Nearest Neighbors)</MenuItem>,
                                                ]
                                            )}
                                        </Select>
                                        <FormHelperText>Auto tries multiple algorithms and picks the best one</FormHelperText>
                                    </FormControl>
                                </Grid>

                                {/* Cross Validation */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Cross Validation</InputLabel>
                                        <Select value={crossValidation ?? ''} label="Cross Validation" onChange={e => setCrossValidation(e.target.value === '' ? null : Number(e.target.value))}>
                                            <MenuItem value="">None (faster)</MenuItem>
                                            <MenuItem value={3}>3-Fold</MenuItem>
                                            <MenuItem value={5}>5-Fold (recommended)</MenuItem>
                                            <MenuItem value={10}>10-Fold (thorough)</MenuItem>
                                        </Select>
                                        <FormHelperText>Validates model performance across multiple data splits</FormHelperText>
                                    </FormControl>
                                </Grid>

                                {/* N Estimators */}
                                {['random_forest', 'gradient_boosting', 'auto'].includes(algorithm) && (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" fontWeight={600}>Number of Trees: {nEstimators}</Typography>
                                        <Slider value={nEstimators} min={10} max={500} step={10}
                                            onChange={(_: Event, v: number | number[]) => setNEstimators(v as number)}
                                            marks={[{ value: 10, label: '10' }, { value: 100, label: '100' }, { value: 500, label: '500' }]}
                                        />
                                        <FormHelperText>More trees = better accuracy but slower training</FormHelperText>
                                    </Grid>
                                )}

                                {/* Max Depth */}
                                {['random_forest', 'gradient_boosting', 'auto'].includes(algorithm) && (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" fontWeight={600}>Max Tree Depth: {maxDepth ?? 'Unlimited'}</Typography>
                                        <Slider value={maxDepth ?? 0} min={0} max={50} step={1}
                                            onChange={(_: Event, v: number | number[]) => setMaxDepth((v as number) === 0 ? null : v as number)}
                                            marks={[{ value: 0, label: 'Auto' }, { value: 10, label: '10' }, { value: 50, label: '50' }]}
                                        />
                                        <FormHelperText>Limit tree depth to prevent overfitting (0 = unlimited)</FormHelperText>
                                    </Grid>
                                )}

                                {/* Learning Rate */}
                                {['gradient_boosting', 'auto'].includes(algorithm) && (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" fontWeight={600}>Learning Rate: {learningRate}</Typography>
                                        <Slider value={learningRate} min={0.001} max={1} step={0.01}
                                            onChange={(_: Event, v: number | number[]) => setLearningRate(v as number)}
                                            marks={[{ value: 0.01, label: '0.01' }, { value: 0.1, label: '0.1' }, { value: 1, label: '1.0' }]}
                                        />
                                        <FormHelperText>Smaller = more precise but slower; larger = faster but may overshoot</FormHelperText>
                                    </Grid>
                                )}

                                {/* Test Size */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" fontWeight={600}>Test Split: {(testSize * 100).toFixed(0)}%</Typography>
                                    <Slider value={testSize} min={0.1} max={0.4} step={0.05}
                                        onChange={(_: Event, v: number | number[]) => setTestSize(v as number)}
                                        marks={[{ value: 0.1, label: '10%' }, { value: 0.2, label: '20%' }, { value: 0.4, label: '40%' }]}
                                    />
                                    <FormHelperText>Percentage of data reserved for testing (not used in training)</FormHelperText>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button variant="outlined" onClick={() => setStep(0)}>← Back</Button>
                        <Button
                            variant="contained"
                            disabled={!taskType || submitting || (isTabular && !targetColumn)}
                            onClick={handleSubmit}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                        >
                            {submitting ? 'Submitting...' : 'Start Training'}
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Step 2: Training Progress */}
            {step === 2 && (
                <Box className="fade-in">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h6" fontWeight={700}>Training in Progress</Typography>
                        {currentJob?.status === 'running' && (
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<CancelIcon />}
                                onClick={() => currentJob && dispatch(cancelJob(currentJob.id))}
                            >
                                Cancel
                            </Button>
                        )}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                                {currentJob?.status === 'running' ? 'Training...' : currentJob?.status}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{liveProgress}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={liveProgress} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>

                    {/* Live Logs */}
                    <Box
                        ref={logsRef}
                        sx={{
                            background: '#060610',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 2,
                            p: 2,
                            height: 280,
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: 13,
                        }}
                    >
                        {liveLog.length === 0 ? (
                            <Typography variant="caption" sx={{ color: '#4B5563' }}>Waiting for training output...</Typography>
                        ) : (
                            liveLog.map((line: any, i: number) => (
                                <Box key={i} sx={{ color: line.includes('error') ? '#EF4444' : '#D1FAE5', mb: 0.3 }}>
                                    <span style={{ color: '#6B7280' }}>[{String(i + 1).padStart(3, '0')}] </span>
                                    {line}
                                </Box>
                            ))
                        )}
                    </Box>

                    {currentJob?.status === 'completed' && (
                        <Button variant="contained" sx={{ mt: 2 }} onClick={() => setStep(3)}>
                            View Results →
                        </Button>
                    )}
                </Box>
            )}

            {/* Step 3: Results */}
            {step === 3 && currentJob?.metrics && (
                <Box className="fade-in">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle sx={{ color: '#10B981' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Training Complete! 🎉</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Your model is ready in the Model Hub</Typography>
                        </Box>
                    </Box>

                    <Grid container spacing={2} mb={3}>
                        {Object.entries(currentJob.metrics)
                            .filter(([k]) => ['accuracy', 'f1_weighted', 'rmse', 'r2', 'roc_auc'].includes(k))
                            .map(([k, v]) => (
                                <Grid size={{ xs: 6, sm: 3 }} key={k}>
                                    <Box className="metric-card">
                                        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</Typography>
                                        <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981', mt: 0.5 }}>
                                            {typeof v === 'number' ? (v * 100 < 10 ? v.toFixed(4) : v.toFixed(2)) : String(v)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                    </Grid>
                </Box>
            )}

            {/* Existing Jobs */}
            {jobs.length > 0 && (
                <Box mt={4}>
                    <Typography variant="h6" fontWeight={700} mb={2}>All Training Jobs</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {jobs.map(j => (
                            <Card key={j.id}>
                                <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                <Typography variant="body2" fontWeight={600}>{j.task_type}</Typography>
                                                <Chip label={j.status} size="small" sx={{ background: `${statusColor(j.status)}15`, color: statusColor(j.status), fontSize: 10, height: 18 }} />
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {new Date(j.created_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        {j.metrics && (
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {Object.entries(j.metrics).filter(([k]) => ['accuracy', 'f1_weighted', 'rmse'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`).join(' · ')}
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}
