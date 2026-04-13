import { useState } from 'react'
import { Box, Button, Divider, Link, TextField, Typography, Alert } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setErrorMsg('')
        try {
            await api.post('/auth/forgot-password', { email })
            setStatus('success')
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || 'An error occurred. Please try again.')
            setStatus('error')
        }
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
        }}>
            <Box sx={{
                width: '100%', maxWidth: 420, mx: 2,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 4,
                position: 'relative',
                boxShadow: 'none',
                className: 'fade-in'
            }}>
                <Box textAlign="center" mb={4}>
                    <Typography variant="h4" fontWeight="800" sx={{ mb: 1, background: 'linear-gradient(90deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Reset Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enter your email to receive recovery instructions.
                    </Typography>
                </Box>

                {status === 'success' ? (
                    <Box textAlign="center">
                        <Alert severity="success" sx={{ mb: 3 }}>
                            If an account exists with this email, we've sent instructions to reset your password.
                        </Alert>
                        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
                            Return to Login
                        </Button>
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {status === 'error' && (
                            <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>
                        )}
                        
                        <TextField
                            label="Email Address"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            type="email"
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            sx={{ mt: 2, mb: 3 }}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                        </Button>

                        <Divider sx={{ mb: 3 }}>or</Divider>

                        <Typography textAlign="center" variant="body2">
                            Remember your password?{' '}
                            <Link component={RouterLink} to="/login" underline="hover">
                                Sign In
                            </Link>
                        </Typography>
                    </form>
                )}
            </Box>
        </Box>
    )
}
