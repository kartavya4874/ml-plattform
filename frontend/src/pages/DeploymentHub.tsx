import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box, Typography, Card, CardContent, Button, Alert,
    CircularProgress, IconButton, Tooltip, Chip
} from '@mui/material'
import {
    RocketLaunch, ContentCopy, CheckCircle, Refresh
} from '@mui/icons-material'
import { api } from '../api/client'

const CodeSnippet = ({ lang, code }: { lang: string; code: string }) => {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <Box sx={{ position: 'relative', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Chip label={lang} size="small" sx={{ fontSize: 11, height: 20 }} />
                <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton size="small" onClick={copy}>
                        {copied ? <CheckCircle fontSize="small" sx={{ color: '#10B981' }} /> : <ContentCopy fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={{
                background: '#060610', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2,
                p: 2, fontFamily: 'monospace', fontSize: 12, overflowX: 'auto',
                color: '#D1FAE5', whiteSpace: 'pre'
            }}>
                {code}
            </Box>
        </Box>
    )
}

export default function DeploymentHub() {
    const { id } = useParams<{ id: string }>()
    const [deployment, setDeployment] = useState<any>(null)
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [deploying, setDeploying] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [usage, setUsage] = useState<any>(null)

    const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8000'

    const handleDeploy = async () => {
        setDeploying(true)
        setError(null)
        try {
            const { data } = await api.post(`/deploy/${id}/api`)
            setDeployment(data)
            // Generate API key
            const keyRes = await api.post(`/deploy/${id}/keys`, null, { params: { name: 'Primary Key' } })
            setApiKey(keyRes.data.raw_key)
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Deployment failed')
        } finally {
            setDeploying(false)
        }
    }

    const fetchUsage = async () => {
        setLoading(true)
        try {
            const { data } = await api.get(`/deploy/${id}/api/usage`)
            setUsage(data)
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to fetch usage')
        } finally {
            setLoading(false)
        }
    }

    const endpointUrl = deployment ? `${BASE}${deployment.endpoint_url}` : `${BASE}/serve/your-slug/model-slug/predict`

    const pythonSnippet = `import requests

response = requests.post(
    "${endpointUrl}",
    headers={"X-API-Key": "${apiKey || 'your-api-key'}"},
    json={"inputs": {"feature1": 1.5, "feature2": "value"}}
)
result = response.json()
print(result["prediction"])`

    const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'your-api-key'}" \\
  -d '{"inputs": {"feature1": 1.5}}'`

    const jsSnippet = `const response = await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey || 'your-api-key'}"
  },
  body: JSON.stringify({ inputs: { feature1: 1.5 } })
});
const result = await response.json();
console.log(result.prediction);`

    return (
        <Box className="fade-in">
            <Box mb={3}>
                <Typography variant="h4" fontWeight={800}>Deployment Hub</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Deploy your model as a production REST API</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!deployment ? (
                <Card sx={{ textAlign: 'center', py: 6 }}>
                    <CardContent>
                        <Box sx={{
                            width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
                            background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <RocketLaunch sx={{ fontSize: 36, color: 'primary.main' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} mb={1}>Deploy Your Model</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
                            Generate a production-ready REST API endpoint with authentication and monitoring in one click.
                        </Typography>
                        <Button
                            id="deploy-btn"
                            variant="contained"
                            size="large"
                            onClick={handleDeploy}
                            disabled={deploying}
                            startIcon={deploying ? <CircularProgress size={18} color="inherit" /> : <RocketLaunch />}
                            sx={{ px: 4 }}
                        >
                            {deploying ? 'Deploying...' : '🚀 Deploy Model'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Status Card */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>Deployment Status</Typography>
                                <Chip label="LIVE" sx={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700 }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Endpoint:</Typography>
                                <Box sx={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 1, px: 1.5, py: 0.5, fontFamily: 'monospace', fontSize: 13 }}>
                                    {endpointUrl}
                                </Box>
                                <IconButton size="small" onClick={() => navigator.clipboard.writeText(endpointUrl)}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </Box>
                            {apiKey && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>API Key:</Typography>
                                    <Box sx={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 1, px: 1.5, py: 0.5, fontFamily: 'monospace', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {apiKey}
                                    </Box>
                                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(apiKey)}>
                                        <ContentCopy fontSize="small" />
                                    </IconButton>
                                    <Tooltip title="Save this key — it won't be shown again">
                                        <Box sx={{ color: '#F59E0B', fontSize: 12 }}>⚠️</Box>
                                    </Tooltip>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Usage Stats */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>Usage Stats</Typography>
                                <Button size="small" onClick={fetchUsage} startIcon={loading ? <CircularProgress size={14} /> : <Refresh />}>
                                    Refresh
                                </Button>
                            </Box>
                            {usage ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                                    {[
                                        { label: 'Total Requests', value: usage.total_requests },
                                        { label: 'Avg Latency', value: `${usage.avg_latency_ms}ms` },
                                        { label: 'Error Rate', value: `${(usage.error_rate * 100).toFixed(1)}%` },
                                        { label: 'P50 Latency', value: `${usage.p50_latency_ms}ms` },
                                        { label: 'P95 Latency', value: `${usage.p95_latency_ms}ms` },
                                        { label: 'Errors', value: usage.error_count },
                                    ].map(({ label, value }) => (
                                        <Box key={label} className="metric-card">
                                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: 10 }}>{label}</Typography>
                                            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Click Refresh to load stats</Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Code Snippets */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>Integration Examples</Typography>
                            <CodeSnippet lang="Python" code={pythonSnippet} />
                            <CodeSnippet lang="JavaScript" code={jsSnippet} />
                            <CodeSnippet lang="cURL" code={curlSnippet} />
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    )
}
