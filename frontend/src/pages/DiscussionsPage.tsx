import { useState, useEffect } from 'react'
import { Box, Typography, Card, Button, TextField, Divider, Avatar } from '@mui/material'
import { api } from '../api/client'
import { Forum as ForumIcon } from '@mui/icons-material'

interface Discussion {
    id: string
    title: string
    content: string
    author_id: string
    upvotes: number
    created_at: string
}

export default function DiscussionsPage() {
    const [discussions, setDiscussions] = useState<Discussion[]>([])
    const [loading, setLoading] = useState(true)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    const fetchDiscussions = async () => {
        try {
            const res = await api.get('/discussions')
            setDiscussions(res.data)
        } catch (err) {
            console.error("Failed to fetch discussions", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDiscussions()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post('/discussions', { title, content })
            setTitle('')
            setContent('')
            fetchDiscussions()
        } catch (err) {
            console.error("Failed to create discussion", err)
        }
    }

    const handleUpvote = async (id: string) => {
        try {
            await api.post(`/discussions/${id}/upvote`)
            fetchDiscussions()
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) return <Typography>Loading discussions...</Typography>

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: 'text.primary' }}>
                    Community Discussions
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Ask questions, share workflows, and collaborate with data scientists globally.
                </Typography>
            </Box>

            <Card sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Start a Discussion</Typography>
                <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField 
                        label="Title" 
                        value={title} onChange={(e) => setTitle(e.target.value)} required 
                    />
                    <TextField 
                        label="What's on your mind?" 
                        multiline rows={4} 
                        value={content} onChange={(e) => setContent(e.target.value)} required 
                    />
                    <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>Post</Button>
                </Box>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {discussions.length === 0 ? (
                    <Typography color="text.secondary">No discussions yet. Be the first!</Typography>
                ) : discussions.map(d => (
                    <Card key={d.id} sx={{ p: 3, display: 'flex', gap: 3 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Button 
                                size="small" variant="outlined" 
                                onClick={() => handleUpvote(d.id)}
                                sx={{ minWidth: 40, p: 0.5 }}
                            >
                                ▲
                            </Button>
                            <Typography fontWeight={700}>{d.upvotes}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700} mb={1}>{d.title}</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                {d.content}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>U</Avatar>
                                <Typography variant="caption" color="text.secondary">
                                    Posted on {new Date(d.created_at).toLocaleDateString()}
                                </Typography>
                            </Box>
                        </Box>
                    </Card>
                ))}
            </Box>
        </Box>
    )
}
