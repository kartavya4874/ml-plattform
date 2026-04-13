import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Grid, Chip, Button, CircularProgress,
    Tooltip, IconButton, Switch, FormControlLabel, TextField, Divider
} from '@mui/material'
import {
    Download as DownloadIcon, Science as TestIcon, RocketLaunch as DeployIcon,
    Lightbulb as ExplainIcon, ArrowUpward as PromoteIcon, Public as PublicIcon,
    Lock as PrivateIcon, ArrowBack, Edit as EditIcon, Save as SaveIcon
} from '@mui/icons-material'
import { api } from '../api/client'

interface FeatureImportance { feature: string; importance: number }

const MetricCard = ({ label, value, color = '#10B981' }: { label: string; value: string; color?: string }) => (
    <Box sx={{ p: 2, background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, display: 'block' }}>{label}</Typography>
        <Typography variant="h4" fontWeight={800} sx={{ color, mt: 0.5 }}>{value}</Typography>
    </Box>
)

export default function ModelDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [model, setModel] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')

    useEffect(() => {
        if (id) {
            api.get(`/models/${id}`).then(r => {
                setModel(r.data)
                setEditName(r.data.name)
                setEditDesc(r.data.description || '')
            }).catch(() => {}).finally(() => setLoading(false))
        }
    }, [id])

    const handleSave = async () => {
        await api.patch(`/models/${id}`, { name: editName, description: editDesc })
        setModel({ ...model, name: editName, description: editDesc })
        setEditing(false)
    }

    const toggleVisibility = async () => {
        const res = await api.patch(`/models/${id}`, { is_public: !model.is_public })
        setModel({ ...model, is_public: res.data.is_public })
    }

    const handleDownload = () => {
        const token = localStorage.getItem('access_token')
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
        window.open(`${baseUrl}/models/${id}/download?token=${token}`, '_blank')
    }

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
    if (!model) return <Typography>Model not found</Typography>

    const metrics = model.metrics || {}
    const featureImportance: FeatureImportance[] = metrics.feature_importance || []
    const confusionMatrix: number[][] = metrics.confusion_matrix || []
    const stageColor: Record<string, string> = { production: '#10B981', staging: '#6366F1', training: '#F59E0B', archived: '#6B7280' }

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconButton onClick={() => navigate('/models')} size="small"><ArrowBack /></IconButton>
                <Typography variant="caption" color="text.secondary">Back to Model Hub</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                    {editing ? (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                            <TextField value={editName} onChange={e => setEditName(e.target.value)} variant="standard"
                                sx={{ '& input': { fontSize: 28, fontWeight: 800 } }} />
                            <IconButton onClick={handleSave}><SaveIcon /></IconButton>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h4" fontWeight={800}>{model.name}</Typography>
                            <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
                        </Box>
                    )}
                    {editing ? (
                        <TextField value={editDesc} onChange={e => setEditDesc(e.target.value)} fullWidth multiline
                            placeholder="Add a description..." size="small" sx={{ mb: 1 }} />
                    ) : (
                        <Typography variant="body2" color="text.secondary">{model.description || 'No description'}</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip label={model.stage} size="small" sx={{ background: `${stageColor[model.stage]}15`, color: stageColor[model.stage], border: `1px solid ${stageColor[model.stage]}30`, fontWeight: 600 }} />
                        <Chip label={model.task_type?.replace('_', ' ')} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                        <Chip label={model.framework} size="small" variant="outlined" />
                        <Chip label={`v${model.version}`} size="small" variant="outlined" />
                        <Chip icon={model.is_public ? <PublicIcon sx={{ fontSize: 14 }} /> : <PrivateIcon sx={{ fontSize: 14 }} />}
                            label={model.is_public ? 'Public' : 'Private'} size="small" variant="outlined" onClick={toggleVisibility}
                            sx={{ cursor: 'pointer', color: model.is_public ? '#10B981' : '#6B7280' }} />
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownload}>Download .pkl</Button>
                    <Button variant="outlined" size="small" startIcon={<TestIcon />} onClick={() => navigate(`/test/${id}`)}>Test</Button>
                    <Button variant="outlined" size="small" startIcon={<ExplainIcon />} onClick={() => navigate(`/explain/${id}`)}>Explain</Button>
                    {model.stage !== 'production' && (
                        <Button variant="contained" size="small" startIcon={<DeployIcon />} onClick={() => navigate(`/deploy/${id}`)}>Deploy</Button>
                    )}
                </Box>
            </Box>

            {/* Key Metrics */}
            <Typography variant="h6" fontWeight={700} mb={2}>Performance Metrics</Typography>
            <Grid container spacing={2} mb={4}>
                {metrics.accuracy != null && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Accuracy" value={`${(metrics.accuracy * 100).toFixed(1)}%`} /></Grid>
                )}
                {metrics.f1_weighted != null && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="F1 Score" value={`${(metrics.f1_weighted * 100).toFixed(1)}%`} color="#6366F1" /></Grid>
                )}
                {metrics.roc_auc != null && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="ROC AUC" value={`${(metrics.roc_auc * 100).toFixed(1)}%`} color="#8B5CF6" /></Grid>
                )}
                {metrics.rmse != null && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="RMSE" value={metrics.rmse.toFixed(4)} color="#F59E0B" /></Grid>
                )}
                {metrics.r2 != null && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="R² Score" value={metrics.r2.toFixed(4)} color="#3B82F6" /></Grid>
                )}
                {metrics.best_model && (
                    <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Algorithm" value={metrics.best_model} color="#EC4899" /></Grid>
                )}
            </Grid>

            {/* Plain English Summary */}
            <Card sx={{ mb: 4, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} mb={1}>📊 What does this mean?</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {metrics.accuracy != null
                            ? `This model correctly predicts the outcome ${(metrics.accuracy * 100).toFixed(0)}% of the time. ${metrics.accuracy >= 0.9 ? 'This is excellent performance!' : metrics.accuracy >= 0.7 ? 'Good performance — consider tuning hyperparameters for improvement.' : 'Consider using more data or different features to improve accuracy.'}`
                            : metrics.r2 != null
                            ? `This model explains ${(metrics.r2 * 100).toFixed(0)}% of the variance in the data. ${metrics.r2 >= 0.8 ? 'Strong fit!' : metrics.r2 >= 0.5 ? 'Moderate fit — consider feature engineering.' : 'Weak fit — more features or different algorithms may help.'}`
                            : 'Metrics will appear after training completes.'
                        }
                    </Typography>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {/* Confusion Matrix */}
                {confusionMatrix.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} mb={2}>Confusion Matrix</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${confusionMatrix[0].length}, 1fr)`, gap: 0.5 }}>
                                    {confusionMatrix.flatMap((row, i) =>
                                        row.map((val, j) => {
                                            const maxVal = Math.max(...confusionMatrix.flat())
                                            const intensity = maxVal > 0 ? val / maxVal : 0
                                            const isDiagonal = i === j
                                            return (
                                                <Box key={`${i}-${j}`} sx={{
                                                    p: 2, textAlign: 'center', borderRadius: 1,
                                                    background: isDiagonal
                                                        ? `rgba(16,185,129,${0.1 + intensity * 0.5})`
                                                        : `rgba(239,68,68,${intensity * 0.3})`,
                                                    border: isDiagonal ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                                }}>
                                                    <Typography variant="h6" fontWeight={700} sx={{ color: isDiagonal ? '#10B981' : '#EF4444' }}>
                                                        {val}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                                                        {isDiagonal ? 'Correct' : 'Wrong'}
                                                    </Typography>
                                                </Box>
                                            )
                                        })
                                    )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                    Rows = Actual, Columns = Predicted • Green = correct predictions
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Feature Importance */}
                {featureImportance.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} mb={2}>Feature Importance</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {featureImportance.map((fi, i) => {
                                        const maxImp = featureImportance[0]?.importance || 1
                                        const pct = (fi.importance / maxImp) * 100
                                        return (
                                            <Box key={fi.feature}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={i < 3 ? 700 : 400} sx={{ fontSize: 12 }}>
                                                        {i + 1}. {fi.feature}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {(fi.importance * 100).toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <Box sx={{
                                                        height: '100%', borderRadius: 3, width: `${pct}%`,
                                                        background: i < 3
                                                            ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                                                            : 'rgba(99,102,241,0.3)',
                                                        transition: 'width 0.6s ease',
                                                    }} />
                                                </Box>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Training Config */}
            <Box mt={4}>
                <Typography variant="h6" fontWeight={700} mb={2}>Training Configuration</Typography>
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                            {[
                                { label: 'Task Type', value: model.task_type?.replace('_', ' ') },
                                { label: 'Framework', value: model.framework },
                                { label: 'Version', value: `v${model.version}` },
                                { label: 'Stage', value: model.stage },
                                { label: 'Created', value: new Date(model.created_at).toLocaleString() },
                                { label: 'Algorithm', value: metrics.best_model || 'N/A' },
                            ].map(item => (
                                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={item.label}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>{item.label}</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{item.value}</Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    )
}
