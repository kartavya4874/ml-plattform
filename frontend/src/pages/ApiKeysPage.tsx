import { useEffect, useState } from 'react'
import {
    Box, Typography, Card, CardContent, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, Alert, Tooltip,
    CircularProgress, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow,
} from '@mui/material'
import {
    VpnKey as KeyIcon,
    Add as AddIcon,
    ContentCopy,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    CheckCircle,
    Warning as WarningIcon,
} from '@mui/icons-material'
import { api } from '../api/client'

interface ApiKeyInfo {
    id: string
    name: string
    model_id: string
    model_name: string
    is_active: boolean
    key_prefix: string
    last_used_at: string | null
    created_at: string
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyInfo[]>([])
    const [models, setModels] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false)
    const [newKeyName, setNewKeyName] = useState('New Key')
    const [newKeyModelId, setNewKeyModelId] = useState('')
    const [creating, setCreating] = useState(false)

    // Newly created key (shown once)
    const [revealedKey, setRevealedKey] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<ApiKeyInfo | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchKeys = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/deploy/keys/all')
            setKeys(data)
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to load API keys')
        } finally {
            setLoading(false)
        }
    }

    const fetchModels = async () => {
        try {
            const { data } = await api.get('/models/')
            setModels(data.filter((m: any) => m.stage === 'staging' || m.stage === 'production'))
        } catch { /* ignore */ }
    }

    useEffect(() => {
        fetchKeys()
        fetchModels()
    }, [])

    const handleCreate = async () => {
        if (!newKeyModelId) return
        setCreating(true)
        try {
            const { data } = await api.post(`/deploy/${newKeyModelId}/keys`, null, {
                params: { name: newKeyName },
            })
            setRevealedKey(data.raw_key)
            setCreateOpen(false)
            setNewKeyName('New Key')
            setNewKeyModelId('')
            fetchKeys()
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to create key')
        } finally {
            setCreating(false)
        }
    }

    const handleRevoke = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await api.delete(`/deploy/${deleteTarget.model_id}/keys/${deleteTarget.id}`)
        } catch (e: any) {
            // 204 may throw in some axios configs — ignore if status is 2xx
            if (e.response && e.response.status >= 200 && e.response.status < 300) {
                // Success — no-content is expected
            } else {
                setError(e.response?.data?.detail || 'Failed to revoke key')
            }
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
            fetchKeys()
        }
    }

    const handleRegenerate = async (key: ApiKeyInfo) => {
        try {
            const { data } = await api.post(`/deploy/keys/${key.id}/regenerate`)
            setRevealedKey(data.raw_key)
            fetchKeys()
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed to regenerate key')
        }
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const maskKey = (prefix: string) => {
        if (!prefix || prefix.length < 8) return 'sk-••••••••••••'
        return `${prefix.substring(0, 7)}••••••••${prefix.slice(-4)}`
    }

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>API Keys</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Manage authentication keys for your deployed model APIs
                    </Typography>
                </Box>
                <Button
                    id="create-api-key"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    disabled={models.length === 0}
                >
                    Create Key
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Revealed key banner */}
            {revealedKey && (
                <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(245,158,11,0.3)' }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            startIcon={copied ? <CheckCircle /> : <ContentCopy />}
                            onClick={() => handleCopy(revealedKey)}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    }
                    onClose={() => setRevealedKey(null)}
                >
                    <Typography variant="body2" fontWeight={700} mb={0.5}>
                        Save your API key now — it won't be shown again
                    </Typography>
                    <Box sx={{
                        fontFamily: 'monospace', fontSize: 13, mt: 0.5,
                        background: 'rgba(0,0,0,0.2)', px: 1.5, py: 0.5, borderRadius: 1,
                        wordBreak: 'break-all',
                    }}>
                        {revealedKey}
                    </Box>
                </Alert>
            )}

            {/* Keys table */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : keys.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 8 }}>
                    <CardContent>
                        <Box sx={{
                            width: 72, height: 72, borderRadius: '20px', mx: 'auto', mb: 2,
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <KeyIcon sx={{ fontSize: 32, color: '#6366F1' }} />
                        </Box>
                        <Typography variant="h6" fontWeight={700} mb={1}>No API Keys Yet</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
                            Deploy a model first, then create API keys to authenticate your API requests.
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} disabled={models.length === 0}>
                            Create Your First Key
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>NAME</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>KEY</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>MODEL</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>STATUS</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>CREATED</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }}>LAST USED</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: 0.5 }} align="right">ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {keys.map((k) => (
                                    <TableRow key={k.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{k.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                                                {maskKey(k.key_prefix)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={k.model_name} size="small" sx={{ fontSize: 11 }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={k.is_active ? 'Active' : 'Revoked'}
                                                size="small"
                                                sx={{
                                                    background: k.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                    color: k.is_active ? '#10B981' : '#EF4444',
                                                    border: `1px solid ${k.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                    fontWeight: 600, fontSize: 11,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(k.created_at).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {k.is_active && (
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                    <Tooltip title="Regenerate">
                                                        <IconButton size="small" onClick={() => handleRegenerate(k)}>
                                                            <RefreshIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Revoke">
                                                        <IconButton size="small" onClick={() => setDeleteTarget(k)} sx={{ color: '#EF4444' }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            {/* Create Key Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Create API Key</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                    <TextField
                        label="Key Name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        fullWidth
                        size="small"
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Model</InputLabel>
                        <Select
                            value={newKeyModelId}
                            label="Model"
                            onChange={(e) => setNewKeyModelId(e.target.value as string)}
                        >
                            {models.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.name} ({m.stage})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating || !newKeyModelId}
                        startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
                    >
                        {creating ? 'Creating...' : 'Create Key'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Revoke Confirm Dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Revoke API Key</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Are you sure you want to revoke <strong>{deleteTarget?.name}</strong>?
                        Any applications using this key will immediately lose access.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleRevoke}
                        disabled={deleting}
                        sx={{ background: '#EF4444', '&:hover': { background: '#DC2626' } }}
                    >
                        {deleting ? 'Revoking...' : 'Revoke Key'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
