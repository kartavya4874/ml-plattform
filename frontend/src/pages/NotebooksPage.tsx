import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Card, Button, TextField, Tabs, Tab, Chip, IconButton, Divider } from '@mui/material'
import { Add as AddIcon, PlayArrow as RunIcon, Delete as DeleteIcon, Code as CodeIcon, Description as MarkdownIcon } from '@mui/icons-material'
import { api } from '../api/client'

interface NotebookItem { id: string; title: string; description: string | null; is_public: boolean; star_count: number; fork_count: number; created_at: string }

export default function NotebooksPage() {
    const navigate = useNavigate()
    const [notebooks, setNotebooks] = useState<NotebookItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/notebooks').then(r => setNotebooks(r.data)).catch(console.error).finally(() => setLoading(false))
    }, [])

    const createNotebook = async () => {
        try {
            const res = await api.post('/notebooks', { title: 'Untitled Notebook' })
            navigate(`/notebooks/${res.data.id}`)
        } catch (e) { console.error(e) }
    }

    if (loading) return <Typography>Loading notebooks...</Typography>

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Notebooks</Typography>
                    <Typography color="text.secondary">Write, run, and share Python notebooks</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={createNotebook}>New Notebook</Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {notebooks.length === 0 ? (
                    <Card sx={{ p: 6, textAlign: 'center' }}>
                        <CodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" mb={1}>No notebooks yet</Typography>
                        <Typography color="text.secondary" mb={3}>Create your first notebook to start coding</Typography>
                        <Button variant="contained" onClick={createNotebook}>Create Notebook</Button>
                    </Card>
                ) : notebooks.map(nb => (
                    <Card key={nb.id} sx={{ p: 3, cursor: 'pointer', '&:hover': { borderColor: '#444' } }} onClick={() => navigate(`/notebooks/${nb.id}`)}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700}>{nb.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{nb.description || 'No description'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip size="small" label={nb.is_public ? 'Public' : 'Private'} variant="outlined" />
                                <Chip size="small" label={`★ ${nb.star_count}`} />
                            </Box>
                        </Box>
                    </Card>
                ))}
            </Box>
        </Box>
    )
}
