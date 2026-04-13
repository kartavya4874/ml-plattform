import { useState, useEffect } from 'react'
import {
    Box, Typography, Card, CardContent, Button, TextField, Chip, IconButton,
    CircularProgress, Divider, Collapse, Alert, Avatar
} from '@mui/material'
import {
    ThumbUp as UpvoteIcon, Reply as ReplyIcon, Add as AddIcon,
    Forum as ForumIcon, ExpandMore, ExpandLess, Send as SendIcon
} from '@mui/icons-material'
import { api } from '../api/client'

interface Comment {
    id: string; author_id: string; author_name: string; content: string;
    upvotes: number; created_at: string; parent_id: string | null; replies: Comment[]
}

interface Discussion {
    id: string; author_id: string; title: string; content: string;
    upvotes: number; comment_count: number; created_at: string
}

const CommentThread = ({ comment, depth = 0, discussionId, onRefresh }: {
    comment: Comment; depth?: number; discussionId: string; onRefresh: () => void
}) => {
    const [replying, setReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [collapsed, setCollapsed] = useState(depth > 2)
    const [submitting, setSubmitting] = useState(false)

    const handleReply = async () => {
        if (!replyText.trim()) return
        setSubmitting(true)
        await api.post(`/discussions/${discussionId}/comments`, { content: replyText, parent_id: comment.id })
        setReplyText(''); setReplying(false); setSubmitting(false)
        onRefresh()
    }

    const handleUpvote = async () => {
        await api.post(`/discussions/comments/${comment.id}/upvote`)
        onRefresh()
    }

    return (
        <Box sx={{ ml: depth > 0 ? 3 : 0, borderLeft: depth > 0 ? '2px solid rgba(99,102,241,0.15)' : 'none', pl: depth > 0 ? 2 : 0, mt: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#6366F1' }}>
                    {comment.author_name?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>{comment.author_name || 'User'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {new Date(comment.created_at).toLocaleString()}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                        <IconButton size="small" onClick={handleUpvote} sx={{ color: 'text.secondary' }}>
                            <UpvoteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary">{comment.upvotes}</Typography>
                        <Button size="small" startIcon={<ReplyIcon sx={{ fontSize: 12 }} />} onClick={() => setReplying(!replying)}
                            sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'none' }}>Reply</Button>
                        {comment.replies.length > 0 && (
                            <Button size="small" onClick={() => setCollapsed(!collapsed)}
                                startIcon={collapsed ? <ExpandMore sx={{ fontSize: 12 }} /> : <ExpandLess sx={{ fontSize: 12 }} />}
                                sx={{ fontSize: 11, color: '#6366F1', textTransform: 'none' }}>
                                {collapsed ? `Show ${comment.replies.length} replies` : 'Hide replies'}
                            </Button>
                        )}
                    </Box>
                    <Collapse in={replying}>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <TextField size="small" fullWidth placeholder="Write a reply..."
                                value={replyText} onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                                multiline maxRows={3} sx={{ '& .MuiInputBase-root': { fontSize: 13 } }} />
                            <IconButton onClick={handleReply} disabled={submitting || !replyText.trim()} sx={{ color: '#6366F1' }}>
                                {submitting ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                            </IconButton>
                        </Box>
                    </Collapse>
                </Box>
            </Box>
            <Collapse in={!collapsed}>
                {comment.replies.map(r => (
                    <CommentThread key={r.id} comment={r} depth={depth + 1} discussionId={discussionId} onRefresh={onRefresh} />
                ))}
            </Collapse>
        </Box>
    )
}

export default function DiscussionsPage() {
    const [discussions, setDiscussions] = useState<Discussion[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedDisc, setSelectedDisc] = useState<Discussion | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [creating, setCreating] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newContent, setNewContent] = useState('')
    const [newComment, setNewComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => { loadDiscussions() }, [])

    const loadDiscussions = async () => {
        setLoading(true)
        const { data } = await api.get('/discussions/')
        setDiscussions(data)
        setLoading(false)
    }

    const selectDiscussion = async (id: string) => {
        setSelectedId(id)
        const [disc, cmts] = await Promise.all([
            api.get(`/discussions/${id}`),
            api.get(`/discussions/${id}/comments`),
        ])
        setSelectedDisc(disc.data)
        setComments(cmts.data)
    }

    const refreshComments = async () => {
        if (selectedId) {
            const { data } = await api.get(`/discussions/${selectedId}/comments`)
            setComments(data)
        }
    }

    const handleCreateDiscussion = async () => {
        if (!newTitle.trim() || !newContent.trim()) return
        setSubmitting(true)
        await api.post('/discussions/', { title: newTitle, content: newContent })
        setNewTitle(''); setNewContent(''); setCreating(false); setSubmitting(false)
        loadDiscussions()
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedId) return
        setSubmitting(true)
        await api.post(`/discussions/${selectedId}/comments`, { content: newComment })
        setNewComment(''); setSubmitting(false)
        refreshComments()
    }

    const handleUpvote = async (id: string) => {
        await api.post(`/discussions/${id}/upvote`)
        loadDiscussions()
        if (selectedId === id && selectedDisc) {
            setSelectedDisc({ ...selectedDisc, upvotes: selectedDisc.upvotes + 1 })
        }
    }

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Discussions</Typography>
                    <Typography variant="body2" color="text.secondary">Ask questions, share knowledge, and collaborate</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>New Discussion</Button>
            </Box>

            {/* Create Discussion */}
            <Collapse in={creating}>
                <Card sx={{ mb: 3, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6" fontWeight={700}>Start a Discussion</Typography>
                        <TextField placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} fullWidth size="small" />
                        <TextField placeholder="What's on your mind?" value={newContent} onChange={e => setNewContent(e.target.value)}
                            fullWidth multiline rows={3} size="small" />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button onClick={() => setCreating(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleCreateDiscussion} disabled={submitting}>
                                {submitting ? 'Posting...' : 'Post'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Collapse>

            {loading ? <CircularProgress /> : (
                <Box sx={{ display: 'flex', gap: 3 }}>
                    {/* Discussion List */}
                    <Box sx={{ width: selectedId ? '35%' : '100%', display: 'flex', flexDirection: 'column', gap: 1.5, transition: 'width 0.3s' }}>
                        {discussions.length === 0 ? (
                            <Card>
                                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                                    <ForumIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" fontWeight={700}>No discussions yet</Typography>
                                    <Typography variant="body2" color="text.secondary">Be the first to start a conversation!</Typography>
                                </CardContent>
                            </Card>
                        ) : discussions.map(d => (
                            <Card key={d.id} sx={{
                                cursor: 'pointer',
                                border: selectedId === d.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                                transition: 'all 0.2s',
                            }} onClick={() => selectDiscussion(d.id)}>
                                <CardContent sx={{ p: 2 }}>
                                    <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>{d.title}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {d.content}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Chip label={`👍 ${d.upvotes}`} size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleUpvote(d.id) }} sx={{ cursor: 'pointer' }} />
                                        <Chip label={`💬 ${d.comment_count}`} size="small" variant="outlined" />
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                            {new Date(d.created_at).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    {/* Discussion Detail + Comments */}
                    {selectedId && selectedDisc && (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Card sx={{ mb: 2 }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h5" fontWeight={800} mb={1}>{selectedDisc.title}</Typography>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{selectedDisc.content}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Chip label={`👍 ${selectedDisc.upvotes}`} onClick={() => handleUpvote(selectedDisc.id)} sx={{ cursor: 'pointer' }} size="small" />
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(selectedDisc.created_at).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Add Comment */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                                <TextField size="small" fullWidth placeholder="Add a comment..."
                                    value={newComment} onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                                    multiline maxRows={3} />
                                <IconButton onClick={handleAddComment} disabled={submitting || !newComment.trim()} sx={{ color: '#6366F1' }}>
                                    {submitting ? <CircularProgress size={16} /> : <SendIcon />}
                                </IconButton>
                            </Box>

                            {/* Threaded Comments */}
                            <Typography variant="subtitle2" fontWeight={700} mb={1}>
                                {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                            </Typography>
                            {comments.map(c => (
                                <CommentThread key={c.id} comment={c} discussionId={selectedId} onRefresh={refreshComments} />
                            ))}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}
