import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box, Typography, Button, TextField, IconButton, Chip, Switch, FormControlLabel,
    Card, Drawer, Divider, List, ListItem, ListItemText, ListItemIcon, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, Tooltip
} from '@mui/material'
import {
    PlayArrow as RunIcon, Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
    Terminal as PkgIcon, InsertDriveFile as FileIcon, CloudUpload as UploadIcon,
    Storage as DataIcon, Close as CloseIcon, Download as DownloadIcon,
    UploadFile as ImportIcon, AutoAwesome as AIIcon, Memory as GpuIcon,
} from '@mui/icons-material'
import { api } from '../api/client'
import CodeMirrorCell from '../components/CodeMirrorCell'
import NotebookAIPanel from '../components/NotebookAIPanel'

interface Cell { type: 'code' | 'markdown'; source: string; outputs: any[] }
interface RuntimeConfig { gpu_enabled: boolean; gpu_type?: string }
interface NotebookData { id: string; title: string; description: string | null; is_public: boolean; cells: Cell[]; tags: string[]; runtime_config?: RuntimeConfig }
interface NbFile { filename: string; size_bytes: number }

const SIDEBAR_WIDTH = 260

// Allowed extensions for new file creation
const ALLOWED_NEW_FILE_EXTENSIONS = [
    '.py', '.csv', '.txt', '.json', '.md', '.yaml', '.yml', '.toml',
    '.tsv', '.xml', '.html', '.css', '.js', '.sh', '.sql', '.r',
]

