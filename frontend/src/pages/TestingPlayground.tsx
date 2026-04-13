import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
    Alert, LinearProgress, Chip, IconButton, Divider,
    Tab, Tabs, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
} from '@mui/material'
import { PlayArrow, ArrowBack, History as HistoryIcon, UploadFile as UploadIcon, Download as DownloadIcon } from '@mui/icons-material'
import { api } from '../api/client'

interface FeatureInfo {
    features: string[]
    n_features: number
    model_type: string
    task_type: string
}

export default function TestingPlayground() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [featureInfo, setFeatureInfo] = useState<FeatureInfo | null>(null)
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [featuresLoading, setFeaturesLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [tab, setTab] = useState(0) // 0=single, 1=batch
    const [batchResults, setBatchResults] = useState<any[]>([])
    const [batchLoading, setBatchLoading] = useState(false)
    const [batchFile, setBatchFile] = useState<File | null>(null)

    // Load feature names from the model
    useEffect(() => {
        if (!id) return
        setFeaturesLoading(true)
        api.get(`/inference/${id}/features`)
            .then(({ data }) => {
                setFeatureInfo(data)
                // Pre-populate empty inputs
                const empty: Record<string, string> = {}
                data.features.forEach((f: string) => { empty[f] = '' })
                setInputs(empty)
            })
            .catch(() => setError('Could not load model features'))
            .finally(() => setFeaturesLoading(false))
    }, [id])

    const handlePredict = async () => {
        setLoading(true)
        setError(null)
        try {
            // Convert numeric strings to numbers
            const cleanInputs: Record<string, any> = {}
            Object.entries(inputs).forEach(([key, val]) => {
                const num = Number(val)
                cleanInputs[key] = isNaN(num) || val.trim() === '' ? val : num
            })

            const { data } = await api.post(`/inference/${id}/predict`, { inputs: cleanInputs })
            setResult(data)
            setHistory(h => [{
                ...data,
                inputs: { ...cleanInputs },
                timestamp: new Date().toLocaleTimeString()
            }, ...h.slice(0, 9)])
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Prediction failed')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handlePredict()
    }

    if (featuresLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
    )

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/models')} sx={{ color: 'text.secondary' }}>
                    <ArrowBack />
                </IconButton>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Prediction Playground</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Enter values for each feature and get instant predictions
                        {featureInfo && (
                            <> · <Chip label={featureInfo.model_type} size="small" sx={{ height: 18, fontSize: 10, ml: 0.5 }} />
                            <Chip label={featureInfo.task_type} size="small" sx={{ height: 18, fontSize: 10, ml: 0.5, background: 'rgba(99,102,241,0.12)', color: '#818CF8' }} /></>
                        )}
                    </Typography>
                </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
                <Tab label="Single Prediction" />
                <Tab label="Batch Prediction (CSV)" />
            </Tabs>

            {tab === 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Input Panel — individual fields for each feature */}
                <Card sx={{ borderRadius: '14px' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} mb={0.5}>Input Features</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2.5 }}>
                            {featureInfo ? `${featureInfo.n_features} features expected` : 'Enter values below'}
                        </Typography>

                        {featureInfo && featureInfo.features.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {featureInfo.features.map((feat) => (
                                    <TextField
                                        key={feat}
                                        id={`input-${feat}`}
                                        label={feat}
                                        value={inputs[feat] || ''}
                                        onChange={(e) => setInputs(prev => ({ ...prev, [feat]: e.target.value }))}
                                        onKeyDown={handleKeyDown}
                                        fullWidth
                                        size="small"
                                        placeholder="Enter value..."
                                        InputProps={{
                                            sx: { borderRadius: '10px' }
                                        }}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <TextField
                                id="test-json-input"
                                label="Features (JSON)"
                                placeholder='{"feature1": 1.5, "feature2": "value"}'
                                fullWidth
                                multiline
                                rows={4}
                                onChange={(e) => {
                                    try { setInputs(JSON.parse(e.target.value)) } catch { }
                                }}
                                sx={{ mb: 2 }}
                            />
                        )}

                        <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.06)' }} />

                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

                        <Button
                            id="test-predict-btn"
                            variant="contained"
                            fullWidth
                            onClick={handlePredict}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                            sx={{
                                py: 1.5, borderRadius: '12px', fontWeight: 700,
                                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                fontSize: 15,
                            }}
                        >
                            {loading ? 'Running Prediction...' : '🚀 Predict'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {result ? (
                        <Card sx={{ borderRadius: '14px', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} mb={2}>Prediction Result</Typography>
                                <Box sx={{
                                    p: 3, borderRadius: '12px',
                                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                                    textAlign: 'center', mb: 2,
                                }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 1, fontWeight: 600 }}>PREDICTED VALUE</Typography>
                                    <Typography variant="h2" fontWeight={800} sx={{ color: '#10B981', mt: 0.5 }}>
                                        {typeof result.prediction === 'number'
                                            ? Number(result.prediction).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                            : String(result.prediction)}
                                    </Typography>
                                </Box>

                                {result.confidence != null && (
                                    <Box mb={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2">Confidence</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ color: '#6366F1' }}>
                                                {(result.confidence * 100).toFixed(1)}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={result.confidence * 100}
                                            sx={{ height: 8, borderRadius: 4, background: 'rgba(99,102,241,0.1)',
                                                '& .MuiLinearProgress-bar': { borderRadius: 4, background: 'linear-gradient(90deg, #6366F1, #10B981)' } }} />
                                    </Box>
                                )}

                                {result.class_probabilities && (
                                    <Box>
                                        <Typography variant="body2" fontWeight={600} mb={1.5}>Class Probabilities</Typography>
                                        {Object.entries(result.class_probabilities as Record<string, number>)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([cls, prob]) => (
                                                <Box key={cls} sx={{ mb: 1.5 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                                        <Typography variant="caption" fontWeight={600}>{cls}</Typography>
                                                        <Typography variant="caption" fontWeight={600}>{(prob * 100).toFixed(1)}%</Typography>
                                                    </Box>
                                                    <LinearProgress variant="determinate" value={prob * 100}
                                                        sx={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)',
                                                            '& .MuiLinearProgress-bar': { borderRadius: 3 } }} />
                                                </Box>
                                            ))}
                                    </Box>
                                )}

                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
                                    ⚡ Latency: {result.latency_ms?.toFixed(1)}ms
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card sx={{ borderRadius: '14px' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <PlayArrow sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.2, mb: 2 }} />
                                <Typography variant="h6" sx={{ color: 'text.secondary' }}>No prediction yet</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Fill in the feature values and click Predict
                                </Typography>
                            </CardContent>
                        </Card>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <Card sx={{ borderRadius: '14px' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    <Typography variant="body2" fontWeight={600}>Recent Predictions</Typography>
                                </Box>
                                {history.map((h, i) => (
                                    <Box key={i} sx={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        py: 1, borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                    }}>
                                        <Chip
                                            label={typeof h.prediction === 'number'
                                                ? Number(h.prediction).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                : String(h.prediction)}
                                            size="small"
                                            sx={{
                                                background: 'rgba(16,185,129,0.12)', color: '#34D399',
                                                fontSize: 12, fontWeight: 700,
                                            }}
                                        />
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{h.timestamp}</Typography>
                                            {h.confidence != null && (
                                                <Typography variant="caption" sx={{ color: '#818CF8' }}>
                                                    {(h.confidence * 100).toFixed(0)}% confidence
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </Box>
            ) : (
            /* Batch Prediction Tab */
            <Box>
                <Card sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} mb={1}>Batch Prediction</Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Upload a CSV file with the same columns as your training data. Each row will get a prediction.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                                {batchFile ? batchFile.name : 'Choose CSV'}
                                <input type="file" hidden accept=".csv" onChange={e => setBatchFile(e.target.files?.[0] || null)} />
                            </Button>
                            <Button
                                variant="contained"
                                disabled={!batchFile || batchLoading}
                                startIcon={batchLoading ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                                onClick={async () => {
                                    if (!batchFile || !id) return
                                    setBatchLoading(true); setError(null); setBatchResults([])
                                    try {
                                        const text = await batchFile.text()
                                        const lines = text.trim().split('\n')
                                        const headers = lines[0].split(',')
                                        const rows = lines.slice(1).map(line => {
                                            const vals = line.split(',')
                                            const obj: Record<string, any> = {}
                                            headers.forEach((h, i) => {
                                                const v = vals[i]?.trim()
                                                const num = Number(v)
                                                obj[h.trim()] = isNaN(num) || v === '' ? v : num
                                            })
                                            return obj
                                        })
                                        const results = []
                                        for (const row of rows) {
                                            try {
                                                const { data } = await api.post(`/inference/${id}/predict`, { inputs: row })
                                                results.push({ ...row, __prediction: data.prediction, __confidence: data.confidence })
                                            } catch {
                                                results.push({ ...row, __prediction: 'ERROR', __confidence: null })
                                            }
                                        }
                                        setBatchResults(results)
                                    } catch (e: any) {
                                        setError('Failed to parse CSV')
                                    }
                                    setBatchLoading(false)
                                }}
                            >
                                {batchLoading ? `Processing...` : 'Run Batch'}
                            </Button>
                        </Box>
                        {batchLoading && <LinearProgress sx={{ mt: 2 }} />}
                    </CardContent>
                </Card>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {batchResults.length > 0 && (
                    <Card>
                        <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={700}>{batchResults.length} Predictions</Typography>
                                <Button size="small" startIcon={<DownloadIcon />}
                                    onClick={() => {
                                        const keys = Object.keys(batchResults[0])
                                        const csv = [keys.join(','), ...batchResults.map(r => keys.map(k => r[k] ?? '').join(','))].join('\n')
                                        const blob = new Blob([csv], { type: 'text/csv' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a'); a.href = url; a.download = 'predictions.csv'; a.click()
                                    }}
                                >Download Results</Button>
                            </Box>
                            <TableContainer sx={{ maxHeight: 400 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {Object.keys(batchResults[0]).map(k => (
                                                <TableCell key={k} sx={{
                                                    fontWeight: 700, fontSize: 11,
                                                    background: k.startsWith('__') ? 'rgba(16,185,129,0.1)' : undefined,
                                                    color: k === '__prediction' ? '#10B981' : k === '__confidence' ? '#6366F1' : undefined,
                                                }}>
                                                    {k.replace('__', '')}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {batchResults.slice(0, 100).map((row, i) => (
                                            <TableRow key={i}>
                                                {Object.entries(row).map(([k, v]) => (
                                                    <TableCell key={k} sx={{
                                                        fontSize: 12,
                                                        fontWeight: k === '__prediction' ? 700 : 400,
                                                        color: k === '__prediction' ? '#10B981' : undefined,
                                                    }}>
                                                        {v != null ? String(v) : ''}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {batchResults.length > 100 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Showing first 100 of {batchResults.length} rows. Download for complete results.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                )}
            </Box>
            )}
        </Box>
    )
}
