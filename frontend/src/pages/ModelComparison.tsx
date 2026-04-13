import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
    Box, Typography, Card, CardContent, Checkbox, Button, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer
} from '@mui/material'
import { Compare as CompareIcon } from '@mui/icons-material'
import { fetchModels } from '../store/modelsSlice'
import type { AppDispatch, RootState } from '../store/store'

const MetricBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <Box sx={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
        </Box>
        <Typography variant="caption" fontWeight={700} sx={{ minWidth: 50, textAlign: 'right', color }}>{typeof value === 'number' ? value.toFixed(4) : value}</Typography>
    </Box>
)

export default function ModelComparison() {
    const dispatch = useDispatch<AppDispatch>()
    const { models } = useSelector((s: RootState) => s.models)
    const [selected, setSelected] = useState<string[]>([])

    useEffect(() => { dispatch(fetchModels()) }, [dispatch])

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const selectedModels = models.filter(m => selected.includes(m.id))
    const allMetricKeys = [...new Set(selectedModels.flatMap(m => Object.keys(m.metrics || {}).filter(k => typeof m.metrics?.[k] === 'number')))]

    const stageColor: Record<string, string> = { production: '#10B981', staging: '#6366F1', training: '#F59E0B', archived: '#6B7280' }

    return (
        <Box className="fade-in">
            <Box mb={3}>
                <Typography variant="h4" fontWeight={800}>Model Comparison</Typography>
                <Typography variant="body2" color="text.secondary">Select models to compare their metrics side by side</Typography>
            </Box>

            {/* Model Selector */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Select Models ({selected.length} selected)</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {models.map(m => (
                            <Chip
                                key={m.id}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Checkbox checked={selected.includes(m.id)} size="small" sx={{ p: 0 }} />
                                        <span>{m.name}</span>
                                    </Box>
                                }
                                variant={selected.includes(m.id) ? 'filled' : 'outlined'}
                                onClick={() => toggle(m.id)}
                                sx={{
                                    cursor: 'pointer',
                                    background: selected.includes(m.id) ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    borderColor: selected.includes(m.id) ? '#6366F1' : 'rgba(255,255,255,0.1)',
                                }}
                            />
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {selected.length < 2 ? (
                <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <CompareIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" fontWeight={700}>Select at least 2 models to compare</Typography>
                    <Typography variant="body2" color="text.secondary">Click the model chips above to select</Typography>
                </CardContent></Card>
            ) : (
                <Box>
                    {/* Comparison Table */}
                    <Card>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, width: 160 }}>Property</TableCell>
                                        {selectedModels.map(m => (
                                            <TableCell key={m.id} sx={{ fontWeight: 700, textAlign: 'center' }}>{m.name}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* Static properties */}
                                    <TableRow>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Stage</TableCell>
                                        {selectedModels.map(m => (
                                            <TableCell key={m.id} align="center">
                                                <Chip label={m.stage} size="small" sx={{ background: `${stageColor[m.stage]}15`, color: stageColor[m.stage], fontWeight: 600 }} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Algorithm</TableCell>
                                        {selectedModels.map(m => (
                                            <TableCell key={m.id} align="center">
                                                <Typography variant="body2">{m.metrics?.best_model || 'N/A'}</Typography>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Task Type</TableCell>
                                        {selectedModels.map(m => (
                                            <TableCell key={m.id} align="center">
                                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{m.task_type?.replace('_', ' ')}</Typography>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Created</TableCell>
                                        {selectedModels.map(m => (
                                            <TableCell key={m.id} align="center">
                                                <Typography variant="caption">{new Date(m.created_at).toLocaleDateString()}</Typography>
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    {/* Metric rows with visual bars */}
                                    {allMetricKeys.map(key => {
                                        const values = selectedModels.map(m => m.metrics?.[key] ?? 0)
                                        const maxVal = Math.max(...values, 0.001)
                                        const bestIdx = values.indexOf(Math.max(...values))
                                        const isLowerBetter = key.toLowerCase().includes('rmse') || key.toLowerCase().includes('error')
                                        const actualBestIdx = isLowerBetter ? values.indexOf(Math.min(...values.filter(v => v > 0))) : bestIdx
                                        
                                        return (
                                            <TableRow key={key}>
                                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {key.replace('_', ' ')}
                                                </TableCell>
                                                {selectedModels.map((m, i) => (
                                                    <TableCell key={m.id} align="center" sx={{
                                                        background: i === actualBestIdx ? 'rgba(16,185,129,0.05)' : 'transparent'
                                                    }}>
                                                        <MetricBar value={m.metrics?.[key] ?? 0} max={maxVal} color={i === actualBestIdx ? '#10B981' : '#6366F1'} />
                                                        {i === actualBestIdx && (
                                                            <Typography variant="caption" sx={{ color: '#10B981', fontSize: 9, display: 'block' }}>★ BEST</Typography>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Box>
            )}
        </Box>
    )
}