export default function NotebookEditor() {
    const { id } = useParams<{ id: string }>()
    const [notebook, setNotebook] = useState<NotebookData | null>(null)
    const [saving, setSaving] = useState(false)
    const [running, setRunning] = useState<number | null>(null)
    const [exportError, setExportError] = useState<string | null>(null)
    const [focusedCell, setFocusedCell] = useState<number>(0)

    // AI Panel
    const [aiPanelOpen, setAiPanelOpen] = useState(false)

    // File manager
    const [files, setFiles] = useState<NbFile[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [fileContent, setFileContent] = useState('')
    const [newFileName, setNewFileName] = useState('')
    const [fileCreateError, setFileCreateError] = useState<string | null>(null)

    // Package installer
    const [pkgDialog, setPkgDialog] = useState(false)
    const [pkgInput, setPkgInput] = useState('')
    const [pkgInstalling, setPkgInstalling] = useState(false)
    const [pkgResult, setPkgResult] = useState<string | null>(null)

    // Import Dialog
    const [importDialog, setImportDialog] = useState(false)
    const [importTab, setImportTab] = useState(0)
    const [datasets, setDatasets] = useState<any[]>([])
    const [publicDatasets, setPublicDatasets] = useState<any[]>([])
    const [publicModels, setPublicModels] = useState<any[]>([])
    const [importing, setImporting] = useState<string | null>(null)

    // ipynb import
    const ipynbInputRef = useRef<HTMLInputElement>(null)
    const [ipynbImporting, setIpynbImporting] = useState(false)
    const [ipynbResult, setIpynbResult] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            api.get(`/notebooks/${id}`).then(r => setNotebook(r.data)).catch(console.error)
            loadFiles()
        }
    }, [id])

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (activeFile) saveFile()
                else saveNotebook()
            }
            // Ctrl+I to toggle AI panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault()
                setAiPanelOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [notebook, activeFile, fileContent])

    // Auto-save on 1 minute idle
    useEffect(() => {
        if (!notebook) return
        const timer = setTimeout(() => {
            saveNotebook()
        }, 60000)
        return () => clearTimeout(timer)
    }, [notebook])

    const loadFiles = () => {
        if (id) api.get(`/notebooks/${id}/files`).then(r => setFiles(r.data)).catch(() => {})
    }

    const updateCell = (index: number, source: string) => {
        setNotebook(prev => {
            if (!prev) return prev;
            const cells = [...prev.cells]
            cells[index] = { ...cells[index], source }
            return { ...prev, cells }
        })
    }

    const addCell = (type: 'code' | 'markdown', insertAfterIndex?: number) => {
        setNotebook(prev => {
            if (!prev) return prev;
            const newCell: Cell = { type, source: '', outputs: [] }
            const newCells = [...prev.cells]
            if (insertAfterIndex !== undefined) {
                newCells.splice(insertAfterIndex + 1, 0, newCell)
            } else {
                newCells.push(newCell)
            }
            return { ...prev, cells: newCells }
        })
    }

    const deleteCell = (index: number) => {
        setNotebook(prev => {
            if (!prev || prev.cells.length <= 1) return prev;
            return { ...prev, cells: prev.cells.filter((_, i) => i !== index) }
        })
    }

    const saveNotebook = async () => {
        if (!notebook) return
        setSaving(true)
        try {
            await api.put(`/notebooks/${notebook.id}`, { title: notebook.title, cells: notebook.cells, is_public: notebook.is_public, tags: notebook.tags, runtime_config: notebook.runtime_config })
        } catch (e) { console.error(e) }
        setSaving(false)
    }

    const runCell = async (index: number) => {
        if (!notebook) return
        setRunning(index)
        try {
            const res = await api.post(`/notebooks/${notebook.id}/execute`, { cell_index: index, source: notebook.cells[index].source })
            setNotebook(prev => {
                if (!prev) return prev;
                const cells = [...prev.cells]
                cells[index] = { ...cells[index], outputs: res.data.outputs || [] }
                if (res.data.error) cells[index].outputs.push({ type: 'error', content: res.data.error })
                return { ...prev, cells }
            })
        } catch (e) { console.error(e) }
        setRunning(null)
    }

    const runAndAdvance = async (index: number) => {
        await runCell(index)
        if (notebook && index === notebook.cells.length - 1) {
            addCell('code')
        }
        setTimeout(() => {
            const nextEl = document.querySelector(`[data-cell-index="${index + 1}"]`)
            if (nextEl) (nextEl as HTMLElement).focus()
        }, 100)
    }

    const exportToIpynb = async () => {
        if (!notebook) return
        setExportError(null)
        try {
            const res = await api.get(`/notebooks/${notebook.id}/export`, {
                responseType: 'blob',
            })
            // Create a download link from the blob
            const blob = new Blob([res.data], { type: 'application/x-ipynb+json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            // Get filename from Content-Disposition header or fallback
            const disposition = res.headers['content-disposition']
            let filename = `${notebook.title}.ipynb`
            if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/)
                if (match) filename = match[1]
            }
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (e: any) {
            console.error('Export failed:', e)
            setExportError(e.response?.data?.detail || 'Export failed. Please try again.')
        }
    }

    // ── ipynb import ────────────────────────────────────────────────────────

    const handleImportIpynb = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!id || !e.target.files?.[0]) return
        const file = e.target.files[0]
        if (!file.name.toLowerCase().endsWith('.ipynb')) {
            setIpynbResult('❌ Only .ipynb files are supported')
            return
        }
        setIpynbImporting(true)
        setIpynbResult(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await api.post(`/notebooks/${id}/import-ipynb`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setNotebook(res.data)
            setIpynbResult(`✅ Imported ${file.name} — ${res.data.cells?.length || 0} cells loaded`)
        } catch (e: any) {
            setIpynbResult(`❌ ${e.response?.data?.detail || 'Import failed'}`)
        }
        setIpynbImporting(false)
        // Reset file input
        if (ipynbInputRef.current) ipynbInputRef.current.value = ''
    }

    // ── File management ─────────────────────────────────────────────────────

    const createFile = async () => {
        if (!id || !newFileName.trim()) return
        setFileCreateError(null)

        const filename = newFileName.trim()
        // Validate extension
        const ext = filename.includes('.') ? '.' + filename.split('.').pop()!.toLowerCase() : ''
        if (!ext) {
            setFileCreateError('Filename must include an extension (e.g., script.py)')
            return
        }
        if (!ALLOWED_NEW_FILE_EXTENSIONS.includes(ext)) {
            setFileCreateError(`Unsupported extension '${ext}'. Try: ${ALLOWED_NEW_FILE_EXTENSIONS.join(', ')}`)
            return
        }
        // Prevent path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            setFileCreateError('Invalid filename')
            return
        }

        try {
            await api.post(`/notebooks/${id}/files`, { filename, content: '' })
            setNewFileName('')
            setFileCreateError(null)
            loadFiles()
        } catch (e: any) {
            setFileCreateError(e.response?.data?.detail || 'Failed to create file')
        }
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
        try {
            await api.post(`/notebooks/${id}/upload-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            loadFiles()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Upload failed')
        }
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

    // ── Dataset/Model import ────────────────────────────────────────────────

    const openImportDialog = async () => {
        setImportDialog(true)
        try {
            const [dsRes, comRes] = await Promise.all([
                api.get('/data/datasets'),
                api.get('/community/search')
            ])
            setDatasets(dsRes.data)
            setPublicDatasets(comRes.data.datasets || [])
            setPublicModels(comRes.data.models || [])
        } catch {
            setDatasets([])
            setPublicDatasets([])
            setPublicModels([])
        }
    }

    const importDataset = async (dsId: string) => {
        if (!id) return
        setImporting(dsId)
        try {
            await api.post(`/notebooks/${id}/import-dataset/${dsId}`)
            loadFiles()
            setImportDialog(false)
        } catch (e: any) { alert(e.response?.data?.detail || 'Import failed') }
        setImporting(null)
    }

    const importModel = async (modelId: string) => {
        if (!id) return
        setImporting(modelId)
        try {
            await api.post(`/notebooks/${id}/import-model/${modelId}`)
            loadFiles()
            setImportDialog(false)
        } catch (e: any) { alert(e.response?.data?.detail || 'Import failed') }
        setImporting(null)
    }

    // ── AI Insert Code handler ──────────────────────────────────────────────

    const handleInsertCode = (code: string) => {
        if (!notebook) return
        const idx = focusedCell
        const currentSource = notebook.cells[idx]?.source || ''
        updateCell(idx, currentSource ? currentSource + '\n' + code : code)
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
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                        <TextField size="small" placeholder="filename.py" value={newFileName} onChange={e => { setNewFileName(e.target.value); setFileCreateError(null) }}
                            sx={{ flex: 1, '& input': { fontSize: 12, py: 0.5 } }}
                            onKeyDown={e => e.key === 'Enter' && createFile()} />
                        <IconButton size="small" onClick={createFile}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    {fileCreateError && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5, fontSize: 10, lineHeight: 1.3 }}>
                            {fileCreateError}
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} component="label" sx={{ fontSize: 10, flex: 1 }}>
                            Upload <input type="file" hidden onChange={uploadFile} />
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<DataIcon sx={{ fontSize: 14 }} />} onClick={openImportDialog} sx={{ fontSize: 10, flex: 1 }}>
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
                        <Tooltip title="AI Code Assistant (Ctrl+I)">
                            <Button
                                variant={aiPanelOpen ? "contained" : "outlined"}
                                size="small"
                                startIcon={<AIIcon />}
                                onClick={() => setAiPanelOpen(!aiPanelOpen)}
                                sx={{
                                    borderColor: '#6366F140',
                                    color: aiPanelOpen ? '#fff' : '#818CF8',
                                    background: aiPanelOpen ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                                    '&:hover': { background: aiPanelOpen ? 'linear-gradient(135deg, #5558E6, #7C4FE0)' : '#6366F110' },
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                AI Assist
                            </Button>
                        </Tooltip>
                        <Button variant="outlined" size="small" startIcon={<ImportIcon />} component="label"
                            disabled={ipynbImporting}>
                            {ipynbImporting ? 'Importing...' : '.ipynb'}
                            <input type="file" accept=".ipynb" hidden onChange={handleImportIpynb} ref={ipynbInputRef} />
                        </Button>
                        <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 1, p: 0.5 }}>
                            <Tooltip title="Toggle GPU">
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setNotebook({
                                            ...notebook,
                                            runtime_config: {
                                                gpu_enabled: !notebook.runtime_config?.gpu_enabled,
                                                gpu_type: notebook.runtime_config?.gpu_type || 'T4'
                                            }
                                        })
                                    }}
                                    sx={{ color: notebook.runtime_config?.gpu_enabled ? '#10B981' : 'text.secondary' }}
                                >
                                    <GpuIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {notebook.runtime_config?.gpu_enabled && (
                                <Box component="select"
                                    value={notebook.runtime_config.gpu_type || 'T4'}
                                    onChange={(e) => setNotebook({ ...notebook, runtime_config: { ...notebook.runtime_config, gpu_enabled: true, gpu_type: e.target.value } })}
                                    style={{ background: 'transparent', color: '#10B981', border: 'none', outline: 'none', fontSize: 11, fontWeight: 'bold' }}
                                >
                                    <option value="T4">T4</option>
                                    <option value="A100">A100</option>
                                </Box>
                            )}
                        </Box>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={exportToIpynb}>
                            Export
                        </Button>
                        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveNotebook} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                </Box>

                {/* Status messages */}
                {exportError && (
                    <Alert severity="error" onClose={() => setExportError(null)} sx={{ mx: 2, mt: 1 }}>
                        {exportError}
                    </Alert>
                )}
                {ipynbResult && (
                    <Alert severity={ipynbResult.startsWith('✅') ? 'success' : 'error'}
                        onClose={() => setIpynbResult(null)} sx={{ mx: 2, mt: 1 }}>
                        {ipynbResult}
                    </Alert>
                )}

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
                                <Card
                                    key={i}
                                    data-cell-index={i}
                                    onClick={() => setFocusedCell(i)}
                                    sx={{
                                        mb: 2,
                                        border: running === i
                                            ? '1px solid #6366F1'
                                            : focusedCell === i
                                                ? '1px solid #6366F180'
                                                : '1px solid #222',
                                        transition: 'border-color 0.2s',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Cell toolbar */}
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: 2, py: 0.5,
                                        borderBottom: '1px solid #1a1a1a',
                                        background: '#0D0D0D'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip size="small" label={cell.type === 'code' ? 'Python' : 'Markdown'} sx={{ fontSize: 10 }} />
                                            {cell.type === 'code' && (
                                                <Typography variant="caption" sx={{ color: '#555', fontSize: 10 }}>
                                                    [{i + 1}]
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {cell.type === 'code' && (
                                                <>
                                                    <Tooltip title="AI Assist (Ctrl+I)">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); setFocusedCell(i); setAiPanelOpen(true) }}
                                                            sx={{ color: '#818CF8' }}
                                                        >
                                                            <AIIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Run Cell (Ctrl+Enter)">
                                                        <IconButton size="small" onClick={() => runCell(i)} disabled={running !== null} sx={{ color: '#10B981' }}>
                                                            <RunIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                            <IconButton size="small" onClick={() => deleteCell(i)} sx={{ color: 'text.secondary' }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    {/* Cell editor */}
                                    {cell.type === 'code' ? (
                                        <CodeMirrorCell
                                            value={cell.source}
                                            onChange={(val) => updateCell(i, val)}
                                            onRun={() => runCell(i)}
                                            onRunAndAdvance={() => runAndAdvance(i)}
                                            readOnly={running === i}
                                        />
                                    ) : (
                                        <TextField
                                            fullWidth multiline minRows={2} maxRows={20}
                                            value={cell.source}
                                            onChange={e => updateCell(i, e.target.value)}
                                            placeholder="## Write markdown here..."
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 0,
                                                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                                    fontSize: 13,
                                                    background: '#050505'
                                                },
                                                '& fieldset': { border: 'none' },
                                            }}
                                        />
                                    )}

                                    {/* Cell outputs */}
                                    {cell.outputs.length > 0 && (
                                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #1a1a1a', background: '#080808', fontFamily: 'monospace', fontSize: 12 }}>
                                            {cell.outputs.map((out: any, j: number) => (
                                                <Box key={j} sx={{ color: out.type === 'error' ? '#EF4444' : out.type === 'stderr' ? '#F59E0B' : '#FAFAFA', whiteSpace: 'pre-wrap', mb: 0.5 }}>
                                                    {out.content}
                                                </Box>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Running indicator */}
                                    {running === i && (
                                        <Box sx={{ px: 2, py: 1, borderTop: '1px solid #1a1a1a', background: '#080808', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={14} sx={{ color: '#6366F1' }} />
                                            <Typography variant="caption" color="text.secondary">Executing...</Typography>
                                        </Box>
                                    )}
                                </Card>
                            ))}

                            {/* Add cell buttons */}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                                <Button size="small" variant="outlined" onClick={() => addCell('code')}>+ Code Cell</Button>
                                <Button size="small" variant="outlined" onClick={() => addCell('markdown')}>+ Markdown Cell</Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            {/* AI Assistant Panel */}
            {aiPanelOpen && (
                <Box sx={{ width: 400, flexShrink: 0, borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0a0a0a' }}>
                    <NotebookAIPanel
                        open={aiPanelOpen}
                        onClose={() => setAiPanelOpen(false)}
                        currentCellSource={notebook.cells[focusedCell]?.source || ''}
                        allCells={notebook.cells}
                        currentCellIndex={focusedCell}
                        onInsertCode={handleInsertCode}
                    />
                </Box>
            )}

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

            {/* Resource Import Dialog */}
            <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Import Data or Models</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        {['My Datasets', 'Public Datasets', 'Public Models'].map((tab, idx) => (
                            <Button
                                key={tab}
                                size="small"
                                variant={importTab === idx ? "contained" : "text"}
                                onClick={() => setImportTab(idx)}
                                sx={{ borderRadius: 8, fontSize: 12, textTransform: 'none' }}
                            >
                                {tab}
                            </Button>
                        ))}
                    </Box>

                    {importTab === 0 && (
                        <>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Select a dataset to copy into this notebook's workspace.
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
                        </>
                    )}

                    {importTab === 1 && (
                        <>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Select a public dataset from the community hub.
                            </Typography>
                            <List dense>
                                {publicDatasets.map(ds => (
                                    <ListItem key={ds.id} sx={{ border: '1px solid #222', borderRadius: 1, mb: 1 }}
                                        secondaryAction={
                                            <Button size="small" variant="outlined" onClick={() => importDataset(ds.id)}
                                                disabled={importing === ds.id} startIcon={importing === ds.id ? <CircularProgress size={14} /> : <DownloadIcon />}>
                                                Import
                                            </Button>
                                        }>
                                        <ListItemIcon><DataIcon sx={{ color: '#10B981' }} /></ListItemIcon>
                                        <ListItemText primary={ds.name} secondary={`${ds.dataset_type} • Community Dataset`} />
                                    </ListItem>
                                ))}
                                {publicDatasets.length === 0 && <Typography color="text.secondary">No datasets found.</Typography>}
                            </List>
                        </>
                    )}

                    {importTab === 2 && (
                        <>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Select a pre-trained model artifact to use in this notebook.
                            </Typography>
                            <List dense>
                                {publicModels.map(model => (
                                    <ListItem key={model.id} sx={{ border: '1px solid #222', borderRadius: 1, mb: 1 }}
                                        secondaryAction={
                                            <Button size="small" variant="outlined" onClick={() => importModel(model.id)}
                                                disabled={importing === model.id} startIcon={importing === model.id ? <CircularProgress size={14} /> : <DownloadIcon />}>
                                                Import
                                            </Button>
                                        }>
                                        <ListItemIcon><ImportIcon sx={{ color: '#8B5CF6' }} /></ListItemIcon>
                                        <ListItemText primary={model.name} secondary={`${model.task_type} • ${model.framework}`} />
                                    </ListItem>
                                ))}
                                {publicModels.length === 0 && <Typography color="text.secondary">No public models found.</Typography>}
                            </List>
                        </>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setImportDialog(false)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    )
}
