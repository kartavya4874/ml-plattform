/**
 * NotebookAIPanel — Slide-out AI assistant for notebook code help.
 * Uses Gemini to explain, fix, generate, and optimize code.
 */
import { useState, useRef, useEffect } from 'react'
import {
    Box, Typography, TextField, IconButton, Button, Chip,
    CircularProgress, Avatar, Drawer, Tooltip
} from '@mui/material'
import {
    AutoAwesome as SparklesIcon,
    Close as CloseIcon,
    Send as SendIcon,
    Code as CodeIcon,
    BugReport as BugIcon,
    Lightbulb as IdeaIcon,
    Speed as OptimizeIcon,
    ContentCopy as CopyIcon,
    DeleteOutline as ClearIcon,
    SmartToy as BotIcon,
} from '@mui/icons-material'
import { api } from '../api/client'
import ReactMarkdown from 'react-markdown'

interface NotebookAIPanelProps {
    open: boolean
    onClose: () => void
    currentCellSource: string
    allCells: { type: string; source: string }[]
    currentCellIndex: number
    onInsertCode?: (code: string) => void
}

interface AIMessage {
    role: 'user' | 'assistant'
    content: string
    type?: string
}

const QUICK_ACTIONS = [
    { label: 'Explain', icon: <IdeaIcon sx={{ fontSize: 14 }} />, type: 'explain', color: '#6366F1' },
    { label: 'Fix Errors', icon: <BugIcon sx={{ fontSize: 14 }} />, type: 'fix', color: '#EF4444' },
    { label: 'Generate', icon: <CodeIcon sx={{ fontSize: 14 }} />, type: 'generate', color: '#10B981' },
    { label: 'Optimize', icon: <OptimizeIcon sx={{ fontSize: 14 }} />, type: 'optimize', color: '#F59E0B' },
]

