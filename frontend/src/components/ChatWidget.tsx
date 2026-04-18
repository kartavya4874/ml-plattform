import { useState, useEffect, useRef } from 'react'
import {
    Box, Paper, Typography, TextField, IconButton,
    Avatar, CircularProgress, Fab, Zoom, Tooltip, Fade
} from '@mui/material'
import {
    SmartToy as BotIcon,
    Close as CloseIcon,
    Send as SendIcon,
    Chat as ChatIcon,
    AutoAwesome as SparklesIcon,
    DeleteOutline as ClearIcon
} from '@mui/icons-material'
import { api } from '../api/client'
import ReactMarkdown from 'react-markdown'
import { Link as RouterLink } from 'react-router-dom'

// Use localStorage to retain chat history
const LOCAL_STORAGE_KEY = 'param_ai_chat_history'

interface ChatMessage {
    role: 'user' | 'model'
    parts: string[]
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [message, setMessage] = useState('')
    const [history, setHistory] = useState<ChatMessage[]>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
        return [{ role: 'model', parts: ['Hi there! I am the Parametrix AI Assistant. How can I help you explore data, train models, or deploy APIs today?'] }]
    })
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Save history to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history))
        scrollToBottom()
    }, [history])

    // Wait until transition completes to scroll
    useEffect(() => {
        if (isOpen) {
            setTimeout(scrollToBottom, 150)
        }
    }, [isOpen])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const clearChat = () => {
        setHistory([{ role: 'model', parts: ['Hi there! I am the Parametrix AI Assistant. How can I help you explore data, train models, or deploy APIs today?'] }])
    }

    const handleSend = async () => {
        if (!message.trim()) return

        const userMsg: ChatMessage = { role: 'user', parts: [message] }
        // Update optimistic UI immediately
        const snapshotParams = [...history] // freeze current history BEFORE user message
        setHistory(prev => [...prev, userMsg])
        setMessage('')
        setIsLoading(true)

        try {
            const { data } = await api.post('/chat/', {
                history: snapshotParams,
                message: userMsg.parts[0]
            })

            setHistory(prev => [...prev, { role: 'model', parts: [data.reply] }])
        } catch (error: any) {
            setHistory(prev => [...prev, {
                role: 'model',
                parts: [
                                error.response?.data?.detail 
                                || "I am currently experiencing high network traffic. Please try again in a few moments, or reach out to support if the issue persists."
                ]
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            
            {/* Expanded Chat Window */}
            <Fade in={isOpen}>
                <Paper
                    elevation={12}
                    sx={{
                        width: { xs: 'calc(100vw - 48px)', sm: 380 },
                        height: 500,
                        maxHeight: 'calc(100vh - 120px)',
                        display: isOpen ? 'flex' : 'none',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 3,
                        mb: 2, // Space between chat window and FAB
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        background: 'linear-gradient(90deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%)'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                <SparklesIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>Parametrix Guide</Typography>
                                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                                    Online
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Clear chat history">
                                <IconButton size="small" onClick={clearChat} sx={{ color: 'text.secondary' }}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'text.secondary' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Chat Messages Area */}
                    <Box sx={{
                        flex: 1,
                        p: 2,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        bgcolor: 'background.default'
                    }}>
                        {history.map((msg, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    gap: 1
                                }}
                            >
                                {msg.role === 'model' && (
                                    <Avatar sx={{ width: 28, height: 28, mt: 0.5, bgcolor: 'primary.dark', color: 'primary.contrastText' }}>
                                        <BotIcon sx={{ fontSize: 16 }} />
                                    </Avatar>
                                )}
                                
                                <Box
                                    sx={{
                                        maxWidth: '75%',
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                        color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                        border: msg.role === 'user' ? 'none' : '1px solid',
                                        borderColor: 'divider',
                                        borderTopRightRadius: msg.role === 'user' ? 4 : 8,
                                        borderTopLeftRadius: msg.role === 'model' ? 4 : 8,
                                        boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99,102,241,0.2)' : 'none'
                                    }}
                                >
                                    {msg.parts.map((p, i) => (
                                        <Box key={i} sx={{ 
                                            wordBreak: 'break-word', 
                                            lineHeight: 1.6,
                                            fontSize: '0.875rem',
                                            '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                                            '& ul, & ol': { m: 0, pl: 2, mb: 1 },
                                            '& li': { mb: 0.5 },
                                            '& a': { color: msg.role === 'user' ? 'inherit' : 'primary.main', textDecoration: 'underline', fontWeight: 500 },
                                            '& strong': { fontWeight: 600 }
                                        }}>
                                            <ReactMarkdown
                                                components={{
                                                    a: ({node, href, children, ...props}: any) => {
                                                        const destination = href || "#"
                                                        if (destination.startsWith('/')) {
                                                            return <RouterLink to={destination} style={{ color: 'inherit' }}>{children}</RouterLink>
                                                        }
                                                        return <a href={destination} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{children}</a>
                                                    }
                                                }}
                                            >
                                                {p}
                                            </ReactMarkdown>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                        
                        {isLoading && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                                <Avatar sx={{ width: 28, height: 28, mt: 0.5, bgcolor: 'primary.dark' }}>
                                    <BotIcon sx={{ fontSize: 16 }} />
                                </Avatar>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                                    <CircularProgress size={16} />
                                </Box>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Ask about Parametrix AI..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={isLoading}
                            multiline
                            maxRows={3}
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        onClick={handleSend}
                                        disabled={!message.trim() || isLoading}
                                        sx={{ mr: -0.5 }}
                                    >
                                        <SendIcon fontSize="small" />
                                    </IconButton>
                                ),
                                sx: { borderRadius: 2, py: 1, px: 1.5, fontSize: '0.875rem' }
                            }}
                        />
                    </Box>
                </Paper>
            </Fade>

            {/* Launch Button (ALWAYS RENDERED) */}
            <Zoom in={true}>
                <Fab
                    color="primary"
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    sx={{
                        boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease-in-out',
                        bgcolor: isOpen ? 'error.main' : 'primary.main',
                        '&:hover': {
                            bgcolor: isOpen ? 'error.dark' : 'primary.dark',
                        }
                    }}
                >
                    {isOpen ? <CloseIcon /> : <ChatIcon />}
                </Fab>
            </Zoom>
        </Box>
    )
}
