import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Card, Grid, Chip, TextField, Tabs, Tab, Avatar, InputAdornment, IconButton, Tooltip, Snackbar } from '@mui/material'
import { Search as SearchIcon, Star as StarIcon, TrendingUp as TrendingIcon, Storage as DataIcon, Hub as ModelIcon, Code as CodeIcon, Person as PersonIcon, ContentCopy as ForkIcon } from '@mui/icons-material'
import { api } from '../api/client'

export default function ExplorePage() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [tab, setTab] = useState(0)
    const [sort, setSort] = useState('recent')
    const [results, setResults] = useState<any>({ datasets: [], models: [], notebooks: [], users: [] })
    const [trending, setTrending] = useState<any>(null)
    const [tags, setTags] = useState<any[]>([])
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [snackMsg, setSnackMsg] = useState<string | null>(null)

    const typeMap = ['', 'dataset', 'model', 'notebook', 'user']

    const doSearch = async () => {
        setLoading(true)
        const type = typeMap[tab] || undefined
        const params: any = { q: query, sort }
        if (type) params.type = type
        if (selectedTags.length) params.tags = selectedTags.join(',')
        try {
            const res = await api.get('/community/search', { params })
            setResults(res.data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    useEffect(() => {
        doSearch()
        api.get('/community/trending').then(r => setTrending(r.data)).catch(() => {})
        api.get('/community/tags').then(r => setTags(r.data)).catch(() => {})
    }, [])

    useEffect(() => { doSearch() }, [tab, sort, query, selectedTags])

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }

    const handleFork = async (type: string, id: string, e: any) => {
        e.stopPropagation()
        try {
            await api.post(`/social/fork/${type}/${id}`)
            setSnackMsg(`${type.charAt(0).toUpperCase() + type.slice(1)} cloned to your workspace!`)
        } catch (err: any) {
            setSnackMsg(err.response?.data?.detail || `Failed to clone ${type}`)
        }
    }

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800} mb={1}>Explore</Typography>
                <Typography color="text.secondary" mb={3}>Discover datasets, models, notebooks, and people</Typography>

                <TextField fullWidth placeholder="Search datasets, models, notebooks, users..."
                    value={query} onChange={e => setQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                    sx={{ mb: 2 }} />

                {tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {tags.slice(0, 15).map(t => (
                            <Chip key={t.tag} size="small" label={`${t.tag} (${t.count})`}
                                variant={selectedTags.includes(t.tag) ? 'filled' : 'outlined'}
                                onClick={() => toggleTag(t.tag)}
                                sx={{ cursor: 'pointer' }} />
                        ))}
                    </Box>
                )}
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #222' }}>
                <Tab icon={<TrendingIcon />} iconPosition="start" label="All" />
                <Tab icon={<DataIcon />} iconPosition="start" label={`Datasets (${results.datasets.length})`} />
                <Tab icon={<ModelIcon />} iconPosition="start" label={`Models (${results.models.length})`} />
                <Tab icon={<CodeIcon />} iconPosition="start" label={`Notebooks (${results.notebooks.length})`} />
                <Tab icon={<PersonIcon />} iconPosition="start" label={`Users (${results.users.length})`} />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {['recent', 'stars', 'downloads'].map(s => (
                    <Chip key={s} label={s === 'stars' ? 'Most Stars' : s === 'downloads' ? 'Most Downloads' : 'Recent'}
                        variant={sort === s ? 'filled' : 'outlined'} onClick={() => setSort(s)} sx={{ cursor: 'pointer' }} />
                ))}
            </Box>

            {/* Datasets */}
            {(tab === 0 || tab === 1) && results.datasets.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {tab === 0 && <Typography variant="h6" fontWeight={700} mb={2}>Datasets</Typography>}
                    <Grid container spacing={2}>
                        {results.datasets.map((d: any) => (
                            <Grid size={{ xs: 12, md: 6 }} key={d.id}>
                                <Card sx={{ p: 3, '&:hover': { borderColor: '#444' }, transition: 'border-color 0.2s' }}>
                                    <Typography variant="subtitle1" fontWeight={700}>{d.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 36 }}>{d.description || 'No description'}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'primary.light', border: '1px solid #1E40AF', background: '#1E3A8A33', px: 1, borderRadius: 1 }}>
                                            by {d.owner_name || 'Community'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip size="small" icon={<StarIcon />} label={d.star_count} />
                                        <Chip size="small" label={d.dataset_type} variant="outlined" />
                                        {d.tags?.slice(0, 3).map((t: string) => <Chip key={t} size="small" label={t} variant="outlined" />)}
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Tooltip title="Save to My Account">
                                            <IconButton size="small" onClick={(e) => handleFork('dataset', d.id, e)}><ForkIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Models */}
            {(tab === 0 || tab === 2) && results.models.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {tab === 0 && <Typography variant="h6" fontWeight={700} mb={2}>Models</Typography>}
                    <Grid container spacing={2}>
                        {results.models.map((m: any) => (
                            <Grid size={{ xs: 12, md: 6 }} key={m.id}>
                                <Card sx={{ p: 3, '&:hover': { borderColor: '#444' }, transition: 'border-color 0.2s' }}>
                                    <Typography variant="subtitle1" fontWeight={700}>{m.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 36 }}>{m.description || 'No description'}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'primary.light', border: '1px solid #1E40AF', background: '#1E3A8A33', px: 1, borderRadius: 1 }}>
                                            by {m.owner_name || 'Community'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip size="small" icon={<StarIcon />} label={m.star_count} />
                                        <Chip size="small" label={m.task_type} variant="outlined" />
                                        <Chip size="small" label={m.framework} variant="outlined" />
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Tooltip title="Save to My Account">
                                            <IconButton size="small" onClick={(e) => handleFork('model', m.id, e)}><ForkIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Notebooks */}
            {(tab === 0 || tab === 3) && results.notebooks.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {tab === 0 && <Typography variant="h6" fontWeight={700} mb={2}>Notebooks</Typography>}
                    <Grid container spacing={2}>
                        {results.notebooks.map((n: any) => (
                            <Grid size={{ xs: 12, md: 6 }} key={n.id}>
                                <Card sx={{ p: 3, cursor: 'pointer', '&:hover': { borderColor: '#444' } }} onClick={() => navigate(`/notebooks/${n.id}`)}>
                                    <Typography variant="subtitle1" fontWeight={700}>{n.title}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{n.description || 'No description'}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'primary.light', border: '1px solid #1E40AF', background: '#1E3A8A33', px: 1, borderRadius: 1 }}>
                                            by {n.owner_name || 'Community'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Chip size="small" icon={<StarIcon />} label={n.star_count} />
                                        {n.tags?.slice(0, 3).map((t: string) => <Chip key={t} size="small" label={t} variant="outlined" />)}
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Tooltip title="Save to My Account">
                                            <IconButton size="small" onClick={(e) => handleFork('notebook', n.id, e)}><ForkIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Users */}
            {(tab === 0 || tab === 4) && results.users.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {tab === 0 && <Typography variant="h6" fontWeight={700} mb={2}>Users</Typography>}
                    <Grid container spacing={2}>
                        {results.users.map((u: any) => (
                            <Grid size={{ xs: 12, md: 4 }} key={u.id}>
                                <Card sx={{ p: 3, cursor: 'pointer', '&:hover': { borderColor: '#444' } }} onClick={() => u.username && navigate(`/u/${u.username}`)}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Avatar src={u.avatar_url || undefined} sx={{ width: 40, height: 40 }}>{(u.username || 'U')[0].toUpperCase()}</Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700}>{u.full_name || u.username}</Typography>
                                            {u.username && <Typography variant="caption" color="text.secondary">@{u.username}</Typography>}
                                        </Box>
                                    </Box>
                                    {u.bio && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{u.bio}</Typography>}
                                    <Typography variant="caption" color="text.secondary">{u.followers_count} followers</Typography>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {!loading && results.datasets.length + results.models.length + results.notebooks.length + results.users.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">No results found</Typography>
                    <Typography color="text.secondary">Try different keywords or remove tag filters</Typography>
                </Box>
            )}
            
            <Snackbar open={!!snackMsg} autoHideDuration={5000} onClose={() => setSnackMsg(null)} message={snackMsg} />
        </Box>
    )
}