export default function NotebookAIPanel({
    open,
    onClose,
    currentCellSource,
    allCells,
    currentCellIndex,
    onInsertCode,
}: NotebookAIPanelProps) {
    const [messages, setMessages] = useState<AIMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendRequest = async (requestType: string, customMessage?: string) => {
        const userMessage = customMessage || `${requestType} the current code`
        const userMsg: AIMessage = { role: 'user', content: userMessage, type: requestType }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            // Build context from surrounding cells
            const contextCells = allCells
                .slice(Math.max(0, currentCellIndex - 2), currentCellIndex + 3)
                .map((c, i) => `# Cell ${i + 1} (${c.type}):\n${c.source}`)
                .join('\n\n')

            const { data } = await api.post('/chat/notebook-assist', {
                cell_source: currentCellSource,
                notebook_context: contextCells,
                request_type: requestType,
                user_message: customMessage || '',
            })

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                type: requestType,
            }])
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: err.response?.data?.detail || 'AI assistant is temporarily unavailable. Please try again.',
            }])
        }
        setLoading(false)
    }

    const handleSend = () => {
        if (!input.trim()) return
        sendRequest('general', input.trim())
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const extractCodeBlocks = (text: string): string[] => {
        const regex = /```(?:python)?\n([\s\S]*?)```/g
        const blocks: string[] = []
        let match
        while ((match = regex.exec(text)) !== null) {
            blocks.push(match[1].trim())
        }
        return blocks
    }

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            variant="persistent"
            sx={{
                '& .MuiDrawer-paper': {
                    width: { xs: '100%', sm: 400 },
                    background: '#0a0a0a',
                    borderLeft: '1px solid #1a1a1a',
                    position: 'relative',
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #1a1a1a',
                    background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#6366F120', width: 32, height: 32, border: '1px solid #6366F140' }}>
                            <SparklesIcon sx={{ fontSize: 16, color: '#818CF8' }} />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, color: '#F9FAFB' }}>
                                AI Code Assistant
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 10 }}>
                                Powered by Gemini
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Clear conversation">
                            <IconButton size="small" onClick={() => setMessages([])} sx={{ color: '#6B7280' }}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Quick Actions */}
                <Box sx={{ p: 1.5, display: 'flex', gap: 0.8, flexWrap: 'wrap', borderBottom: '1px solid #1a1a1a' }}>
                    {QUICK_ACTIONS.map(action => (
                        <Chip
                            key={action.type}
                            label={action.label}
                            icon={action.icon}
                            size="small"
                            onClick={() => sendRequest(action.type)}
                            disabled={loading || !currentCellSource.trim()}
                            sx={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: `${action.color}15`,
                                color: action.color,
                                border: `1px solid ${action.color}30`,
                                '&:hover': { background: `${action.color}25` },
                                '& .MuiChip-icon': { color: action.color },
                            }}
                        />
                    ))}
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {messages.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                            <SparklesIcon sx={{ fontSize: 40, color: '#6366F140', mb: 2 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Ask me anything about your code
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Select a cell and use quick actions or type a question
                            </Typography>
                        </Box>
                    )}
                    {messages.map((msg, idx) => (
                        <Box key={idx} sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}>
                            <Box sx={{
                                maxWidth: '90%',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: msg.role === 'user' ? '#6366F120' : '#111',
                                border: `1px solid ${msg.role === 'user' ? '#6366F130' : '#222'}`,
                            }}>
                                <Box sx={{
                                    fontSize: '0.8rem',
                                    lineHeight: 1.6,
                                    color: '#D1D5DB',
                                    '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                                    '& pre': {
                                        background: '#050505',
                                        border: '1px solid #222',
                                        borderRadius: '6px',
                                        p: 1.5,
                                        overflow: 'auto',
                                        position: 'relative',
                                        fontSize: '0.75rem',
                                    },
                                    '& code': {
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: '0.75rem',
                                    },
                                    '& ul, & ol': { m: 0, pl: 2, mb: 1 },
                                }}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </Box>
                                {/* Insert code buttons for assistant messages */}
                                {msg.role === 'assistant' && extractCodeBlocks(msg.content).length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                                        {extractCodeBlocks(msg.content).map((code, i) => (
                                            <Box key={i} sx={{ display: 'flex', gap: 0.5 }}>
                                                <Chip
                                                    label="Copy"
                                                    icon={<CopyIcon sx={{ fontSize: 12 }} />}
                                                    size="small"
                                                    onClick={() => handleCopy(code)}
                                                    sx={{ fontSize: 10, height: 22, bgcolor: '#111', border: '1px solid #333' }}
                                                />
                                                {onInsertCode && (
                                                    <Chip
                                                        label="Insert in Cell"
                                                        icon={<CodeIcon sx={{ fontSize: 12 }} />}
                                                        size="small"
                                                        onClick={() => onInsertCode(code)}
                                                        sx={{ fontSize: 10, height: 22, bgcolor: '#6366F115', color: '#818CF8', border: '1px solid #6366F130' }}
                                                    />
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ))}
                    {loading && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: '#6366F120' }}>
                                <BotIcon sx={{ fontSize: 14, color: '#818CF8' }} />
                            </Avatar>
                            <CircularProgress size={16} sx={{ color: '#6366F1' }} />
                            <Typography variant="caption" color="text.secondary">Thinking...</Typography>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Input */}
                <Box sx={{ p: 1.5, borderTop: '1px solid #1a1a1a' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Ask about your code..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        disabled={loading}
                        multiline
                        maxRows={3}
                        InputProps={{
                            endAdornment: (
                                <IconButton
                                    size="small"
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    sx={{ color: '#6366F1' }}
                                >
                                    <SendIcon fontSize="small" />
                                </IconButton>
                            ),
                            sx: {
                                borderRadius: 2,
                                fontSize: '0.8rem',
                                background: '#111',
                            },
                        }}
                    />
                </Box>
            </Box>
        </Drawer>
    )
}
