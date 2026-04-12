import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    Box, Grid, Typography, Card, CardContent, Chip, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, IconButton, Tooltip
} from '@mui/material'
import {
    TableChart, Image as ImgIcon, TextFields, Rocket as RocketIcon,
    Science as TestIcon, Lightbulb as ExplainIcon, Delete as DeleteIcon,
    TrendingUp, ArrowUpward, Public as PublicIcon, Lock as PrivateIcon
} from '@mui/icons-material'
import { fetchModels, promoteModel, deleteModel } from '../store/modelsSlice'
import { api } from '../api/client'
import type { AppDispatch, RootState } from '../store/store'

const stageColors: Record<string, string> = {
    production: '#10B981', staging: '#6366F1', training: '#F59E0B', archived: '#6B7280'
}
const taskIcons: Record<string, React.ReactNode> = {
    classification: <TableChart fontSize="small" />,
    regression: <TableChart fontSize="small" />,
    image_classification: <ImgIcon fontSize="small" />,
    text_classification: <TextFields fontSize="small" />,
    sentiment: <TextFields fontSize="small" />,
}

export default function ModelHub() {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { models, loading } = useSelector((s: RootState) => s.models)
    const [search, setSearch] = useState('')
    const [filterStage, setFilterStage] = useState('')

    useEffect(() => { dispatch(fetchModels()) }, [dispatch])

    const filtered = models.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.task_type.includes(search.toLowerCase())
        const matchStage = !filterStage || m.stage === filterStage
        return matchSearch && matchStage
    })

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Model Hub</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        All your trained models in one place
                    </Typography>
                </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    id="model-search"
                    placeholder="Search models..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Stage</InputLabel>
                    <Select value={filterStage} label="Stage" onChange={(e) => setFilterStage(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="staging">Staging</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                        <MenuItem value="archived">Archived</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TrendingUp sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                        {models.length === 0 ? 'No models yet' : 'No models matching filters'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {models.length === 0 ? 'Train your first model in the Training Studio' : 'Try adjusting your filters'}
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {filtered.map((model) => {
                        const topMetric = model.metrics
                            ? Object.entries(model.metrics).find(([k]) => ['accuracy', 'f1_weighted', 'r2'].includes(k))
                            : null

                        return (
                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={model.id}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ p: 3, flex: 1 }}>
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.light' }}>
                                                {taskIcons[model.task_type]}
                                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                                                    {model.task_type.replace('_', ' ')}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={model.stage}
                                                size="small"
                                                sx={{
                                                    background: `${stageColors[model.stage]}15`,
                                                    color: stageColors[model.stage],
                                                    border: `1px solid ${stageColors[model.stage]}30`,
                                                    fontSize: 11,
                                                }}
                                            />
                                        </Box>

                                        <Typography variant="h6" fontWeight={700} mb={0.5} noWrap>{model.name}</Typography>
                                        <Chip
                                            icon={model.is_public ? <PublicIcon sx={{ fontSize: 14 }} /> : <PrivateIcon sx={{ fontSize: 14 }} />}
                                            label={model.is_public ? 'Public' : 'Private'}
                                            size="small"
                                            variant="outlined"
                                            onClick={async () => {
                                                await api.patch(`/models/${model.id}`, { is_public: !model.is_public })
                                                dispatch(fetchModels())
                                            }}
                                            sx={{ cursor: 'pointer', mb: 1, color: model.is_public ? '#10B981' : '#6B7280', borderColor: model.is_public ? '#10B98130' : '#6B728030' }}
                                        />

                                        {/* Top Metric */}
                                        {topMetric && (
                                            <Box sx={{ mb: 2, p: 1.5, background: 'rgba(16,185,129,0.08)', borderRadius: 2, border: '1px solid rgba(16,185,129,0.15)' }}>
                                                <Typography variant="caption" sx={{ color: '#6B7280', textTransform: 'uppercase', fontSize: 10 }}>
                                                    {topMetric[0]}
                                                </Typography>
                                                <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                                    {typeof topMetric[1] === 'number' ? `${(topMetric[1] * 100).toFixed(1)}%` : String(topMetric[1])}
                                                </Typography>
                                            </Box>
                                        )}

                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            v{model.version} · {model.framework} · {new Date(model.created_at).toLocaleDateString()}
                                        </Typography>
                                    </CardContent>

                                    {/* Actions */}
                                    <Box sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<TestIcon fontSize="small" />}
                                            onClick={() => navigate(`/test/${model.id}`)}
                                            sx={{ flex: 1, minWidth: 80 }}
                                        >
                                            Test
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<ExplainIcon fontSize="small" />}
                                            onClick={() => navigate(`/explain/${model.id}`)}
                                            sx={{ flex: 1, minWidth: 80 }}
                                        >
                                            Explain
                                        </Button>
                                        {model.stage === 'staging' && (
                                            <Tooltip title="Promote to Production">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<ArrowUpward fontSize="small" />}
                                                    onClick={() => dispatch(promoteModel(model.id))}
                                                    sx={{ flex: 1, minWidth: 80, background: 'linear-gradient(135deg, #10B981, #059669)' }}
                                                >
                                                    Promote
                                                </Button>
                                            </Tooltip>
                                        )}
                                        {model.stage === 'production' && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<RocketIcon fontSize="small" />}
                                                onClick={() => navigate(`/deploy/${model.id}`)}
                                                sx={{ flex: 1, minWidth: 80 }}
                                            >
                                                Deploy
                                            </Button>
                                        )}
                                        <Tooltip title="Delete model">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'error.main' }}
                                                onClick={() => dispatch(deleteModel(model.id))}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        )
                    })}
                </Grid>
            )}
        </Box>
    )
}
