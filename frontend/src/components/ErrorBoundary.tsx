import React, { Component, type ErrorInfo } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material'

interface Props {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        textAlign: 'center',
                        p: 4,
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                        }}
                    >
                        <ErrorIcon sx={{ fontSize: 36, color: '#EF4444' }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700} mb={1}>
                        Something went wrong
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 420 }}>
                        An unexpected error occurred. This has been logged and we'll look into it. 
                        You can try refreshing this section.
                    </Typography>
                    {import.meta.env.DEV && this.state.error && (
                        <Box
                            sx={{
                                mb: 3,
                                p: 2,
                                borderRadius: 2,
                                background: 'rgba(239, 68, 68, 0.06)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                maxWidth: 600,
                                width: '100%',
                                textAlign: 'left',
                            }}
                        >
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#EF4444', wordBreak: 'break-all' }}>
                                {this.state.error.message}
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={this.handleRetry}
                            sx={{ borderRadius: 2 }}
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => window.location.href = '/dashboard'}
                            sx={{ borderRadius: 2 }}
                        >
                            Go to Dashboard
                        </Button>
                    </Box>
                </Box>
            )
        }

        return this.props.children
    }
}
