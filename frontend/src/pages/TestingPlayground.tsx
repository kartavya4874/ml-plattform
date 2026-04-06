import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
    Alert, LinearProgress, Chip
} from '@mui/material'
import { PlayArrow, CloudUpload } from '@mui/icons-material'
import { api } from '../api/client'

export default function TestingPlayground() {
    const { id } = useParams<{ id: string }>()
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [text, setText] = useState('')
    const [imageB64, setImageB64] = useState<string | null>(null)
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const fileRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1]
            setImageB64(b64)
        }
        reader.readAsDataURL(file)
    }

    const handlePredict = async () => {
        setLoading(true)
        setError(null)
        try {
            const payload = imageB64
                ? { inputs: { image_b64: imageB64 } }
                : text
                    ? { inputs: { text } }
                    : { inputs }

            const { data } = await api.post(`/inference/${id}/predict`, payload)
            setResult(data)
            setHistory(h => [{ ...data, timestamp: new Date().toLocaleTimeString() }, ...h.slice(0, 9)])
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Prediction failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box className="fade-in">
            <Box mb={3}>
                <Typography variant="h4" fontWeight={800}>Testing Playground</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Run predictions against your model in real-time</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                {/* Input Panel */}
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} mb={2}>Input</Typography>

                        {/* Image Upload */}
                        <Box
                            sx={{ border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', mb: 2 }}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input type="file" ref={fileRef} accept="image/*" hidden onChange={handleImageUpload} />
                            {imageB64 ? (
                                <img src={`data:image/jpeg;base64,${imageB64}`} alt="preview" style={{ maxHeight: 200, borderRadius: 8 }} />
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="body2">Click to upload image (for image models)</Typography>
                                </>
                            )}
                        </Box>

                        {/* Text Input */}
                        <TextField
                            id="test-text-input"
                            label="Text input (for NLP models)"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            sx={{ mb: 2 }}
                        />

                        {/* Generic key-value inputs */}
                        <Typography variant="body2" fontWeight={600} mb={1} sx={{ color: 'text.secondary' }}>
                            Or enter tabular features (JSON):
                        </Typography>
                        <TextField
                            id="test-json-input"
                            label="Features JSON"
                            placeholder='{"feature1": 1.5, "feature2": "value"}'
                            fullWidth
                            multiline
                            rows={3}
                            onChange={(e) => {
                                try { setInputs(JSON.parse(e.target.value)) } catch { }
                            }}
                            sx={{ mb: 2 }}
                        />

                        <Button
                            id="test-predict-btn"
                            variant="contained"
                            fullWidth
                            onClick={handlePredict}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                            sx={{ py: 1.5 }}
                        >
                            {loading ? 'Running Prediction...' : 'Predict'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

                    {result && (
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} mb={2}>Prediction Result</Typography>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>PREDICTION</Typography>
                                    <Typography variant="h3" fontWeight={800} sx={{ color: '#10B981', mt: 0.5 }}>
                                        {String(result.prediction)}
                                    </Typography>
                                </Box>
                                {result.confidence != null && (
                                    <Box mb={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2">Confidence</Typography>
                                            <Typography variant="body2" fontWeight={600}>{(result.confidence * 100).toFixed(1)}%</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={result.confidence * 100} sx={{ height: 8, borderRadius: 4 }} />
                                    </Box>
                                )}
                                {result.class_probabilities && (
                                    <Box>
                                        <Typography variant="body2" fontWeight={600} mb={1}>Class Probabilities</Typography>
                                        {Object.entries(result.class_probabilities as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([cls, prob]) => (
                                            <Box key={cls} sx={{ mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                                    <Typography variant="caption">{cls}</Typography>
                                                    <Typography variant="caption">{(prob * 100).toFixed(1)}%</Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={prob * 100} sx={{ height: 4, borderRadius: 2 }} />
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                                    Latency: {result.latency_ms?.toFixed(1)}ms
                                </Typography>
                            </CardContent>
                        </Card>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <Card>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="body2" fontWeight={600} mb={1.5}>Recent Predictions</Typography>
                                {history.map((h, i) => (
                                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                        <Chip label={String(h.prediction)} size="small" sx={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', fontSize: 11 }} />
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{h.timestamp}</Typography>
                                            {h.confidence != null && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{(h.confidence * 100).toFixed(0)}% confidence</Typography>}
                                        </Box>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
