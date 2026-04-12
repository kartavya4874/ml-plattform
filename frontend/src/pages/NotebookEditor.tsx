import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box, Typography, Button, TextField, IconButton, Chip, Switch, FormControlLabel,
    Card, Drawer, Divider, List, ListItem, ListItemText, ListItemIcon, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, Alert
} from '@mui/material'
import {
    PlayArrow as RunIcon, Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
    Terminal as PkgIcon, InsertDriveFile as FileIcon, CloudUpload as UploadIcon,
    Storage as DataIcon, Close as CloseIcon, Download as DownloadIcon
} from '@mui/icons-material'
import { api } from '../api/client'

interface Cell { type: 'code' | 'markdown'; source: string; outputs: any[] }
interface NotebookData { id: string; title: string; description: string | null; is_public: boolean; cells: Cell[]; tags: string[] }
interface NbFile { filename: string; size_bytes: number }

const SIDEBAR_WIDTH = 260

export default function NotebookEditor() {
    const { id } = useParams<{ id: string }>()
    const [notebook, setNotebook] = useState<NotebookData | null>(null)
    const [saving, setSaving] = useState(false)
    const [running, setRunning] = useState<number | null>(null)

    // File manager
    const [files, setFiles] = useState<NbFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [fileContent, setFileContent] = useState('')
    const [newFileName, setNewFileName] = useState('')

    // Package installer
    const [pkgDialog, setPkgDialog] = useState(false)
    const [pkgInput, setPkgInput] = useState('')
    const [pkgInstalling, setPkgInstalling] = useState(false)
    const [pkgResult, setPkgResult] = useState<string | null>(null)

    // Dataset import
    const [dsDialog, setDsDialog] = useState(false)
    const [datasets, setDatasets] = useState<any[]>([])
    const [importing, setImporting] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            api.get(`/notebooks/${id}`).then(r => setNotebook(r.data)).catch(console.error)
            loadFiles()
        }
    }, [id])

    const loadFiles = () => {
        if (id) api.get(`/notebooks/${id}/files`).then(r => setFiles(r.data)).catch(() => {})
    }

    const updateCell = (index: number, source: string) => {
        if (!notebook) return
        const cells = [...notebook.cells]
        cells[index] = { ...cells[index], source }
        setNotebook({ ...notebook, cells })
    }

    const addCell = (type: 'code' | 'markdown') => {
        if (!notebook) return
        setNotebook({ ...notebook, cells: [...notebook.cells, { type, source: '', outputs: [] }] })
    }

    const deleteCell = (index: number) => {
        if (!notebook || notebook.cells.length <= 1) return
        setNotebook({ ...notebook, cells: notebook.cells.filter((_, i) => i !== index) })
    }

    const saveNotebook = async () => {
        if (!notebook) return
        setSaving(true)
        try {
            await api.put(`/notebooks/${notebook.id}`, { title: notebook.title, cells: notebook.cells, is_public: notebook.is_public, tags: notebook.tags })
        } catch (e) { console.error(e) }
        setSaving(false)
    }

    const runCell = async (index: number) => {
        if (!notebook) return
        setRunning(index)
        try {
            const res = await api.post(`/notebooks/${notebook.id}/execute`, { cell_index: index, source: notebook.cells[index].source })
            const cells = [...notebook.cells]
            cells[index] = { ...cells[index], outputs: res.data.outputs || [] }
            if (res.data.error) cells[index].outputs.push({ type: 'error', content: res.data.error })
            setNotebook({ ...notebook, cells })
        } catch (e) { console.error(e) }
        setRunning(null)
    }

    // ── File management ─────────────────────────────────────────────────────

    const createFile = async () => {
        if (!id || !newFileName.trim()) return
        await api.post(`/notebooks/${id}/files`, { filename: newFileName.trim(), content: '' })
        setNewFileName('')
        loadFiles()
    }

    const openFile = async (filename: string) => {
        if (!id) return
        const res = await api.get(`/notebooks/${id}/files/${filename}`)
        setActiveFile(filename)
        setFileContent(res.data.content)
    }

    const saveFile = async () => {
        if (!id || !activeFile) return
        await api.put(`/notebooks/${id}/files/${activeFile}`, { filename: activeFile, content: fileContent })
    }

    const deleteFile = async (filename: string) => {
        if (!id) return
        await api.delete(`/notebooks/${id}/files/${filename}`)
        if (activeFile === filename) { setActiveFile(null); setFileContent('') }
        loadFiles()
    }

    const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!id || !e.target.files?.[0]) return
        const formData = new FormData()
        formData.append('file', e.target.files[0])
        await api.post(`/notebooks/${id}/upload-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        loadFiles()
    }

    // ── Package management ──────────────────────────────────────────────────

    const installPackages = async () => {
        if (!id || !pkgInput.trim()) return
        setPkgInstalling(true)
        setPkgResult(null)
        try {
            const pkgs = pkgInput.split(/[\s,]+/).filter(Boolean)
            const res = await api.post(`/notebooks/${id}/install`, { packages: pkgs })
            setPkgResult(res.data.success ? `✅ Installed: ${pkgs.join(', ')}` : `❌ ${res.data.error}`)
            setPkgInput('')
        } catch (e: any) {
            setPkgResult(`❌ ${e.response?.data?.detail || 'Installation failed'}`)
        }
        setPkgInstalling(false)
    }

    // ── Dataset import ──────────────────────────────────────────────────────

    const openDatasetDialog = async () => {
        setDsDialog(true)
        try {
            const res = await api.get('/data/datasets')
            setDatasets(res.data)
        } catch { setDatasets([]) }
    }

    const importDataset = async (dsId: string) => {
        if (!id) return
        setImporting(dsId)
        try {
            await api.post(`/notebooks/${id}/import-dataset/${dsId}`)
            loadFiles()
            setDsDialog(false)
        } catch (e) { console.error(e) }
        setImporting(null)
    }

    if (!notebook) return <Typography>Loading...</Typography>

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
            {/* Left sidebar: File manager */}
            <Box sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #1a1a1a' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>FILES</Typography>
                </Box>

                <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                    {files.map(f => (
                        <ListItem key={f.filename} sx={{ cursor: 'pointer', background: activeFile === f.filename ? '#111' : 'transparent', '&:hover': { background: '#111' } }}
                            onClick={() => openFile(f.filename)}
                            secondaryAction={
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteFile(f.filename) }} sx={{ color: 'text.secondary' }}>
                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            }>
                            <ListItemIcon sx={{ minWidth: 28 }}><FileIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></ListItemIcon>
                            <ListItemText primary={f.filename} primaryTypographyProps={{ variant: 'body2', noWrap: true, fontSize: 12 }} />
                        </ListItem>
                    ))}
                    {files.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>No files yet</Typography>}
                </List>

                <Box sx={{ p: 1.5, borderTop: '1px solid #1a1a1a' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        <TextField size="small" placeholder="filename.py" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                            sx={{ flex: 1, '& input': { fontSize: 12, py: 0.5 } }}
                            onKeyDown={e => e.key === 'Enter' && createFile()} />
                        <IconButton size="small" onClick={createFile}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} component="label" sx={{ fontSize: 10, flex: 1 }}>
                            Upload <input type="file" hidden onChange={uploadFile} />
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<DataIcon sx={{ fontSize: 14 }} />} onClick={openDatasetDialog} sx={{ fontSize: 10, flex: 1 }}>
                            Import
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ p: 1.5, borderTop: '1px solid #1a1a1a' }}>
                    <Button size="small" fullWidth variant="outlined" startIcon={<PkgIcon sx={{ fontSize: 14 }} />} onClick={() => setPkgDialog(true)} sx={{ fontSize: 11 }}>
                        Install Packages
                    </Button>
                </Box>
            </Box>

            {/* Main area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top bar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #1a1a1a' }}>
                    <TextField value={notebook.title} onChange={e => setNotebook({ ...notebook, title: e.target.value })}
                        variant="standard" sx={{ '& input': { fontSize: 20, fontWeight: 800 }, flex: 1, mr: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        <FormControlLabel control={<Switch size="small" checked={notebook.is_public} onChange={e => setNotebook({ ...notebook, is_public: e.target.checked })} />}
                            label={<Typography variant="caption">Public</Typography>} />
                        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveNotebook} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                </Box>

                {/* Content area */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {activeFile ? (
                        /* File editor */
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Chip label={activeFile} icon={<FileIcon />} onDelete={() => { setActiveFile(null); setFileContent('') }} />
                                <Button size="small" variant="outlined" onClick={saveFile}>Save File</Button>
                            </Box>
                            <TextField fullWidth multiline minRows={15} maxRows={40} value={fileContent}
                                onChange={e => setFileContent(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 13, background: '#050505' },
                                }} />
                        </Box>
                    ) : (
                        /* Notebook cells */
                        <>
                            {notebook.cells.map((cell, i) => (
                                <Card key={i} sx={{ mb: 2, border: running === i ? '1px solid #6366F1' : '1px solid #222', transition: 'border-color 0.2s' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 0.5, borderBottom: '1px solid #1a1a1a', background: '#0D0D0D' }}>
                                        <Chip size="small" label={cell.type === 'code' ? 'Python' : 'Markdown'} sx={{ fontSize: 10 }} />
                                        <Box>
                                            {cell.type === 'code' && (
                                                <IconButton size="small" onClick={() => runCell(i)} disabled={running !== null} sx={{ color: '#10B981' }}>
                                                    <RunIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton size="small" onClick={() => deleteCell(i)} sx={{ color: 'text.secondary' }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    <TextField fullWidth multiline minRows={3} maxRows={20} value={cell.source}
                                        onChange={e => updateCell(i, e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 13, background: '#050505' },
                                            '& fieldset': { border: 'none' },
                                        }} />
                                    {cell.outputs.length > 0 && (
                                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #1a1a1a', background: '#080808', fontFamily: 'monospace', fontSize: 12 }}>
                                            {cell.outputs.map((out: any, j: number) => (
                                                <Box key={j} sx={{ color: out.type === 'error' ? '#EF4444' : out.type === 'stderr' ? '#F59E0B' : '#FAFAFA', whiteSpace: 'pre-wrap', mb: 0.5 }}>
                                                    {out.content}
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Card>
                            ))}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                                <Button size="small" variant="outlined" onClick={() => addCell('code')}>+ Code Cell</Button>
                                <Button size="small" variant="outlined" onClick={() => addCell('markdown')}>+ Markdown Cell</Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            {/* Package Install Dialog */}
            <Dialog open={pkgDialog} onClose={() => setPkgDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Install Python Packages</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Pre-installed: numpy, pandas, scikit-learn, matplotlib, seaborn, scipy, statsmodels, pillow, requests
                    </Typography>
                    <TextField fullWidth label="Package names (space or comma separated)" placeholder="e.g. xgboost lightgbm transformers"
                        value={pkgInput} onChange={e => setPkgInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && installPackages()}
                        disabled={pkgInstalling} />
                    {pkgInstalling && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}><CircularProgress size={16} /> <Typography variant="body2">Installing...</Typography></Box>}
                    {pkgResult && <Alert severity={pkgResult.startsWith('✅') ? 'success' : 'error'} sx={{ mt: 2 }}>{pkgResult}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPkgDialog(false)}>Close</Button>
                    <Button variant="contained" onClick={installPackages} disabled={pkgInstalling || !pkgInput.trim()}>Install</Button>
                </DialogActions>
            </Dialog>

            {/* Dataset Import Dialog */}
            <Dialog open={dsDialog} onClose={() => setDsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Import Dataset to Notebook</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Select a dataset to copy into this notebook's workspace. You can then load it with <code>pd.read_csv("filename.csv")</code>.
                    </Typography>
                    <List dense>
                        {datasets.map(ds => (
                            <ListItem key={ds.id} sx={{ border: '1px solid #222', borderRadius: 1, mb: 1 }}
                                secondaryAction={
                                    <Button size="small" variant="outlined" onClick={() => importDataset(ds.id)}
                                        disabled={importing === ds.id} startIcon={importing === ds.id ? <CircularProgress size={14} /> : <DownloadIcon />}>
                                        Import
                                    </Button>
                                }>
                                <ListItemIcon><DataIcon sx={{ color: 'primary.main' }} /></ListItemIcon>
                                <ListItemText primary={ds.name} secondary={`${ds.dataset_type} • ${(ds.file_size_bytes / 1024).toFixed(0)} KB`} />
                            </ListItem>
                        ))}
                        {datasets.length === 0 && <Typography color="text.secondary">No datasets found. Upload one first.</Typography>}
                    </List>
                </DialogContent>
                <DialogActions><Button onClick={() => setDsDialog(false)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    )
}
