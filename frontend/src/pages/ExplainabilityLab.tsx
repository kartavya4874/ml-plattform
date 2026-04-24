import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Button, TextField, Alert,
    CircularProgress, Tabs, Tab
} from '@mui/material'
import { BarChart as BarIcon, Image as ImgIcon, TextFields } from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'

export default function ExplainabilityLab() {
    const { id } = useParams<{ id: string }>()
    const [tab, setTab] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [globalShap, setGlobalShap] = useState<any>(null)
    const [localShap, setLocalShap] = useState<any>(null)
    const [gradcamResult, setGradcamResult] = useState<any>(null)
    const [tokenResult, setTokenResult] = useState<any>(null)
    const [localInputJson, setLocalInputJson] = useState('')
    const [text, setText] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const [sampleSize] = useState(50)

    const fetchGlobalShap = async () => {
        setLoading(true); setError(null)
        try {
            const { data } = await api.post(`/explain/${id}/shap`, { sample_size: sampleSize })
            setGlobalShap(data)
        } catch (e: any) { setError(e.response?.data?.detail || 'SHAP failed') }
        finally { setLoading(false) }
    }

    const fetchLocalShap = async () => {
        setLoading(true); setError(null)
        try {
            const inputs = JSON.parse(localInputJson)
            const { data } = await api.post(`/explain/${id}/shap/local`, { inputs })
            setLocalShap(data)
        } catch (e: any) { setError(e.response?.data?.detail || 'Local SHAP failed') }
        finally { setLoading(false) }
    }

    const fetchGradcam = async (file: File) => {
        setLoading(true); setError(null)
        try {
            const formData = new FormData(); formData.append('file', file)
            const { data } = await api.post(`/explain/${id}/gradcam`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            setGradcamResult(data)
        } catch (e: any) { setError(e.response?.data?.detail || 'Grad-CAM failed') }
        finally { setLoading(false) }
    }

    const fetchTokenImportance = async () => {
        setLoading(true); setError(null)
        try {
            const { data } = await api.post(`/explain/${id}/token-importance`, { inputs: { text } })
            setTokenResult(data)
        } catch (e: any) { setError(e.response?.data?.detail || 'Token importance failed') }
        finally { setLoading(false) }
    }

    // Color for SHAP bars
    const colors = ['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD', '#10B981', '#34D399', '#F59E0B', '#FBBF24']

    return (
        <Box className="fade-in">
            <Box mb={3}>
                <Typography variant="h4" fontWeight={800}>Explainability Lab</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Understand how your model makes decisions</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}>
                <Tab icon={<BarIcon />} label="SHAP Global" iconPosition="start" />
                <Tab icon={<BarIcon />} label="SHAP Local" iconPosition="start" />
                <Tab icon={<ImgIcon />} label="Grad-CAM" iconPosition="start" />
                <Tab icon={<TextFields />} label="Token Importance" iconPosition="start" />
            </Tabs>

            {/* SHAP Global */}
            {tab === 0 && (
                <Box>
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>Global Feature Importance</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                                Shows which features have the most impact on the model's predictions on average.
                            </Typography>
                            <Button
                                id="shap-global-btn"
                                variant="contained"
                                onClick={fetchGlobalShap}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <BarIcon />}
                            >
                                Compute SHAP Values
                            </Button>
                        </CardContent>
                    </Card>

                    {globalShap && (
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="body2" fontWeight={600} mb={2}>Feature Importance (Mean |SHAP|)</Typography>
                                <ResponsiveContainer width="100%" height={Math.max(300, globalShap.feature_names.length * 30)} minWidth={1}>
                                    <BarChart
                                        layout="vertical"
                                        data={globalShap.feature_names.map((f: string, i: number) => ({ name: f, value: globalShap.mean_abs_shap[i] }))}
                                        margin={{ left: 100 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={95} />
                                        <Tooltip contentStyle={{ background: '#111117', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {globalShap.feature_names.map((_: string, i: number) => (
                                                <Cell key={i} fill={colors[i % colors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            {/* SHAP Local */}
            {tab === 1 && (
                <Box>
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>Per-Instance Explanation</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                                Explain a single prediction — see which features pushed the result up or down.
                            </Typography>
                            <TextField
                                id="shap-local-input"
                                label='Input features (JSON)'
                                placeholder='{"feature1": 1.5, "feature2": "value"}'
                                value={localInputJson}
                                onChange={(e) => setLocalInputJson(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                onClick={fetchLocalShap}
                                disabled={loading || !localInputJson}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <BarIcon />}
                            >
                                Explain This Prediction
                            </Button>
                        </CardContent>
                    </Card>

                    {localShap && (
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>PREDICTION</Typography>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>{localShap.prediction}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Base value: {localShap.base_value?.toFixed(4)}</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={600} mb={1}>SHAP Waterfall</Typography>
                                <ResponsiveContainer width="100%" height={Math.max(250, localShap.feature_names.length * 28)} minWidth={1}>
                                    <BarChart
                                        layout="vertical"
                                        data={localShap.feature_names.map((f: string, i: number) => ({
                                            name: f, value: localShap.shap_values[i]
                                        })).sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 15)}
                                        margin={{ left: 100 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={95} />
                                        <Tooltip contentStyle={{ background: '#111117', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {localShap.shap_values.map((_: number, i: number) => (
                                                <Cell key={i} fill={localShap.shap_values[i] >= 0 ? '#10B981' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            {/* Grad-CAM */}
            {tab === 2 && (
                <Box>
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>Grad-CAM Heatmap</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                                Visualize which regions of the image the model focused on when making a prediction.
                            </Typography>
                            <input type="file" ref={fileRef} accept="image/*" hidden onChange={(e) => e.target.files?.[0] && fetchGradcam(e.target.files[0])} />
                            <Button
                                id="gradcam-upload-btn"
                                variant="contained"
                                onClick={() => fileRef.current?.click()}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ImgIcon />}
                            >
                                Upload Image for Grad-CAM
                            </Button>
                        </CardContent>
                    </Card>

                    {gradcamResult && (
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={600} mb={1}>Heatmap Overlay</Typography>
                                        <img
                                            src={`data:image/png;base64,${gradcamResult.heatmap_b64}`}
                                            alt="Grad-CAM"
                                            style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                    </Box>
                                    <Box sx={{ minWidth: 200 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>PREDICTION</Typography>
                                        <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981', mb: 1 }}>{gradcamResult.prediction}</Typography>
                                        <Typography variant="body2" fontWeight={600} mb={1}>Confidence</Typography>
                                        <Typography variant="h5">{(gradcamResult.confidence * 100).toFixed(1)}%</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            {/* Token Importance */}
            {tab === 3 && (
                <Box>
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>Token Importance</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                                See which words/tokens the model focused on when making its prediction.
                            </Typography>
                            <TextField
                                id="token-text-input"
                                label="Input text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                onClick={fetchTokenImportance}
                                disabled={loading || !text}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <TextFields />}
                            >
                                Analyze Tokens
                            </Button>
                        </CardContent>
                    </Card>

                    {tokenResult && (
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>PREDICTION</Typography>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>{tokenResult.prediction}</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={600} mb={2}>Token Importance Heatmap</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {tokenResult.tokens.map((token: string, i: number) => {
                                        const imp = tokenResult.importances[i]
                                        const maxImp = Math.max(...tokenResult.importances)
                                        const opacity = imp / maxImp
                                        return (
                                            <Box
                                                key={i}
                                                sx={{
                                                    px: 1.5, py: 0.5, borderRadius: 1,
                                                    background: `rgba(99,102,241,${opacity.toFixed(2)})`,
                                                    border: `1px solid rgba(99,102,241,${(opacity * 0.5).toFixed(2)})`,
                                                    fontFamily: 'monospace',
                                                    fontSize: 14,
                                                    cursor: 'default',
                                                    transition: 'transform 0.1s',
                                                    '&:hover': { transform: 'scale(1.05)' }
                                                }}
                                                title={`Importance: ${imp.toFixed(4)}`}
                                            >
                                                {token}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}
        </Box>
    )
}
